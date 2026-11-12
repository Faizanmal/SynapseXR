/**
 * SelectionSystem: Manages hands-first agent selection, 3D workflow edge selection,
 * conflict resolution between dragging and selecting, and real-time 3D connection beam geometry.
 */

import {
  createSystem,
  Hovered,
  Pressed,
  Vector3,
} from '@iwsdk/core';
import {
  AgentNodeComponent,
  WorkflowEdgeComponent,
} from '../agents/agent-component.js';
import { logger } from '../core/logger.js';
import { agentNodeView } from '../workflows/graph-editor/agent-node-view.js';
import { connectionRenderer } from '../workflows/graph-editor/connection-renderer.js';
import { workflowStore } from '../workflows/workflow-store.js';
import {
  canActivateInteraction,
  interactionState,
} from './interaction-state.js';
import { resolveWorkflowNodeId } from './spatial-input-adapter.js';

export function selectAgentNode(
  agentId: string,
  nowMs: number = Date.now(),
): boolean {
  const state = interactionState.getState();
  if (!canActivateInteraction(nowMs, state.lastActionTimestampMs, 200)) {
    return false;
  }

  const nextSelected = state.selectedNodeId === agentId ? null : agentId;
  interactionState.setState({
    selectedNodeId: nextSelected,
    selectedEdgeId: null,
    lastActionTimestampMs: nowMs,
    lastActionType: 'select_agent',
    lastActionSummary: nextSelected
      ? `Selected agent ${nextSelected}`
      : `Deselected agent ${agentId}`,
  });

  logger.info(
    'SelectionSystem',
    nextSelected ? `Selected agent: ${nextSelected}` : `Cleared agent selection`,
  );
  return true;
}

export function selectWorkflowEdge(
  edgeId: string,
  nowMs: number = Date.now(),
): boolean {
  const state = interactionState.getState();
  if (!canActivateInteraction(nowMs, state.lastActionTimestampMs, 200)) {
    return false;
  }

  const nextEdge = state.selectedEdgeId === edgeId ? null : edgeId;
  interactionState.setState({
    selectedEdgeId: nextEdge,
    selectedNodeId: null,
    lastActionTimestampMs: nowMs,
    lastActionType: 'select_edge',
    lastActionSummary: nextEdge
      ? `Selected workflow connection ${nextEdge}`
      : `Deselected workflow connection ${edgeId}`,
  });

  logger.info(
    'SelectionSystem',
    nextEdge
      ? `Selected workflow connection: ${nextEdge}`
      : `Cleared edge selection`,
  );
  return true;
}

export class SelectionSystem extends createSystem({
  agents: { required: [AgentNodeComponent] },
  edges: { required: [WorkflowEdgeComponent] },
}) {
  private elapsedTime = 0;
  private wasEdgePressed = new Map<number, boolean>();
  private agentPositions = new Map<string, Vector3>();

  init(): void {
    this.elapsedTime = 0;
    this.wasEdgePressed.clear();
    this.agentPositions.clear();
  }

  update(delta: number): void {
    this.elapsedTime += delta;
    const state = interactionState.getState();
    const nowMs = Date.now();
    const wf = workflowStore.getWorkflow();

    // 1. Sync AgentNodeComponent selection & ports/badge view and cache world positions
    this.queries.agents.entities.forEach((entity) => {
      const agentId = entity.getValue(AgentNodeComponent, 'agentId') ?? '';
      const role = (entity.getValue(AgentNodeComponent, 'role') ??
        'planner') as 'planner' | 'researcher' | 'executor' | 'reviewer';
      const status = (entity.getValue(AgentNodeComponent, 'status') ??
        'idle') as
        | 'idle'
        | 'ready'
        | 'running'
        | 'waiting_approval'
        | 'completed'
        | 'failed'
        | 'cancelled';

      const wfNodeId = resolveWorkflowNodeId(agentId);
      const isSelected =
        state.selectedNodeId === agentId || state.selectedNodeId === wfNodeId;
      if (entity.getValue(AgentNodeComponent, 'isSelected') !== isSelected) {
        entity.setValue(AgentNodeComponent, 'isSelected', isSelected);
      }

      const obj = entity.object3D;
      if (obj) {
        let cached = this.agentPositions.get(agentId);
        if (!cached) {
          cached = new Vector3();
          this.agentPositions.set(agentId, cached);
        }
        cached.copy(obj.position);
        this.agentPositions.set(wfNodeId, cached);

        const wfNode = wf.nodes.find((n) => n.id === wfNodeId);
        agentNodeView.syncObject3D(obj, {
          nodeId: wfNodeId,
          role,
          label: wfNode?.label ?? agentId,
          status,
          position: [obj.position.x, obj.position.y, obj.position.z],
          isSelected,
          isConnectionSource: state.pendingConnectionSourceId === wfNodeId,
        });
      }
    });

    // 2. Update 3D Workflow Connection Beams via ConnectionRenderer & handle edge selection
    this.queries.edges.entities.forEach((entity) => {
      const edgeObj = entity.object3D;
      if (!edgeObj) return;

      const edgeId =
        entity.getValue(WorkflowEdgeComponent, 'edgeId') ??
        'edge-planner-researcher';
      const sourceNodeId =
        entity.getValue(WorkflowEdgeComponent, 'sourceNodeId') ?? 'node-planner';
      const targetNodeId =
        entity.getValue(WorkflowEdgeComponent, 'targetNodeId') ??
        'node-researcher';
      const sourceAgentId =
        entity.getValue(WorkflowEdgeComponent, 'sourceAgentId') ??
        'agent-planner';
      const targetAgentId =
        entity.getValue(WorkflowEdgeComponent, 'targetAgentId') ??
        'agent-researcher';

      // Verify whether this edge is currently present in workflowStore
      const existsInGraph = wf.edges.some(
        (e) =>
          e.id === edgeId ||
          (e.sourceNodeId === sourceNodeId && e.targetNodeId === targetNodeId),
      );
      edgeObj.visible = existsInGraph;
      if (!existsInGraph) return;

      const isHovered = entity.hasComponent(Hovered);
      const isPressed = entity.hasComponent(Pressed);
      const prevPressed = this.wasEdgePressed.get(entity.index) ?? false;

      if (isHovered && state.hoveredEntityId !== edgeId) {
        interactionState.setState({ hoveredEntityId: edgeId });
      }

      if (isPressed && !prevPressed) {
        selectWorkflowEdge(edgeId, nowMs);
      }
      this.wasEdgePressed.set(entity.index, isPressed);

      const isSelected = interactionState.getState().selectedEdgeId === edgeId;
      if (entity.getValue(WorkflowEdgeComponent, 'isSelected') !== isSelected) {
        entity.setValue(WorkflowEdgeComponent, 'isSelected', isSelected);
      }

      const srcPos =
        this.agentPositions.get(sourceAgentId) ??
        this.agentPositions.get(sourceNodeId);
      const dstPos =
        this.agentPositions.get(targetAgentId) ??
        this.agentPositions.get(targetNodeId);

      if (srcPos && dstPos) {
        const srcNode = wf.nodes.find((n) => n.id === sourceNodeId);
        const isDataTransferActive =
          srcNode?.status === 'running' || srcNode?.status === 'completed';

        connectionRenderer.updateConnectionObject(edgeObj, {
          sourcePosition: srcPos,
          targetPosition: dstPos,
          isSelected,
          isHovered,
          isDataTransferActive,
          time: this.elapsedTime,
          delta,
        });
      }
    });
  }
}
