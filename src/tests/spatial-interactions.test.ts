/**
 * Unit tests for Phase 6: Hand Tracking, Spatial Input, Grab/Snap/Recovery,
 * Cooldown Protection, and Workflow Action Execution.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  canActivateInteraction,
  clampToReachableWorkspace,
  computeRecoveryPosition,
  DEFAULT_AGENT_POSITIONS,
  interactionState,
  isDragGesture,
  isOutsideEasyReach,
  resetInteractionState,
  snapToWorkspaceSlot,
} from '../interactions/interaction-state.js';
import {
  selectAgentNode,
  selectWorkflowEdge,
} from '../interactions/selection-system.js';
import { executeSpatialAction } from '../interactions/spatial-input-adapter.js';
import {
  createApproveButton,
  createResultsInspectorPanel,
  createStartRunButton,
  createWorkflowConnectionBeam,
} from '../scene-assets/command-center.scene-asset.js';
import { workflowStore } from '../workflows/workflow-store.js';

describe('Phase 6: Hand Tracking & Spatial Input Systems', () => {
  beforeEach(() => {
    resetInteractionState();
    workflowStore.resetWorkflow();
  });

  it('constructs 3D tactile spatial buttons, workflow connection beams, and inspector panel', () => {
    const startBtn = createStartRunButton();
    expect(startBtn.parent).toBeNull();
    expect(startBtn.getObjectByName('button-housing')).toBeDefined();
    expect(startBtn.getObjectByName('button-cap')).toBeDefined();

    const approveBtn = createApproveButton();
    expect(approveBtn.getObjectByName('button-cap')).toBeDefined();

    const beam = createWorkflowConnectionBeam();
    expect(beam.parent).toBeNull();
    expect(beam.getObjectByName('edge-beam')).toBeDefined();
    expect(beam.getObjectByName('edge-junction')).toBeDefined();

    const panel = createResultsInspectorPanel();
    expect(panel.parent).toBeNull();
    expect(panel.getObjectByName('panel-backing')).toBeDefined();
    expect(panel.getObjectByName('panel-screen')).toBeDefined();
    expect(panel.getObjectByName('panel-status-bar')).toBeDefined();
  });

  it('detects out-of-reach coordinates and recovers objects to reachable seated workspace', () => {
    expect(isOutsideEasyReach([0, 1.15, -0.75])).toBe(false);
    expect(isOutsideEasyReach([3.5, 1.15, -0.75])).toBe(true);
    expect(isOutsideEasyReach([0, 0.2, -0.75])).toBe(true);

    const clamped = clampToReachableWorkspace([2.0, 2.5, -0.1]);
    expect(clamped[0]).toBeLessThanOrEqual(1.15);
    expect(clamped[1]).toBeLessThanOrEqual(1.65);
    expect(clamped[2]).toBeLessThanOrEqual(-0.42);

    // Extreme throw (> 2.2m away) recovers directly to the agent's home pedestal
    const recovered = computeRecoveryPosition('agent-planner', [5.0, -2.0, -8.0]);
    expect(recovered).toEqual(DEFAULT_AGENT_POSITIONS['agent-planner']);
  });

  it('snaps released agents magnetically to nearby pedestal slots or spatial grid', () => {
    // Within 14cm of Planner pedestal [-0.48, 1.15, -0.75]
    const nearPlanner = snapToWorkspaceSlot([-0.45, 1.16, -0.73]);
    expect(nearPlanner.snappedToSlotId).toBe('slot-left-outer');
    expect(nearPlanner.position).toEqual([-0.48, 1.15, -0.75]);

    // Free placement within workspace snaps cleanly to 2cm grid
    const freePlace = snapToWorkspaceSlot([-0.313, 1.214, -0.689]);
    expect(freePlace.snappedToSlotId).toBeNull();
    expect(freePlace.position[0]).toBeCloseTo(-0.32, 2);
    expect(freePlace.position[1]).toBeCloseTo(1.22, 2);
    expect(freePlace.position[2]).toBeCloseTo(-0.68, 2);
  });

  it('resolves conflict between dragging and selecting using displacement threshold', () => {
    expect(isDragGesture([-0.48, 1.15, -0.75], [-0.47, 1.15, -0.75])).toBe(false);
    expect(isDragGesture([-0.48, 1.15, -0.75], [-0.2, 1.22, -0.85])).toBe(true);
  });

  it('prevents accidental double activation via interaction cooldown guard', () => {
    expect(canActivateInteraction(1000, 0, 350)).toBe(true);
    expect(canActivateInteraction(1200, 1000, 350)).toBe(false);
    expect(canActivateInteraction(1360, 1000, 350)).toBe(true);

    // Verify executeSpatialAction enforces cooldown
    const first = executeSpatialAction('start_run', 5000, 350);
    const duplicate = executeSpatialAction('cancel_run', 5150, 350);
    expect(first).toBe(true);
    expect(duplicate).toBe(false);
  });

  it('selects and deselects agents and workflow edges cleanly without stuck states', () => {
    expect(selectAgentNode('agent-planner', 1000)).toBe(true);
    expect(interactionState.getState().selectedNodeId).toBe('agent-planner');

    // Selecting a workflow connection clears agent selection and selects the edge
    expect(selectWorkflowEdge('edge-1', 1500)).toBe(true);
    expect(interactionState.getState().selectedEdgeId).toBe('edge-1');
    expect(interactionState.getState().selectedNodeId).toBeNull();

    // Tapping the same edge again deselects it
    expect(selectWorkflowEdge('edge-1', 2000)).toBe(true);
    expect(interactionState.getState().selectedEdgeId).toBeNull();
  });

  it('executes full workflow lifecycle actions: start, approve, reject, cancel, toggle results, and recenter', async () => {
    // 1. Start workflow execution via typed engine
    expect(executeSpatialAction('start_run', 1000)).toBe(true);

    // Wait until engine progresses to running/waiting_approval
    let attempts = 0;
    while (interactionState.getState().lastActionType !== 'start_run' && attempts < 20) {
      await new Promise((r) => setTimeout(r, 20));
      attempts++;
    }
    expect(executeSpatialAction('cancel_run', 1500)).toBe(true);

    // 2. Direct state-transition verification
    workflowStore.updateNodeStatus('node-executor', 'running');
    workflowStore.updateNodeStatus('node-reviewer', 'waiting_approval');
    let wf = workflowStore.getWorkflow();
    expect(wf.nodes.find((n) => n.id === 'node-executor')?.status).toBe('running');
    expect(wf.nodes.find((n) => n.id === 'node-reviewer')?.status).toBe(
      'waiting_approval',
    );

    // 3. Approve action
    expect(executeSpatialAction('approve_action', 2000)).toBe(true);
    wf = workflowStore.getWorkflow();
    expect(wf.nodes.find((n) => n.id === 'node-reviewer')?.status).toBe('completed');

    // 4. Reject action
    workflowStore.updateNodeStatus('node-reviewer', 'waiting_approval');
    expect(executeSpatialAction('reject_action', 3000)).toBe(true);
    wf = workflowStore.getWorkflow();
    expect(wf.nodes.find((n) => n.id === 'node-reviewer')?.status).toBe('failed');

    // 5. Open and close results inspector panel
    expect(interactionState.getState().inspectorOpen).toBe(true);
    expect(executeSpatialAction('toggle_results', 4000)).toBe(true);
    expect(interactionState.getState().inspectorOpen).toBe(false);
    expect(executeSpatialAction('toggle_results', 5000)).toBe(true);
    expect(interactionState.getState().inspectorOpen).toBe(true);

    // 6. Move an agent node, then recenter and reset workspace
    workflowStore.moveNode('node-planner', [0.25, 1.35, -0.65]);
    expect(executeSpatialAction('recenter_workspace', 6000)).toBe(true);
    wf = workflowStore.getWorkflow();
    expect(wf.nodes.find((n) => n.id === 'node-planner')?.position).toEqual(
      DEFAULT_AGENT_POSITIONS['agent-planner'],
    );
    expect(interactionState.getState().recenterCount).toBe(1);
  });
});

