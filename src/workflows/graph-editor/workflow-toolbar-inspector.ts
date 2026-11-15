/**
 * WorkflowToolbar & WorkflowInspector: High-level controllers for the
 * Phase 7 Spatial Workflow Graph Editor.
 *
 * All graph edits strictly update local application state (`workflowStore`)
 * and 3D scene synchronization — graph edits never trigger paid AI calls.
 */

import { logger } from '../../core/logger.js';
import { interactionState } from '../../interactions/interaction-state.js';
import {
  executeSpatialAction,
  resolveWorkflowNodeId,
} from '../../interactions/spatial-input-adapter.js';
import { inferExecutionMode, workflowExporter } from '../../services/workflow-exporter.js';
import type {
  AgentResult,
  AgentRole,
  Workflow,
  WorkflowEdge,
  WorkflowNode,
} from '../domain-types.js';
import {
  validateWorkflowGraph,
  type GraphValidationResult,
} from '../graph-validator.js';
import {
  templateSelector,
  type WorkflowTemplateId,
} from '../template-selector.js';
import { typedWorkflowEngine } from '../execution/typed-workflow-engine.js';
import { workflowStore } from '../workflow-store.js';

export class WorkflowToolbar {
  selectTemplate(templateId: WorkflowTemplateId): Workflow {
    const wf = workflowStore.loadTemplate(templateId);
    interactionState.setState({
      selectedNodeId: null,
      selectedEdgeId: null,
      pendingConnectionSourceId: null,
      lastActionType: 'select_template',
      lastActionSummary: `Loaded template: ${wf.title}`,
    });
    logger.info('WorkflowToolbar', `Loaded workflow template '${templateId}'`);
    return wf;
  }

  cycleTemplate(): Workflow {
    const next = templateSelector.cycleNextTemplate();
    return this.selectTemplate(next.id);
  }

  addAgentNode(
    role: AgentRole,
    label?: string,
    position: [number, number, number] = [0.0, 1.22, -0.78],
  ): WorkflowNode {
    const defaultLabel =
      label ??
      `${role.charAt(0).toUpperCase()}${role.slice(1)} Specialist`;
    const created = workflowStore.addNode(role, defaultLabel, position);
    interactionState.setState({
      selectedNodeId: created.id,
      lastActionType: 'add_node',
      lastActionSummary: `Added ${created.label} (${created.id})`,
    });
    return created;
  }

  removeAgentNode(agentOrNodeId: string): boolean {
    const wfNodeId = resolveWorkflowNodeId(agentOrNodeId);
    const removed = workflowStore.removeNode(wfNodeId);
    if (removed) {
      interactionState.setState({
        selectedNodeId: null,
        lastActionType: 'remove_node',
        lastActionSummary: `Removed node ${wfNodeId}`,
      });
    }
    return removed;
  }

  connectAgentNodes(
    sourceAgentOrNodeId: string,
    targetAgentOrNodeId: string,
  ): { success: boolean; error?: string } {
    const src = resolveWorkflowNodeId(sourceAgentOrNodeId);
    const dst = resolveWorkflowNodeId(targetAgentOrNodeId);
    const res = workflowStore.connectNodes(src, dst);
    interactionState.setState({
      lastActionType: res.success ? 'connect_nodes' : 'connect_error',
      lastActionSummary: res.success
        ? `Connected ${src} -> ${dst}`
        : `Connection failed: ${res.error}`,
    });
    return res;
  }

  disconnectAgentNodes(
    sourceAgentOrNodeId: string,
    targetAgentOrNodeId: string,
  ): boolean {
    const src = resolveWorkflowNodeId(sourceAgentOrNodeId);
    const dst = resolveWorkflowNodeId(targetAgentOrNodeId);
    const ok = workflowStore.disconnectNodes(src, dst);
    if (ok) {
      interactionState.setState({
        selectedEdgeId: null,
        lastActionType: 'disconnect_nodes',
        lastActionSummary: `Disconnected ${src} -> ${dst}`,
      });
    }
    return ok;
  }

  runValidation(requireConnectedPipeline = true): GraphValidationResult {
    const report = validateWorkflowGraph(workflowStore.getWorkflow(), {
      requireConnectedPipeline,
    });
    interactionState.setState({
      lastActionType: 'validate_graph',
      lastActionSummary: report.valid
        ? `Graph valid. Execution order: ${report.executionOrder.join(' -> ')}`
        : `Graph invalid: ${report.errors[0] ?? 'Check connections'}`,
    });
    return report;
  }

  autoLayout(): Workflow {
    const wf = workflowStore.autoLayout();
    interactionState.setState({
      lastActionType: 'auto_layout',
      lastActionSummary: `Applied ergonomic seated auto-layout to ${wf.nodes.length} nodes`,
    });
    return wf;
  }

  undo(): boolean {
    const ok = workflowStore.undo();
    if (ok) {
      interactionState.setState({
        lastActionType: 'undo',
        lastActionSummary: 'Undid last workflow graph edit',
      });
    }
    return ok;
  }

