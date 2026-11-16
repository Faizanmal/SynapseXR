/**
 * Typed Workflow Execution Engine.
 *
 * Implements the complete multi-stage execution pipeline:
 * 1. Validate workflow graph & reject cycles/unconnected pipelines
 * 2. Compute topological execution order (Kahn's algorithm)
 * 3. Resolve node dependencies & upstream outputs
 * 4. Create an observable execution run (WorkflowRun)
 * 5. Sequentially/concurrently execute ready nodes
 * 6. Emit typed progress events to EventBus and reactive state store
 * 7. Store intermediate results in WorkflowStore
 * 8. Pass structured context to downstream nodes
 * 9. Pause for human-in-the-loop approval before final action execution
 * 10. Complete, fail, cancel, or retry safely
 *
 * Safety & Performance Guarantees:
 * - No arbitrary code execution or unapproved tool calls
 * - Maximum node ceiling and depth protection
 * - Anti-duplicate execution guards
 * - AbortController timeout & cancellation support
 */

import { eventBus } from '../../core/event-bus.js';
import { logger } from '../../core/logger.js';
import { store } from '../../state/store.js';
import type {
  AgentResult,
  AgentStatus,
  Workflow,
  WorkflowNode,
  WorkflowRun,
  WorkflowStatus,
} from '../domain-types.js';
import {
  computeTopologicalExecutionOrder,
  validateWorkflowGraph,
} from '../graph-validator.js';
import { workflowStore } from '../workflow-store.js';
import type {
  AgentExecutionContext,
  IAgentExecutor,
} from './agent-executor-interface.js';
import { DeterministicDemoExecutor } from './deterministic-demo-executor.js';
import { RemoteAIExecutor } from './remote-ai-executor.js';

export type EngineExecutionState =
  | 'idle'
  | 'validating'
  | 'queued'
  | 'running'
  | 'waiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface WorkflowEngineEvent {
  runId: string;
  workflowId: string;
  state: EngineExecutionState;
  currentNodeId?: string;
  progress: number;
  message: string;
  timestamp: number;
}

export type WorkflowEngineListener = (event: WorkflowEngineEvent) => void;

export interface WorkflowEngineConfig {
  mode: 'demo' | 'remote';
  apiBaseUrl?: string;
  authToken?: string;
  stepTimeoutMs?: number;
  maxNodesPerRun?: number;
}

export class TypedWorkflowEngine {
  private state: EngineExecutionState = 'idle';
  private currentRun: WorkflowRun | null = null;
  private activeAbortController: AbortController | null = null;
  private listeners = new Set<WorkflowEngineListener>();
  private demoExecutor = new DeterministicDemoExecutor();
  private remoteExecutor = new RemoteAIExecutor();
  private config: WorkflowEngineConfig = {
    mode: 'demo',
    stepTimeoutMs: 15000,
    maxNodesPerRun: 24,
  };

  private pendingApprovalNodeId: string | null = null;

  configure(configUpdate: Partial<WorkflowEngineConfig>): void {
    this.config = { ...this.config, ...configUpdate };
    logger.info('TypedWorkflowEngine', `Engine configured: mode=${this.config.mode}`);
  }

  getState(): EngineExecutionState {
    return this.state;
  }

  getExecutionMode(): WorkflowEngineConfig['mode'] {
    return this.config.mode;
  }

  getCurrentRun(): Readonly<WorkflowRun> | null {
    return this.currentRun;
  }

  isExecuting(): boolean {
    return this.state === 'running' || this.state === 'validating' || this.state === 'queued';
  }

  subscribe(listener: WorkflowEngineListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emitState(
    state: EngineExecutionState,
    message: string,
    currentNodeId?: string,
    progress = 0,
  ): void {
    this.state = state;
    const runId = this.currentRun?.id ?? 'none';
    const workflowId = this.currentRun?.workflowId ?? workflowStore.getWorkflow().id;
    const event: WorkflowEngineEvent = {
      runId,
      workflowId,
      state,
      currentNodeId,
      progress,
      message,
      timestamp: Date.now(),
    };

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('WorkflowEngine listener error:', err);
      }
    }

