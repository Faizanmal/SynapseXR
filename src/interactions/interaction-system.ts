/**
 * InteractionSystem: Primary ECS system coordinating hands-first XR interactions:
 * - Agent ray/poke hover highlighting and pinch/tap selection
 * - 3D tactile spatial UI buttons (Start, Cancel, Approve, Reject, Toggle Results, Recenter)
 * - 3D Results & Approval Inspector Panel open/close transitions and status telemetry
 * - Workspace recenter & force-release recovery
 */

import {
  Color,
  createSystem,
  Grabbed,
  GrabSystem,
  Hovered,
  Mesh,
  MeshBasicMaterial,
  Pressed,
} from '@iwsdk/core';
import {
  AgentNodeComponent,
  CompanionDroneComponent,
  ResultsPanelComponent,
  SpatialActionButtonComponent,
} from '../agents/agent-component.js';
import { workflowStore } from '../workflows/workflow-store.js';
import {
  DEFAULT_AGENT_POSITIONS,
  interactionState,
  SpatialActionType,
} from './interaction-state.js';
import { selectAgentNode } from './selection-system.js';
import {
  executeSpatialAction,
  SpatialInputAdapter,
} from './spatial-input-adapter.js';

export class InteractionSystem extends createSystem({
  agents: { required: [AgentNodeComponent] },
  buttons: { required: [SpatialActionButtonComponent] },
  panels: { required: [ResultsPanelComponent] },
  companions: { required: [CompanionDroneComponent] },
}) {
  private inputAdapter!: SpatialInputAdapter;
  private wasAgentPressed = new Map<number, boolean>();
  private agentGrabbedDuringPress = new Map<number, boolean>();
  private wasButtonPressed = new Map<number, boolean>();
  private lastAppliedRecenterCount = 0;
  private scratchColor!: Color;

  init(): void {
    this.wasAgentPressed.clear();
    this.agentGrabbedDuringPress.clear();
    this.wasButtonPressed.clear();
    this.lastAppliedRecenterCount = interactionState.getState().recenterCount;
    this.scratchColor = new Color();

    this.inputAdapter = new SpatialInputAdapter();
    this.inputAdapter.attach(this.world);
    this.cleanupFuncs.push(() => this.inputAdapter.dispose());
  }

  update(delta: number): void {
    const state = interactionState.getState();
    const nowMs = Date.now();

    // 1. Check if workspace recenter was triggered
    if (state.recenterCount !== this.lastAppliedRecenterCount) {
      this.lastAppliedRecenterCount = state.recenterCount;
      this.applyWorkspaceRecenter();
    }

    let currentHoveredId: string | null = null;

    // 2. Process Agent hover & non-drag press selection
    this.queries.agents.entities.forEach((entity) => {
      const agentId = entity.getValue(AgentNodeComponent, 'agentId') ?? 'agent-planner';
      const isHovered = entity.hasComponent(Hovered);
      const isPressed = entity.hasComponent(Pressed);
      const isGrabbed = entity.hasComponent(Grabbed);

      if (entity.getValue(AgentNodeComponent, 'isHovered') !== isHovered) {
        entity.setValue(AgentNodeComponent, 'isHovered', isHovered);
      }
      if (isHovered) {
        currentHoveredId = agentId;
      }

      const prevPressed = this.wasAgentPressed.get(entity.index) ?? false;
      if (isPressed && !prevPressed) {
        this.agentGrabbedDuringPress.set(entity.index, isGrabbed);
      } else if (isPressed && isGrabbed) {
        this.agentGrabbedDuringPress.set(entity.index, true);
      } else if (!isPressed && prevPressed) {
        const wasGrabbed = this.agentGrabbedDuringPress.get(entity.index) ?? false;
        // If clicked via RayInteractable or poked via PokeInteractable without entering Grabbed
        if (!wasGrabbed && !isGrabbed) {
          selectAgentNode(agentId, nowMs);
        }
        this.agentGrabbedDuringPress.delete(entity.index);
      }

      this.wasAgentPressed.set(entity.index, isPressed);
    });

    // 3. Process 3D Tactile Spatial Action Buttons (PokeInteractable + RayInteractable)
    this.queries.buttons.entities.forEach((entity) => {
      const obj = entity.object3D;
      if (!obj) return;

      const action = (entity.getValue(SpatialActionButtonComponent, 'action') ??
        'start_run') as SpatialActionType;
      const baseY = entity.getValue(SpatialActionButtonComponent, 'baseY') ?? 0.93;
      const cooldownMs =
        entity.getValue(SpatialActionButtonComponent, 'cooldownMs') ?? 350;

      const isHovered = entity.hasComponent(Hovered);
      const isPressed = entity.hasComponent(Pressed);
      const prevPressed = this.wasButtonPressed.get(entity.index) ?? false;

      if (isHovered) {
        currentHoveredId = `btn-${action}`;
      }

      // Tactile button depression & hover scale feedback
      const targetY = isPressed ? baseY - 0.009 : isHovered ? baseY + 0.004 : baseY;
      obj.position.y += (targetY - obj.position.y) * Math.min(1, delta * 18);

      const targetScale = isPressed ? 0.94 : isHovered ? 1.08 : 1.0;
      const nextScale =
        obj.scale.x + (targetScale - obj.scale.x) * Math.min(1, delta * 16);
      obj.scale.setScalar(nextScale);

      if (isPressed && !prevPressed) {
        executeSpatialAction(action, nowMs, cooldownMs);
      }

      this.wasButtonPressed.set(entity.index, isPressed);
    });

    // 4. Update hoveredEntityId in interactionState when changed
    if (currentHoveredId !== null && state.hoveredEntityId !== currentHoveredId) {
      interactionState.setState({ hoveredEntityId: currentHoveredId });
    } else if (
      currentHoveredId === null &&
      state.hoveredEntityId !== null &&
      !state.hoveredEntityId.startsWith('edge-')
    ) {
      interactionState.setState({ hoveredEntityId: null });
    }

    // 5. Animate 3D Results & Approval Inspector Panel
    this.queries.panels.entities.forEach((entity) => {
      const obj = entity.object3D;
      if (!obj) return;

      const isOpen = interactionState.getState().inspectorOpen;
      if (entity.getValue(ResultsPanelComponent, 'isOpen') !== isOpen) {
        entity.setValue(ResultsPanelComponent, 'isOpen', isOpen);
      }

      const targetScale = isOpen ? 1.0 : 0.001;
      const nextScale =
        obj.scale.x + (targetScale - obj.scale.x) * Math.min(1, delta * 12);
      obj.scale.setScalar(nextScale);
      obj.visible = nextScale > 0.02;

      // Update status bar color on the 3D inspector panel based on workflow state
      const statusBar = obj.getObjectByName('panel-status-bar') as Mesh | undefined;
      if (statusBar && statusBar.material instanceof MeshBasicMaterial) {
        const wf = workflowStore.getWorkflow();
        const hasWaiting = wf.nodes.some((n) => n.status === 'waiting_approval');
        const hasFailed = wf.nodes.some((n) => n.status === 'failed');
        const hasRunning = wf.nodes.some((n) => n.status === 'running');
        const allCompleted = wf.nodes.every((n) => n.status === 'completed');

        let barHex = 0x00e5ff;
        if (hasFailed) barHex = 0xff1744;
        else if (hasWaiting) barHex = 0xffab00;
        else if (allCompleted) barHex = 0x00e676;
        else if (hasRunning) barHex = 0x00b4d8;

        this.scratchColor.setHex(barHex);
        statusBar.material.color.copy(this.scratchColor);
      }
    });
  }

  private applyWorkspaceRecenter(): void {
    const grabSystem = this.world.getSystem(GrabSystem);

    this.queries.agents.entities.forEach((entity) => {
      if (grabSystem) {
        grabSystem.forceRelease(entity);
      }
      const agentId = entity.getValue(AgentNodeComponent, 'agentId') ?? 'agent-planner';
      const home = DEFAULT_AGENT_POSITIONS[agentId];
      if (home && entity.object3D) {
        entity.object3D.position.set(home[0], home[1], home[2]);
        entity.object3D.rotation.set(0, 0, 0);
        entity.object3D.scale.setScalar(1.0);
        entity.setValue(AgentNodeComponent, 'baseY', home[1]);
        entity.setValue(AgentNodeComponent, 'isSelected', false);
        entity.setValue(AgentNodeComponent, 'isHovered', false);
      }
    });

    this.queries.companions.entities.forEach((entity) => {
      if (grabSystem) {
        grabSystem.forceRelease(entity);
      }
      const home = DEFAULT_AGENT_POSITIONS['companion-drone'];
      if (home && entity.object3D) {
        entity.object3D.position.set(home[0], home[1], home[2]);
        entity.object3D.rotation.set(0, 0, 0);
        entity.setValue(CompanionDroneComponent, 'baseY', home[1]);
        entity.setValue(CompanionDroneComponent, 'mood', 'ready');
      }
    });
  }
}