  redo(): boolean {
    const ok = workflowStore.redo();
    if (ok) {
      interactionState.setState({
        lastActionType: 'redo',
        lastActionSummary: 'Redid workflow graph edit',
      });
    }
    return ok;
  }

  async saveWorkflow(): Promise<void> {
    await workflowStore.persistCurrent();
    interactionState.setState({
      lastActionType: 'save_workflow',
      lastActionSummary: `Saved workflow "${workflowStore.getWorkflow().title}" to local storage`,
    });
  }

  duplicateWorkflow(): Workflow {
    const copy = workflowStore.duplicateWorkflow();
    interactionState.setState({
      lastActionType: 'duplicate_workflow',
      lastActionSummary: `Duplicated workflow as "${copy.title}"`,
    });
    return copy;
  }

  async restoreWorkflow(workflowId?: string): Promise<boolean> {
    const restored = workflowId
      ? await workflowStore.loadFromStorage(workflowId)
      : await workflowStore.restoreLatestFromStorage();
    if (restored) {
      interactionState.setState({
        lastActionType: 'restore_workflow',
        lastActionSummary: `Restored workflow "${workflowStore.getWorkflow().title}" from storage`,
      });
    }
    return restored;
  }

  exportReport(): { success: boolean; filename: string; content: string } {
    const wf = workflowStore.getWorkflow();
    const allResults = workflowStore.getAllExecutionResults();
    const md = workflowExporter.generateMarkdownReport({
      workflow: wf,
      results: allResults,
      exportedAt: new Date().toISOString(),
      executionMode: inferExecutionMode(allResults, typedWorkflowEngine.getExecutionMode()),
    });
    const filename = `agentsphere-launch-report-${Date.now().toString(36)}.md`;
    const downloaded = workflowExporter.downloadMarkdownFile(filename, md);
    interactionState.setState({
      lastActionType: 'export_report',
      lastActionSummary: `Exported Markdown report: ${filename}`,
    });
    return { success: downloaded, filename, content: md };
  }

  launchWorkflow(): { launched: boolean; validation: GraphValidationResult } {
    const validation = this.runValidation(true);
    if (!validation.valid) {
      return { launched: false, validation };
    }
    executeSpatialAction('start_run', Date.now(), 0);
    return { launched: true, validation };
  }
}

export interface InspectedNodeDetails {
  node: WorkflowNode;
  result?: AgentResult;
  incomingEdges: WorkflowEdge[];
  outgoingEdges: WorkflowEdge[];
}

export class WorkflowInspector {
  getInspectedNode(explicitNodeOrAgentId?: string): InspectedNodeDetails | null {
    const wf = workflowStore.getWorkflow();
    const targetId = resolveWorkflowNodeId(
      explicitNodeOrAgentId ??
        interactionState.getState().selectedNodeId ??
        wf.nodes[0]?.id ??
        '',
    );
    const node = wf.nodes.find((n) => n.id === targetId);
    if (!node) return null;

    const result = node.outputReference
      ? workflowStore.getExecutionResult(node.outputReference)
      : undefined;
    const incomingEdges = wf.edges.filter((e) => e.targetNodeId === node.id);
    const outgoingEdges = wf.edges.filter((e) => e.sourceNodeId === node.id);

    return {
      node,
      result,
      incomingEdges,
      outgoingEdges,
    };
  }

  getInspectedEdge(explicitEdgeId?: string): WorkflowEdge | null {
    const wf = workflowStore.getWorkflow();
    const edgeId =
      explicitEdgeId ?? interactionState.getState().selectedEdgeId ?? '';
    return wf.edges.find((e) => e.id === edgeId) ?? null;
  }

  renameNode(agentOrNodeId: string, newLabel: string): boolean {
    const wfNodeId = resolveWorkflowNodeId(agentOrNodeId);
    const ok = workflowStore.renameNode(wfNodeId, newLabel);
    if (ok) {
      interactionState.setState({
        lastActionType: 'rename_node',
        lastActionSummary: `Renamed ${wfNodeId} to "${newLabel.trim()}"`,
      });
    }
    return ok;
  }

  updateNodeConfig(
    agentOrNodeId: string,
    configUpdate: Record<string, unknown>,
  ): boolean {
    const wfNodeId = resolveWorkflowNodeId(agentOrNodeId);
    const ok = workflowStore.updateNodeConfig(wfNodeId, configUpdate);
    if (ok) {
      interactionState.setState({
        lastActionType: 'update_node_config',
        lastActionSummary: `Updated configuration for ${wfNodeId}`,
      });
    }
    return ok;
  }

  getValidationReport(requireConnectedPipeline = false): GraphValidationResult {
    return validateWorkflowGraph(workflowStore.getWorkflow(), {
      requireConnectedPipeline,
    });
  }
}

export const workflowToolbar = new WorkflowToolbar();
export const workflowInspector = new WorkflowInspector();

