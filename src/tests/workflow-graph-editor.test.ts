/**
 * Unit tests for Phase 7: Spatial Workflow Graph Editor.
 * Covers TemplateSelector, AgentNodeView, ConnectionHandle, ConnectionRenderer,
 * GraphSelectionSystem, WorkflowToolbar, WorkflowInspector, topological ordering,
 * missing-input validation, auto-layout, overlap prevention, and save/restore.
 */

import { Vector3 } from '@iwsdk/core';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  interactionState,
  isOutsideEasyReach,
  resetInteractionState,
} from '../interactions/interaction-state.js';
import { createPlannerAgent } from '../scene-assets/agents.scene-asset.js';
import { createWorkflowConnectionBeam } from '../scene-assets/command-center.scene-asset.js';
import { agentNodeView } from '../workflows/graph-editor/agent-node-view.js';
import { connectionHandle } from '../workflows/graph-editor/connection-handle.js';
import { connectionRenderer } from '../workflows/graph-editor/connection-renderer.js';
import { graphSelectionSystem } from '../workflows/graph-editor/graph-selection-system.js';
import {
  workflowInspector,
  workflowToolbar,
} from '../workflows/graph-editor/workflow-toolbar-inspector.js';
import {
  computeTopologicalExecutionOrder,
  validateWorkflowGraph,
} from '../workflows/graph-validator.js';
import { templateSelector } from '../workflows/template-selector.js';
import { workflowStore } from '../workflows/workflow-store.js';

