/**
 * GrabFeedbackSystem: Manages hands-first grabbing lifecycle, magnetic slot/grid snapping,
 * seated reachability clamping, out-of-reach recovery, and workflowStore position persistence.
 */

import {
  createSystem,
  DistanceGrabbable,
  Grabbed,
  OneHandGrabbable,
  PokeInteractable,
  RayInteractable,
} from '@iwsdk/core';
import {
  AgentNodeComponent,
  CompanionDroneComponent,
} from '../agents/agent-component.js';
import { logger } from '../core/logger.js';
import { workflowStore } from '../workflows/workflow-store.js';
import {
  computeRecoveryPosition,
  interactionState,
  isDragGesture,
  isOutsideEasyReach,
  snapToWorkspaceSlot,
} from './interaction-state.js';
import { selectAgentNode } from './selection-system.js';
import { resolveWorkflowNodeId } from './spatial-input-adapter.js';

export class GrabFeedbackSystem extends createSystem({
  agents: { required: [AgentNodeComponent] },
  companions: { required: [CompanionDroneComponent] },
}) {
  private wasGrabbed = new Map<number, boolean>();
  private grabStartPositions = new Map<number, [number, number, number]>();

  init(): void {
    this.wasGrabbed.clear();
    this.grabStartPositions.clear();
  }

  update(): void {
    // 1. Process Agent Node grabs, releases, snapping, and reachability recovery
    this.queries.agents.entities.forEach((entity) => {
      const obj = entity.object3D;
      if (!obj) return;

      // Allow simultaneous OneHandGrabbable (near-hand pinch) AND RayInteractable/PokeInteractable
      if (
        entity.hasComponent(OneHandGrabbable) &&
        (entity.hasComponent(RayInteractable) || entity.hasComponent(PokeInteractable))
      ) {
        const objWithPointerType = obj as unknown as { pointerEventsType?: unknown };
        if (objWithPointerType.pointerEventsType !== 'all') {
          objWithPointerType.pointerEventsType = 'all';
        }
      }

      const agentId = entity.getValue(AgentNodeComponent, 'agentId') ?? 'agent-planner';
      const isGrabbed = entity.hasComponent(Grabbed);
      const prevGrabbed = this.wasGrabbed.get(entity.index) ?? false;

      if (isGrabbed && !prevGrabbed) {
        // Grab started
        const startPos: [number, number, number] = [
          obj.position.x,
          obj.position.y,
          obj.position.z,
        ];
        this.grabStartPositions.set(entity.index, startPos);
        interactionState.setState({
          activeGrabEntityId: agentId,
          grabStartPosition: startPos,
          grabCurrentPosition: startPos,
          lastActionType: 'grab_start',
          lastActionSummary: `Grabbed ${agentId}`,
        });
        logger.info('GrabFeedbackSystem', `Grab started on ${agentId}`, {
          startPos,
        });
      } else if (isGrabbed && prevGrabbed) {
        // Actively held: keep baseY synchronized with live hand Y so release is seamless
        entity.setValue(AgentNodeComponent, 'baseY', obj.position.y);
        interactionState.setState({
          grabCurrentPosition: [obj.position.x, obj.position.y, obj.position.z],
        });
      } else if (!isGrabbed && prevGrabbed) {
        // Grab released
        const startPos = this.grabStartPositions.get(entity.index) ?? [
          obj.position.x,
          obj.position.y,
          obj.position.z,
        ];
        const rawEndPos: [number, number, number] = [
          obj.position.x,
          obj.position.y,
          obj.position.z,
        ];

        if (isDragGesture(startPos, rawEndPos)) {
          // Real spatial move: recover if out of reach, then snap to slot or grid
          const safePos = isOutsideEasyReach(rawEndPos)
            ? computeRecoveryPosition(agentId, rawEndPos)
            : rawEndPos;
          const snapped = snapToWorkspaceSlot(safePos);
          const [fx, fy, fz] = snapped.position;

          obj.position.set(fx, fy, fz);
          entity.setValue(AgentNodeComponent, 'baseY', fy);

          const wfNodeId = resolveWorkflowNodeId(agentId);
          workflowStore.moveNode(wfNodeId, [fx, fy, fz]);

          interactionState.setState({
            activeGrabEntityId: null,
            grabStartPosition: null,
            grabCurrentPosition: [fx, fy, fz],
            lastActionTimestampMs: Date.now(),
            lastActionType: 'grab_release_move',
            lastActionSummary: snapped.snappedToSlotId
              ? `Moved ${agentId} and snapped to ${snapped.snappedToSlotId} ([${fx}, ${fy}, ${fz}])`
              : `Moved ${agentId} to [${fx}, ${fy}, ${fz}]`,
          });
          logger.info(
            'GrabFeedbackSystem',
            `Grab released on ${agentId}; preserved position [${fx}, ${fy}, ${fz}]`,
          );
        } else {
          // Micro-pinch (< 3.5cm displacement): restore position and treat as selection
          obj.position.set(startPos[0], startPos[1], startPos[2]);
          entity.setValue(AgentNodeComponent, 'baseY', startPos[1]);
          interactionState.setState({
            activeGrabEntityId: null,
            grabStartPosition: null,
            grabCurrentPosition: null,
          });
          selectAgentNode(agentId);
        }

        this.grabStartPositions.delete(entity.index);
      } else if (!isGrabbed) {
        // Passive safety check: recover if an ungrabbed agent ever drifts outside reachable bounds
        const pos: [number, number, number] = [
          obj.position.x,
          entity.getValue(AgentNodeComponent, 'baseY') ?? obj.position.y,
          obj.position.z,
        ];
        if (isOutsideEasyReach(pos)) {
          const recovered = computeRecoveryPosition(agentId, pos);
          obj.position.set(recovered[0], recovered[1], recovered[2]);
          entity.setValue(AgentNodeComponent, 'baseY', recovered[1]);
          workflowStore.moveNode(resolveWorkflowNodeId(agentId), recovered);
          logger.warn(
            'GrabFeedbackSystem',
            `Recovered out-of-reach agent ${agentId} to [${recovered.join(', ')}]`,
          );
        }
      }

      this.wasGrabbed.set(entity.index, isGrabbed);
    });

    // 2. Process Companion Drone grab/release & reachability recovery
    this.queries.companions.entities.forEach((entity) => {
      const obj = entity.object3D;
      if (!obj) return;

      if (
        (entity.hasComponent(OneHandGrabbable) ||
          entity.hasComponent(DistanceGrabbable)) &&
        (entity.hasComponent(RayInteractable) || entity.hasComponent(PokeInteractable))
      ) {
        const objWithPointerType = obj as unknown as { pointerEventsType?: unknown };
        if (objWithPointerType.pointerEventsType !== 'all') {
          objWithPointerType.pointerEventsType = 'all';
        }
      }

      const isGrabbed = entity.hasComponent(Grabbed);
      const prevGrabbed = this.wasGrabbed.get(entity.index) ?? false;

      if (isGrabbed) {
        entity.setValue(CompanionDroneComponent, 'baseY', obj.position.y);
        entity.setValue(CompanionDroneComponent, 'mood', 'active');
      } else if (!isGrabbed && prevGrabbed) {
        const rawPos: [number, number, number] = [
          obj.position.x,
          obj.position.y,
          obj.position.z,
        ];
        const safePos = isOutsideEasyReach(rawPos)
          ? computeRecoveryPosition('companion-drone', rawPos)
          : rawPos;
        obj.position.set(safePos[0], safePos[1], safePos[2]);
        entity.setValue(CompanionDroneComponent, 'baseY', safePos[1]);
        entity.setValue(CompanionDroneComponent, 'mood', 'ready');
      }

      this.wasGrabbed.set(entity.index, isGrabbed);
    });
  }
}

