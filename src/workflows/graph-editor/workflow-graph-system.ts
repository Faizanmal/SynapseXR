/**
 * WorkflowGraphSystem: Master 3D graph synchronization ECS system.
 *
 * Ensures two-way fidelity between `workflowStore` and the 3D XR scene:
 * - Materializes agent nodes and connection beams when templates load or state restores
 * - Dynamically creates and disposes 3D entities when nodes or edges are added/removed
 * - Synchronizes node 3D positions on undo/redo, auto-layout, and template switching
 */

import {
  createSystem,
  Entity,
  Grabbed,
  OneHandGrabbable,
  PokeInteractable,
  RayInteractable,
} from '@iwsdk/core';
import {
  AgentNodeComponent,
  WorkflowEdgeComponent,
} from '../../agents/agent-component.js';
import { resolveWorkflowNodeId } from '../../interactions/spatial-input-adapter.js';
import {
  createExecutorAgent,
  createPlannerAgent,
  createResearcherAgent,
  createReviewerAgent,
} from '../../scene-assets/agents.scene-asset.js';
import { createWorkflowConnectionBeam } from '../../scene-assets/command-center.scene-asset.js';
import type { AgentRole, Workflow } from '../domain-types.js';
import { workflowStore } from '../workflow-store.js';

const CORE_NODE_TO_AGENT_ID: Readonly<Record<string, string>> = {
  'node-planner': 'agent-planner',
  'node-researcher': 'agent-researcher',
  'node-executor': 'agent-executor',
  'node-reviewer': 'agent-reviewer',
};

function createMeshForRole(role: AgentRole) {
  switch (role) {
    case 'planner':
      return createPlannerAgent();
    case 'researcher':
      return createResearcherAgent();
    case 'executor':
      return createExecutorAgent();
    case 'reviewer':
      return createReviewerAgent();
  }
}