describe('Phase 7: Spatial Workflow Graph Editor', () => {
  beforeEach(() => {
    resetInteractionState();
    workflowStore.resetWorkflow();
    graphSelectionSystem.setConnectMode(false);
  });

  it('provides the 3 required workflow templates (SaaS Launch, Project Risk Review, Product Idea Evaluation)', () => {
    const templates = templateSelector.listTemplates();
    expect(templates.map((t) => t.name)).toEqual([
      'SaaS Launch Planner',
      'Project Risk Review',
      'Product Idea Evaluation',
    ]);

    const riskWf = workflowToolbar.selectTemplate('project-risk-review');
    expect(riskWf.title).toBe('Project Risk Review');
    expect(riskWf.nodes).toHaveLength(4);
    expect(riskWf.edges).toHaveLength(3);

    const ideaWf = workflowToolbar.selectTemplate('product-idea-evaluation');
    expect(ideaWf.title).toBe('Product Idea Evaluation');
    expect(ideaWf.nodes[0]?.label).toBe('Hypothesis Framer');
  });

  it('adds, renames, configures, and removes agent nodes while preventing overlaps', () => {
    // Add two nodes at the exact same coordinate to verify overlap resolution
    const n1 = workflowToolbar.addAgentNode('researcher', 'Patent Miner', [
      0.0,
      1.2,
      -0.8,
    ]);
    const n2 = workflowToolbar.addAgentNode('reviewer', 'Legal Critic', [
      0.0,
      1.2,
      -0.8,
    ]);

    const dist = Math.hypot(
      n1.position[0] - n2.position[0],
      n1.position[1] - n2.position[1],
      n1.position[2] - n2.position[2],
    );
    expect(dist).toBeGreaterThanOrEqual(0.1);

    // Rename & update config via WorkflowInspector
    expect(workflowInspector.renameNode(n1.id, 'Deep Patent Researcher')).toBe(
      true,
    );
    expect(
      workflowInspector.updateNodeConfig(n1.id, { maxCitations: 25 }),
    ).toBe(true);

    const inspected = workflowInspector.getInspectedNode(n1.id);
    expect(inspected?.node.label).toBe('Deep Patent Researcher');
    expect(inspected?.node.configuration.maxCitations).toBe(25);

    // Remove node
    expect(workflowToolbar.removeAgentNode(n2.id)).toBe(true);
    expect(
      workflowStore.getWorkflow().nodes.some((n) => n.id === n2.id),
    ).toBe(false);
  });

  it('connects and disconnects nodes through ConnectionHandle and GraphSelectionSystem', () => {
    // Disconnect existing edge between planner and researcher
    expect(
      workflowToolbar.disconnectAgentNodes('node-planner', 'node-researcher'),
    ).toBe(true);
    expect(workflowStore.getWorkflow().edges).toHaveLength(2);

    // Reconnect using two-step ConnectionHandle port activation
    const step1 = connectionHandle.handlePortActivation('agent-planner');
    expect(step1.edgeCreated).toBe(false);
    expect(interactionState.getState().pendingConnectionSourceId).toBe(
      'node-planner',
    );

    const step2 = connectionHandle.handlePortActivation('agent-researcher');
    expect(step2.success).toBe(true);
    expect(step2.edgeCreated).toBe(true);
    expect(workflowStore.getWorkflow().edges).toHaveLength(3);

    // Delete an edge via GraphSelectionSystem
    const edgeToDelete = workflowStore.getWorkflow().edges[0]!;
    graphSelectionSystem.activateEdge(edgeToDelete.id, 3000);
    const delResult = graphSelectionSystem.deleteSelectedElement();
    expect(delResult.deletedType).toBe('edge');
    expect(delResult.deletedId).toBe(edgeToDelete.id);
    expect(workflowStore.getWorkflow().edges).toHaveLength(2);
  });

  it('rejects cycles, duplicate edges, and detects missing required inputs & topological order', () => {
    // Duplicate connection rejected
    const dup = workflowToolbar.connectAgentNodes(
      'node-planner',
      'node-researcher',
    );
    expect(dup.success).toBe(false);

    // Cycle connection (reviewer -> planner) rejected
    const cycle = workflowToolbar.connectAgentNodes(
      'node-reviewer',
      'node-planner',
    );
    expect(cycle.success).toBe(false);
    expect(cycle.error).toContain('Cycle detected');

    // Valid topological execution order
    const topo = computeTopologicalExecutionOrder(workflowStore.getWorkflow());
    expect(topo.acyclic).toBe(true);
    expect(topo.executionOrder).toEqual([
      'node-planner',
      'node-researcher',
      'node-executor',
      'node-reviewer',
    ]);

    // Disconnect incoming edge to executor -> triggers missing required input detection
    workflowToolbar.disconnectAgentNodes('node-researcher', 'node-executor');
    const report = validateWorkflowGraph(workflowStore.getWorkflow(), {
      requireConnectedPipeline: true,
    });
    expect(report.valid).toBe(false);
    expect(report.missingInputs).toContain('node-executor');
  });

  it('live-updates 3D ConnectionRenderer line geometry, direction arrow, and data pulse without obscuring labels', () => {
    const plannerMesh = createPlannerAgent();
    expect(plannerMesh.getObjectByName('port-in')).toBeDefined();
    expect(plannerMesh.getObjectByName('port-out')).toBeDefined();
    const badge = plannerMesh.getObjectByName('node-label-badge');
    expect(badge).toBeDefined();

    agentNodeView.syncObject3D(plannerMesh, {
      nodeId: 'node-planner',
      role: 'planner',
      label: 'Strategic Planner',
      status: 'running',
      position: [-0.48, 1.15, -0.75],
      isSelected: true,
      isConnectionSource: true,
    });
    // Overhead label badge stays elevated at y = +0.16m
    expect(badge!.position.y).toBeCloseTo(0.16, 3);

    const beamObj = createWorkflowConnectionBeam();
    expect(beamObj.getObjectByName('edge-direction-arrow')).toBeDefined();
    expect(beamObj.getObjectByName('edge-data-pulse')).toBeDefined();

    const src = new Vector3(-0.48, 1.15, -0.75);
    const dst = new Vector3(-0.16, 1.25, -0.92);
    const dist = connectionRenderer.updateConnectionObject(beamObj, {
      sourcePosition: src,
      targetPosition: dst,
      isSelected: true,
      isHovered: false,
      isDataTransferActive: true,
      time: 1.25,
      delta: 0.016,
    });

    expect(dist).toBeGreaterThan(0.3);
    // Connection midpoint sits along the port plane (y - 0.02m = 1.18m), well below the label plane
    expect(beamObj.position.y).toBeCloseTo(1.18, 2);
  });

  it('supports seated auto-layout, undo/redo, duplicate, save, and restore after reload', async () => {
    // Scramble a node position, then run autoLayout
    workflowStore.moveNode('node-planner', [0.85, 1.5, -1.2]);
    const aligned = workflowToolbar.autoLayout();
    for (const node of aligned.nodes) {
      expect(isOutsideEasyReach(node.position)).toBe(false);
    }

    // Undo and redo
    expect(workflowToolbar.undo()).toBe(true);
    expect(
      workflowStore.getWorkflow().nodes.find((n) => n.id === 'node-planner')
        ?.position,
    ).toEqual([0.85, 1.5, -1.2]);
    expect(workflowToolbar.redo()).toBe(true);

    // Save workflow, switch template, then restore saved workflow from storage
    workflowInspector.renameNode('node-planner', 'Custom Saved Planner');
    const savedId = workflowStore.getWorkflow().id;
    await workflowToolbar.saveWorkflow();

    workflowToolbar.selectTemplate('project-risk-review');
    expect(workflowStore.getWorkflow().title).toBe('Project Risk Review');

    const restored = await workflowToolbar.restoreWorkflow(savedId);
    expect(restored).toBe(true);
    expect(
      workflowStore.getWorkflow().nodes.find((n) => n.id === 'node-planner')
        ?.label,
    ).toBe('Custom Saved Planner');

    // Duplicate workflow
    const copy = workflowToolbar.duplicateWorkflow();
    expect(copy.title).toContain('(Copy)');
    expect(copy.nodes).toHaveLength(4);
  });
});

