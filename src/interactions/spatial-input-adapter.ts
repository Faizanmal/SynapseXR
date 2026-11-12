/**
 * SpatialInputAdapter: Bridges IWSDK Hand Tracking, Ray/Poke/Grab systems,
 * and Desktop Browser Pointer/Keyboard fallback into unified AgentSphere actions.
 */

import { GrabSystem, InputSystem, World } from '@iwsdk/core';
import { eventBus } from '../core/event-bus.js';
import { logger } from '../core/logger.js';
import { validateWorkflowGraph } from '../workflows/graph-validator.js';
import { templateSelector } from '../workflows/template-selector.js';
import { workflowStore } from '../workflows/workflow-store.js';
import {
  canActivateInteraction,
  DEFAULT_AGENT_POSITIONS,
  interactionState,
  SpatialActionType,
  SpatialInputMode,
} from './interaction-state.js';

const AGENT_TO_WORKFLOW_NODE_ID: Readonly<Record<string, string>> = {
  'agent-planner': 'node-planner',
  'agent-researcher': 'node-researcher',
  'agent-executor': 'node-executor',
  'agent-reviewer': 'node-reviewer',
};

export function resolveWorkflowNodeId(agentOrNodeId: string): string {
  return AGENT_TO_WORKFLOW_NODE_ID[agentOrNodeId] ?? agentOrNodeId;
}

/**
 * Executes a high-level spatial action (invoked identically by 3D hand-poke buttons,
 * hand-ray clicks, UIKitML controls, or desktop fallback keys).
 * Returns true if executed, false if blocked by cooldown debounce.
 */
export function executeSpatialAction(
  action: SpatialActionType,
  nowMs: number = Date.now(),
  cooldownMs = 300,
): boolean {
  const state = interactionState.getState();
  if (!canActivateInteraction(nowMs, state.lastActionTimestampMs, cooldownMs)) {
    logger.debug(
      'SpatialInputAdapter',
      `Action '${action}' suppressed by ${cooldownMs}ms cooldown guard`,
    );
    return false;
  }

  let summary = '';
  let nextInspectorOpen = state.inspectorOpen;
  let nextRecenterCount = state.recenterCount;
  let nextSelectedNodeId = state.selectedNodeId;
  let nextSelectedEdgeId = state.selectedEdgeId;

  switch (action) {
    case 'start_run': {
      workflowStore.updateNodeStatus('node-planner', 'completed');
      workflowStore.updateNodeStatus('node-researcher', 'completed');
      workflowStore.updateNodeStatus('node-executor', 'running');
      workflowStore.updateNodeStatus('node-reviewer', 'waiting_approval');
      nextInspectorOpen = true;
      summary =
        'Started workflow execution: Planner & Researcher completed, Executor running, Reviewer waiting approval';
      eventBus.emit('workflow:start', {
        workflowId: workflowStore.getWorkflow().id,
        missionTitle: workflowStore.getWorkflow().title,
      });
      break;
    }

    case 'cancel_run': {
      const wf = workflowStore.getWorkflow();
      for (const node of wf.nodes) {
        if (node.status === 'running' || node.status === 'waiting_approval') {
          workflowStore.updateNodeStatus(node.id, 'cancelled');
        }
      }
      summary = 'Cancelled active workflow execution';
      break;
    }

    case 'reset_workflow': {
      workflowStore.resetWorkflow();
      nextSelectedNodeId = null;
      nextSelectedEdgeId = null;
      summary = 'Reset workflow execution states to ready';
      break;
    }

    case 'approve_action': {
      const wf = workflowStore.getWorkflow();
      const targetNode =
        wf.nodes.find((n) => n.status === 'waiting_approval') ??
        wf.nodes.find((n) => n.id === resolveWorkflowNodeId(state.selectedNodeId ?? '')) ??
        wf.nodes.find((n) => n.role === 'reviewer') ??
        wf.nodes[wf.nodes.length - 1];

      if (targetNode) {
        workflowStore.saveExecutionResult({
          id: `res-approved-${nowMs}`,
          nodeId: targetNode.id,
          summary: `Human-in-the-loop approval granted for ${targetNode.label}`,
          structuredOutput: { approvedBy: 'xr-hand-operator', timestamp: nowMs },
          evidenceReferences: ['spatial-approval-console'],
          warnings: [],
          executionMode: 'mock',
          timestamps: {
            startedAt: new Date(nowMs - 500).toISOString(),
            completedAt: new Date(nowMs).toISOString(),
          },
        });
        workflowStore.approveResult(targetNode.id);
      }
      workflowStore.updateNodeStatus('node-executor', 'completed');
      workflowStore.updateNodeStatus('node-reviewer', 'completed');
      nextInspectorOpen = true;
      summary = `Approved proposed action (${targetNode?.label ?? 'Reviewer'})`;
      break;
    }

    case 'reject_action': {
      const wf = workflowStore.getWorkflow();
      const targetNode =
        wf.nodes.find((n) => n.status === 'waiting_approval') ??
        wf.nodes.find((n) => n.id === resolveWorkflowNodeId(state.selectedNodeId ?? '')) ??
        wf.nodes.find((n) => n.role === 'reviewer') ??
        wf.nodes[wf.nodes.length - 1];

      if (targetNode) {
        workflowStore.rejectResult(
          targetNode.id,
          'Operator rejected proposed action in XR Command Center',
        );
      }
      nextInspectorOpen = true;
      summary = `Rejected proposed action (${targetNode?.label ?? 'Reviewer'})`;
      break;
    }

    case 'toggle_results': {
      nextInspectorOpen = !state.inspectorOpen;
      summary = nextInspectorOpen
        ? 'Opened 3D Results & Approval Inspector Panel'
        : 'Closed 3D Results & Approval Inspector Panel';
      break;
    }

    case 'recenter_workspace': {
      workflowStore.resetWorkflow();
      const defaultEntries = Object.entries(DEFAULT_AGENT_POSITIONS) as Array<
        [string, [number, number, number]]
      >;
      for (const [agentId, homePos] of defaultEntries) {
        const wfNodeId = AGENT_TO_WORKFLOW_NODE_ID[agentId];
        if (wfNodeId) {
          workflowStore.moveNode(wfNodeId, [homePos[0], homePos[1], homePos[2]]);
        }
      }
      nextSelectedNodeId = null;
      nextSelectedEdgeId = null;
      nextInspectorOpen = true;
      nextRecenterCount = state.recenterCount + 1;
      summary = 'Recentered and reset 3D workspace to seated ergonomic anchors';
      break;
    }

    case 'cycle_template': {
      const next = templateSelector.cycleNextTemplate();
      const loaded = workflowStore.loadTemplate(next.id);
      nextSelectedNodeId = null;
      nextSelectedEdgeId = null;
      summary = `Loaded template: ${loaded.title}`;
      break;
    }

    case 'validate_graph': {
      const report = validateWorkflowGraph(workflowStore.getWorkflow(), {
        requireConnectedPipeline: true,
      });
      summary = report.valid
        ? `Graph valid (${report.executionOrder.join(' -> ')})`
        : `Graph invalid: ${report.errors[0] ?? 'Validation failed'}`;
      break;
    }

    case 'auto_layout': {
      const wf = workflowStore.autoLayout();
      summary = `Auto-aligned ${wf.nodes.length} agent nodes in seated arc`;
      break;
    }

    case 'undo_edit': {
      const ok = workflowStore.undo();
      summary = ok ? 'Undid last workflow edit' : 'Nothing to undo';
      break;
    }

    case 'redo_edit': {
      const ok = workflowStore.redo();
      summary = ok ? 'Redid workflow edit' : 'Nothing to redo';
      break;
    }

    case 'save_workflow': {
      void workflowStore.persistCurrent();
      summary = `Saved workflow "${workflowStore.getWorkflow().title}"`;
      break;
    }
  }

  interactionState.setState({
    selectedNodeId: nextSelectedNodeId,
    selectedEdgeId: nextSelectedEdgeId,
    pendingConnectionSourceId: null,
    inspectorOpen: nextInspectorOpen,
    lastActionTimestampMs: nowMs,
    lastActionType: action,
    lastActionSummary: summary,
    recenterCount: nextRecenterCount,
  });

  logger.info('SpatialInputAdapter', summary);
  return true;
}

