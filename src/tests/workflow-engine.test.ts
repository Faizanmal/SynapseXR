/**
 * Unit tests for Phase 8: Workflow Execution Engine.
 * Covers:
 * - Deterministic Demo Executor (safe structured payloads, all 4 roles)
 * - Remote AI Executor (dispatches payload, fallback resilience)
 * - Typed Workflow Execution Engine lifecycle (validating, queued, running, waiting_approval, completed, cancelled, failed)
 * - Human-in-the-loop approval & rejection gates
 * - DAG validation before execution & topological ordering
 * - Cancellation via AbortSignal and recovery/retry
 * - Context passing from upstream to downstream nodes
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { DeterministicDemoExecutor } from '../workflows/execution/deterministic-demo-executor.js';
import { RemoteAIExecutor } from '../workflows/execution/remote-ai-executor.js';
import {
  typedWorkflowEngine,
  type WorkflowEngineEvent,
} from '../workflows/execution/typed-workflow-engine.js';
import { templateSelector } from '../workflows/template-selector.js';
import { workflowStore } from '../workflows/workflow-store.js';

describe('Phase 8: Typed Workflow Execution Engine', () => {
  beforeEach(() => {
    typedWorkflowEngine.cancelExecution();
    workflowStore.resetWorkflow();
    typedWorkflowEngine.configure({ mode: 'demo' });
  });

  it('generates structured, realistic DEMO MODE outputs for all 4 roles', async () => {
    const executor = new DeterministicDemoExecutor();
    expect(executor.mode).toBe('demo');

    const context = {
      runId: 'test-run-1',
      workflowId: 'wf-test',
      executionMode: 'demo' as const,
    };

    // 1. Planner
    const planResult = await executor.executeAgent(
      {
        mission: 'Launch AgentSphere in Horizon Store',
        nodeId: 'node-planner',
        nodeLabel: 'Strategic Planner',
        role: 'planner',
        configuration: { timeframeDays: 14 },
        upstreamResults: {},
      },
      context,
    );
    expect(planResult.structuredOutput.mode).toBe('DEMO MODE');
    expect(planResult.structuredOutput.phases).toBeDefined();

    // 2. Researcher
    const researchResult = await executor.executeAgent(
      {
        mission: 'Launch AgentSphere in Horizon Store',
        nodeId: 'node-researcher',
        nodeLabel: 'Ecosystem Researcher',
        role: 'researcher',
        configuration: {},
        upstreamResults: { 'node-planner': planResult },
      },
      context,
    );
    expect(researchResult.structuredOutput.ecosystemBenchmarks).toBeDefined();

    // 3. Executor
    const execResult = await executor.executeAgent(
      {
        mission: 'Launch AgentSphere in Horizon Store',
        nodeId: 'node-executor',
        nodeLabel: 'Launch Executor',
        role: 'executor',
        configuration: {},
        upstreamResults: { 'node-researcher': researchResult },
      },
      context,
    );
    expect(execResult.structuredOutput.deliverables).toHaveLength(3);
    expect(execResult.structuredOutput.proposedAction).toBeDefined();

    // 4. Reviewer
    const reviewResult = await executor.executeAgent(
      {
        mission: 'Launch AgentSphere in Horizon Store',
        nodeId: 'node-reviewer',
        nodeLabel: 'Security Reviewer',
        role: 'reviewer',
        configuration: {},
        upstreamResults: { 'node-executor': execResult },
      },
      context,
    );
    expect(reviewResult.structuredOutput.recommendation).toBe('APPROVE');
    expect(reviewResult.structuredOutput.complianceGrade).toBe('A+');
  });

  it('runs the complete multi-stage execution pipeline with human approval sign-off', async () => {
    const recordedEvents: WorkflowEngineEvent[] = [];
    const unsub = typedWorkflowEngine.subscribe((ev) => recordedEvents.push(ev));

    const execPromise = typedWorkflowEngine.startExecution();

    // Wait until engine reaches waiting_approval for reviewer
    let attempts = 0;
    while (typedWorkflowEngine.getState() !== 'waiting_approval' && attempts < 50) {
      await new Promise((r) => setTimeout(r, 50));
      attempts++;
    }

    expect(typedWorkflowEngine.getState()).toBe('waiting_approval');
    const reviewerNode = workflowStore.getWorkflow().nodes.find((n) => n.id === 'node-reviewer');
    expect(reviewerNode?.status).toBe('waiting_approval');

    // Operator grants human sign-off
    const approved = typedWorkflowEngine.approveCurrentAction();
    expect(approved).toBe(true);

    const completedRun = await execPromise;
    expect(completedRun.executionStatus).toBe('completed');
    expect(typedWorkflowEngine.getState()).toBe('completed');

    // All nodes should now be completed with recorded outputs
    const wf = workflowStore.getWorkflow();
    for (const node of wf.nodes) {
      expect(node.status).toBe('completed');
      expect(node.outputReference).toBeDefined();
    }

    // Verify event progression
    const states = recordedEvents.map((e) => e.state);
    expect(states).toContain('validating');
    expect(states).toContain('queued');
    expect(states).toContain('running');
    expect(states).toContain('waiting_approval');
    expect(states).toContain('completed');

    unsub();
  });

  it('supports rejecting proposed actions at the human approval gate', async () => {
    const execPromise = typedWorkflowEngine.startExecution();

    let attempts = 0;
    while (typedWorkflowEngine.getState() !== 'waiting_approval' && attempts < 50) {
      await new Promise((r) => setTimeout(r, 50));
      attempts++;
    }

    expect(typedWorkflowEngine.getState()).toBe('waiting_approval');

    // Operator rejects the proposed action
    const rejected = typedWorkflowEngine.rejectCurrentAction('Security policy violation in proposed runbook');
    expect(rejected).toBe(true);

    const run = await execPromise;
    expect(run.executionStatus).toBe('failed');
    expect(typedWorkflowEngine.getState()).toBe('failed');
    expect(workflowStore.getWorkflow().nodes.find((n) => n.id === 'node-reviewer')?.status).toBe('failed');
  });

  it('supports mid-execution cancellation and clean recovery', async () => {
    const execPromise = typedWorkflowEngine.startExecution();

    // Cancel while running
    await new Promise((r) => setTimeout(r, 50));
    typedWorkflowEngine.cancelExecution();

    const run = await execPromise;
    expect(run.executionStatus).toBe('failed');
    expect(typedWorkflowEngine.getState()).toBe('cancelled');

    // Recovery: retry re-runs the pipeline cleanly
    const retryPromise = typedWorkflowEngine.retry();
    await new Promise((r) => setTimeout(r, 50));
    expect(typedWorkflowEngine.isExecuting()).toBe(true);
    typedWorkflowEngine.cancelExecution();
    await retryPromise;
  });

  it('rejects execution immediately if workflow graph is invalid or cyclical', async () => {
    // Introduce a cyclical loop directly into the workflow object
    const wf = JSON.parse(JSON.stringify(workflowStore.getWorkflow()));
    wf.edges.push({
      id: 'edge-cyclical-test',
      sourceNodeId: 'node-reviewer',
      targetNodeId: 'node-planner',
    });

    await expect(typedWorkflowEngine.startExecution(wf)).rejects.toThrow();
    expect(typedWorkflowEngine.getState()).toBe('failed');
  });

  it('falls back safely to local demo executor if remote AI service is offline', async () => {
    const remoteExecutor = new RemoteAIExecutor();
    expect(remoteExecutor.mode).toBe('remote');

    const result = await remoteExecutor.executeAgent(
      {
        mission: 'Test Remote Fallback',
        nodeId: 'node-planner',
        nodeLabel: 'Strategic Planner',
        role: 'planner',
        configuration: {},
        upstreamResults: {},
      },
      {
        runId: 'remote-test-1',
        workflowId: 'wf-remote',
        executionMode: 'remote',
        apiBaseUrl: 'http://127.0.0.1:9999', // Non-existent port
      },
    );

    expect(result).toBeDefined();
    expect(result.warnings.some((w) => w.includes('fallback'))).toBe(true);
    expect(result.structuredOutput).toBeDefined();
  });
});