export class WorkflowGraphSystem extends createSystem({
  agents: { required: [AgentNodeComponent] },
  edges: { required: [WorkflowEdgeComponent] },
}) {
  private dynamicNodeEntities = new Map<string, Entity>();
  private dynamicEdgeEntities = new Map<string, Entity>();
  private needsReconcile = true;

  init(): void {
    this.dynamicNodeEntities.clear();
    this.dynamicEdgeEntities.clear();
    this.needsReconcile = true;

    const unsub = workflowStore.subscribe(() => {
      this.needsReconcile = true;
    });
    this.cleanupFuncs.push(unsub, () => this.disposeDynamicEntities());
  }

  update(): void {
    if (!this.needsReconcile) return;
    this.needsReconcile = false;
    this.reconcileSceneWithWorkflow(workflowStore.getWorkflow());
  }

  private reconcileSceneWithWorkflow(workflow: Readonly<Workflow>): void {
    const activeNodeMap = new Map(workflow.nodes.map((n) => [n.id, n]));

    // 1. Reconcile existing static/scene agent entities
    const representedNodeIds = new Set<string>();
    this.queries.agents.entities.forEach((entity) => {
      const agentId = entity.getValue(AgentNodeComponent, 'agentId') ?? '';
      const wfNodeId = resolveWorkflowNodeId(agentId);
      const nodeData = activeNodeMap.get(wfNodeId) ?? activeNodeMap.get(agentId);

      const obj = entity.object3D;
      if (!obj) return;

      if (!nodeData) {
        obj.visible = false;
        return;
      }

      representedNodeIds.add(nodeData.id);
      obj.visible = true;
      entity.setValue(AgentNodeComponent, 'status', nodeData.status);

      // Update 3D position if not actively held by a hand
      if (!entity.hasComponent(Grabbed)) {
        const [nx, ny, nz] = nodeData.position;
        const dx = Math.abs(obj.position.x - nx);
        const dz = Math.abs(obj.position.z - nz);
        const baseY = entity.getValue(AgentNodeComponent, 'baseY') ?? ny;
        const dy = Math.abs(baseY - ny);
        if (dx > 0.005 || dy > 0.005 || dz > 0.005) {
          obj.position.set(nx, ny, nz);
          entity.setValue(AgentNodeComponent, 'baseY', ny);
        }
      }
    });

    // 2. Clean up removed dynamic node entities
    for (const [nodeId, dynEntity] of this.dynamicNodeEntities.entries()) {
      if (!activeNodeMap.has(nodeId)) {
        if (dynEntity.active) {
          dynEntity.dispose();
        }
        this.dynamicNodeEntities.delete(nodeId);
      }
    }

    // 3. Materialize any newly added dynamic nodes not yet in the 3D scene
    for (const node of workflow.nodes) {
      if (representedNodeIds.has(node.id)) continue;
      if (this.dynamicNodeEntities.has(node.id)) continue;

      const mesh = createMeshForRole(node.role);
      mesh.position.set(node.position[0], node.position[1], node.position[2]);
      const entity = this.world.createTransformEntity(mesh);
      entity
        .addComponent(AgentNodeComponent, {
          role: node.role,
          agentId: node.id,
          status: node.status,
          baseY: node.position[1],
          isSelected: false,
          isHovered: false,
        })
        .addComponent(RayInteractable)
        .addComponent(PokeInteractable)
        .addComponent(OneHandGrabbable, {
          rotate: false,
          translate: true,
          translateMin: [-1.15, 0.82, -1.45],
          translateMax: [1.15, 1.65, -0.42],
        });

      this.dynamicNodeEntities.set(node.id, entity);
    }

    // 4. Reconcile edges: check which edges are already represented by static scene beams
    const representedEdgeKeys = new Set<string>();
    this.queries.edges.entities.forEach((entity) => {
      const edgeId = entity.getValue(WorkflowEdgeComponent, 'edgeId') ?? '';
      const src = entity.getValue(WorkflowEdgeComponent, 'sourceNodeId') ?? '';
      const dst = entity.getValue(WorkflowEdgeComponent, 'targetNodeId') ?? '';
      representedEdgeKeys.add(edgeId);
      representedEdgeKeys.add(`${src}->${dst}`);
    });

    const activeEdgeIds = new Set(workflow.edges.map((e) => e.id));
    for (const [edgeId, dynEdge] of this.dynamicEdgeEntities.entries()) {
      if (!activeEdgeIds.has(edgeId)) {
        if (dynEdge.active) {
          dynEdge.dispose();
        }
        this.dynamicEdgeEntities.delete(edgeId);
      }
    }

    // 5. Materialize any new edges created dynamically in the graph editor
    for (const edge of workflow.edges) {
      const key = `${edge.sourceNodeId}->${edge.targetNodeId}`;
      if (
        representedEdgeKeys.has(edge.id) ||
        representedEdgeKeys.has(key) ||
        this.dynamicEdgeEntities.has(edge.id)
      ) {
        continue;
      }

      const beamMesh = createWorkflowConnectionBeam();
      const srcAgentId =
        CORE_NODE_TO_AGENT_ID[edge.sourceNodeId] ?? edge.sourceNodeId;
      const dstAgentId =
        CORE_NODE_TO_AGENT_ID[edge.targetNodeId] ?? edge.targetNodeId;

      const edgeEntity = this.world.createTransformEntity(beamMesh);
      edgeEntity
        .addComponent(WorkflowEdgeComponent, {
          edgeId: edge.id,
          sourceNodeId: edge.sourceNodeId,
          targetNodeId: edge.targetNodeId,
          sourceAgentId: srcAgentId,
          targetAgentId: dstAgentId,
          isSelected: false,
        })
        .addComponent(RayInteractable)
        .addComponent(PokeInteractable);

      this.dynamicEdgeEntities.set(edge.id, edgeEntity);
    }
  }

  private disposeDynamicEntities(): void {
    for (const entity of this.dynamicNodeEntities.values()) {
      if (entity.active) entity.dispose();
    }
    this.dynamicNodeEntities.clear();

    for (const entity of this.dynamicEdgeEntities.values()) {
      if (entity.active) entity.dispose();
    }
    this.dynamicEdgeEntities.clear();
  }
}