/**
 * Adapter that configures IWSDK's InputSystem and GrabSystem for dual
 * hands-first XR (pinch grab + poke + hand ray) and desktop pointer/keyboard fallback.
 */
export class SpatialInputAdapter {
  private cleanupFns: Array<() => void> = [];

  attach(world: World): void {
    const inputSystem = world.getSystem(InputSystem);
    if (inputSystem) {
      // Ensure 3D scene pointers remain active both in immersive XR and desktop canvas preview
      inputSystem.config.maintainScenePointers.value = true;
    }

    const grabSystem = world.getSystem(GrabSystem);
    if (grabSystem) {
      // Ensure hand pinch forwards to squeeze/grab for OneHandGrabbable entities
      grabSystem.config.useHandPinchForGrab.value = true;
    }

    if (typeof window !== 'undefined') {
      const onKeyDown = (ev: KeyboardEvent) => {
        if (ev.repeat) return;
        // Desktop development fallback shortcuts (complementing 3D canvas pointer & XR hands)
        switch (ev.key.toLowerCase()) {
          case '1':
            executeSpatialAction('start_run');
            break;
          case '2':
            executeSpatialAction('cancel_run');
            break;
          case '3':
            executeSpatialAction('approve_action');
            break;
          case '4':
            executeSpatialAction('reject_action');
            break;
          case 'i':
            executeSpatialAction('toggle_results');
            break;
          case 'r':
            executeSpatialAction('recenter_workspace');
            break;
          case 't':
            executeSpatialAction('cycle_template');
            break;
          case 'v':
            executeSpatialAction('validate_graph');
            break;
          case 'l':
            executeSpatialAction('auto_layout');
            break;
          case 'z':
            executeSpatialAction('undo_edit');
            break;
          case 'y':
            executeSpatialAction('redo_edit');
            break;
          default:
            break;
        }
      };

      const onPointerDown = () => {
        if (interactionState.getState().activeInputMode !== 'hand') {
          this.setInputMode('pointer');
        }
      };

      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('pointerdown', onPointerDown, { passive: true });
      this.cleanupFns.push(() => {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('pointerdown', onPointerDown);
      });
    }
  }

  setInputMode(mode: SpatialInputMode): void {
    if (interactionState.getState().activeInputMode !== mode) {
      interactionState.setState({ activeInputMode: mode });
    }
  }

  dispose(): void {
    for (const fn of this.cleanupFns) {
      fn();
    }
    this.cleanupFns.length = 0;
  }
}