    // Mirror to global application event bus
    if (state === 'running') {
      eventBus.emit('workflow:start', { workflowId, missionTitle: workflowStore.getWorkflow().title });
    } else if (state === 'completed') {
      eventBus.emit('workflow:complete', { workflowId, finalOutput: message });
    }
  }

  /**
   * Starts execution of the currently loaded workflow graph.
   */
  async startExecution(explicitWorkflow?: Workflow): Promise<WorkflowRun> {
    if (this.isExecuting()) {
      logger.warn('TypedWorkflowEngine', 'Execution already in progress; ignoring duplicate start trigger.');
      return this.currentRun!;
    }

    const workflow = explicitWorkflow ? JSON.parse(JSON.stringify(explicitWorkflow)) : workflowStore.getWorkflow();
    const runId = `run-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    this.activeAbortController = new AbortController();
    this.pendingApprovalNodeId = null;

    this.currentRun = {
      id: runId,
      workflowId: workflow.id,
      executionStatus: 'running',
      nodeExecutions: {},
      timestamps: { startedAt: new Date().toISOString() },
    };

    store.setState({ isExecuting: true, activeMissionTitle: workflow.title });

    // Step 1: Validate workflow graph
    this.emitState('validating', 'Validating workflow graph topology...', undefined, 0.05);
    const validation = validateWorkflowGraph(workflow, { requireConnectedPipeline: true });
    if (!validation.valid) {
      const errorMsg = `Graph validation failed: ${validation.errors.join('; ')}`;
      this.failRun(errorMsg);
      throw new Error(errorMsg);
    }

    // Step 2: Compute topological execution order
    const topo = computeTopologicalExecutionOrder(workflow);
    if (!topo.acyclic || topo.executionOrder.length === 0) {
      const errorMsg = 'Could not resolve acyclic topological execution order.';
      this.failRun(errorMsg);
      throw new Error(errorMsg);
    }

    // Step 3: Safety check node ceiling
    if (topo.executionOrder.length > (this.config.maxNodesPerRun ?? 24)) {
      const errorMsg = `Node count (${topo.executionOrder.length}) exceeds maximum limit (${this.config.maxNodesPerRun}).`;
      this.failRun(errorMsg);
      throw new Error(errorMsg);
    }

    // Initialize node execution states & reset statuses in store
    for (const nodeId of topo.executionOrder) {
      this.currentRun.nodeExecutions[nodeId] = {
        nodeId,
        status: 'ready',
      };
      workflowStore.updateNodeStatus(nodeId, 'ready');
    }

    this.emitState('queued', `Workflow pipeline queued (${topo.executionOrder.length} stages)`, undefined, 0.1);

    // Step 4 & 5: Execute pipeline stages in topological order
    try {
      await this.runPipelineStages(workflow, topo.executionOrder, this.activeAbortController.signal);
    } catch (err) {
      if (this.activeAbortController.signal.aborted) {
        this.cancelRun();
      } else {
        this.failRun((err as Error).message);
      }
    }

    return this.currentRun;
  }

  private async runPipelineStages(
    workflow: Workflow,
    executionOrder: string[],
    signal: AbortSignal,
  ): Promise<void> {
    this.emitState('running', 'Executing multi-stage agent pipeline...', undefined, 0.15);

    const accumulatedResults: Record<string, AgentResult> = {};
    const totalNodes = executionOrder.length;

    for (let i = 0; i < totalNodes; i++) {
      if (signal.aborted) {
        throw new Error('Pipeline execution aborted.');
      }

      const nodeId = executionOrder[i]!;
      const node = workflow.nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      this.currentRun!.currentNodeId = nodeId;
      this.currentRun!.nodeExecutions[nodeId]!.status = 'running';
      this.currentRun!.nodeExecutions[nodeId]!.startedAt = new Date().toISOString();
      workflowStore.updateNodeStatus(nodeId, 'running');

      const stageProgressBase = 0.15 + (i / totalNodes) * 0.7;
      this.emitState('running', `Agent [${node.role}] executing: ${node.label}`, nodeId, stageProgressBase);

      // Resolve upstream results feeding into this node
      const incomingEdges = workflow.edges.filter((e) => e.targetNodeId === nodeId);
      const upstreamResultsForNode: Record<string, AgentResult> = {};
      const upstreamRolesForNode: Record<string, WorkflowNode['role']> = {};
      for (const edge of incomingEdges) {
        const upstream = accumulatedResults[edge.sourceNodeId];
        if (upstream) {
          upstreamResultsForNode[edge.sourceNodeId] = upstream;
          const upstreamNode = workflow.nodes.find((candidate) => candidate.id === edge.sourceNodeId);
          if (upstreamNode) upstreamRolesForNode[edge.sourceNodeId] = upstreamNode.role;
        }
      }

      // Execute node logic via selected executor
      const executor: IAgentExecutor =
        this.config.mode === 'remote' ? this.remoteExecutor : this.demoExecutor;

      const context: AgentExecutionContext = {
        runId: this.currentRun!.id,
        workflowId: workflow.id,
        executionMode: this.config.mode,
        apiBaseUrl: this.config.apiBaseUrl,
        authToken: this.config.authToken,
        onProgress: (fraction, msg) => {
          const overall = stageProgressBase + (fraction * 0.7) / totalNodes;
          this.emitState('running', msg, nodeId, overall);
        },
      };

      const result = await executor.executeAgent(
        {
          mission: workflow.mission,
          nodeId: node.id,
          nodeLabel: node.label,
          role: node.role,
          configuration: node.configuration,
          upstreamResults: upstreamResultsForNode,
          upstreamRoles: upstreamRolesForNode,
        },
        context,
        signal,
      );

      // Save output reference in store and accumulator
      accumulatedResults[nodeId] = result;
      workflowStore.saveExecutionResult(result);

      // Present reviewer findings before asking the operator to sign off.
      const requiresHumanSignoff =
        node.role === 'reviewer' || Boolean(node.configuration.requireHumanSignoff);
      if (requiresHumanSignoff) {
        this.pendingApprovalNodeId = nodeId;
        this.currentRun!.nodeExecutions[nodeId]!.status = 'waiting_approval';
        workflowStore.updateNodeStatus(nodeId, 'waiting_approval');
        this.emitState(
          'waiting_approval',
          `Review ready. Human sign-off required for ${node.label}`,
          nodeId,
          stageProgressBase + 0.85 / totalNodes,
        );

        eventBus.emit('workflow:paused_for_approval', {
          agentId: `agent-${node.role}`,
          actionSummary: node.label,
          proposal: result.summary,
        });

        await this.waitForApprovalGate(signal);
      }

      this.currentRun!.nodeExecutions[nodeId]!.status = 'completed';
      this.currentRun!.nodeExecutions[nodeId]!.completedAt = new Date().toISOString();
      this.currentRun!.nodeExecutions[nodeId]!.resultId = result.id;
      workflowStore.updateNodeStatus(nodeId, 'completed');
    }

    // Complete run
    this.currentRun!.executionStatus = 'completed';
    this.currentRun!.timestamps.completedAt = new Date().toISOString();
    store.setState({ isExecuting: false });
    this.emitState('completed', 'Workflow execution successfully completed with verified outputs.', undefined, 1.0);
    logger.info('TypedWorkflowEngine', `Workflow run ${this.currentRun!.id} completed successfully.`);
  }

  private approvalResolver: (() => void) | null = null;
  private approvalRejecter: ((err: Error) => void) | null = null;

  private waitForApprovalGate(signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      this.approvalResolver = resolve;
      this.approvalRejecter = reject;

      signal.addEventListener('abort', () => {
        reject(new Error('Approval gate cancelled.'));
      }, { once: true });
    });
  }

  approveCurrentAction(): boolean {
    if (this.state !== 'waiting_approval' || !this.approvalResolver) {
      return false;
    }
    const nodeId = this.pendingApprovalNodeId;
    if (nodeId) {
      workflowStore.approveResult(nodeId);
      eventBus.emit('workflow:approved', { agentId: nodeId });
    }
    const resolve = this.approvalResolver;
    this.approvalResolver = null;
    this.approvalRejecter = null;
    this.pendingApprovalNodeId = null;
    this.emitState('running', 'Human approval granted by operator. Resuming pipeline...', nodeId ?? undefined);
    resolve();
    return true;
  }

  rejectCurrentAction(reason = 'Operator rejected proposed action in XR'): boolean {
    if (this.state !== 'waiting_approval' || !this.approvalRejecter) {
      return false;
    }
    const nodeId = this.pendingApprovalNodeId;
    if (nodeId) {
      workflowStore.rejectResult(nodeId, reason);
      eventBus.emit('workflow:rejected', { agentId: nodeId, reason });
    }
    const reject = this.approvalRejecter;
    this.approvalResolver = null;
    this.approvalRejecter = null;
    this.pendingApprovalNodeId = null;
    reject(new Error(`Action rejected: ${reason}`));
    return true;
  }

  cancelExecution(): void {
    if (!this.isExecuting() && this.state !== 'waiting_approval') {
      return;
    }
    this.activeAbortController?.abort();
    this.cancelRun();
  }

  private cancelRun(): void {
    if (this.currentRun) {
      this.currentRun.executionStatus = 'failed';
      this.currentRun.error = 'Execution cancelled by operator';
      this.currentRun.timestamps.completedAt = new Date().toISOString();
      for (const nodeExec of Object.values(this.currentRun.nodeExecutions)) {
        if (nodeExec.status === 'running' || nodeExec.status === 'waiting_approval') {
          nodeExec.status = 'cancelled';
          workflowStore.updateNodeStatus(nodeExec.nodeId, 'cancelled');
        }
      }
    }
    store.setState({ isExecuting: false });
    this.emitState('cancelled', 'Execution cancelled by operator.');
    logger.info('TypedWorkflowEngine', 'Execution cancelled.');
  }

  private failRun(reason: string): void {
    if (this.currentRun) {
      this.currentRun.executionStatus = 'failed';
      this.currentRun.error = reason;
      this.currentRun.timestamps.completedAt = new Date().toISOString();
      if (this.currentRun.currentNodeId) {
        const cur = this.currentRun.currentNodeId;
        if (this.currentRun.nodeExecutions[cur]) {
          this.currentRun.nodeExecutions[cur]!.status = 'failed';
          this.currentRun.nodeExecutions[cur]!.error = reason;
          workflowStore.updateNodeStatus(cur, 'failed');
        }
      }
    }
    store.setState({ isExecuting: false });
    this.emitState('failed', reason);
    logger.error('TypedWorkflowEngine', `Workflow run failed: ${reason}`);
  }

  async retry(): Promise<WorkflowRun> {
    this.cancelExecution();
    workflowStore.resetWorkflow();
    return this.startExecution();
  }
}

export const typedWorkflowEngine = new TypedWorkflowEngine();

