/**
 * Deterministic Demo Agent Executor.
 *
 * Produces a deterministic synthetic AI retrieval incident for all 4 roles.
 * It never reads telemetry or calls operational systems.
 *
 * Explicitly marked DEMO MODE, zero external API dependencies, safe, deterministic.
 */

import type { AgentResult } from '../domain-types.js';
import type {
  AgentExecutionContext,
  AgentExecutionInput,
  IAgentExecutor,
} from './agent-executor-interface.js';

export class DeterministicDemoExecutor implements IAgentExecutor {
  readonly mode = 'demo' as const;

  async executeAgent(
    input: AgentExecutionInput,
    context: AgentExecutionContext,
    abortSignal?: AbortSignal,
  ): Promise<AgentResult> {
    const startedAt = new Date().toISOString();

    context.onProgress?.(0.15, `Initializing ${input.role} synthesis in DEMO MODE...`);
    await this.tickDelay(100, abortSignal);

    context.onProgress?.(0.65, `Analyzing upstream context and constraints...`);
    await this.tickDelay(100, abortSignal);

    if (abortSignal?.aborted) {
      throw new Error(`Execution aborted for node ${input.nodeId}`);
    }

    const completedAt = new Date().toISOString();
    context.onProgress?.(1.0, `Synthesized deterministic payload for ${input.nodeLabel}`);

    switch (input.role) {
      case 'planner': {
        return {
          id: `res-plan-${input.nodeId}-${Date.now().toString(36)}`,
          nodeId: input.nodeId,
          summary: `Opened simulated incident SIM-042 and separated known facts from scope unknowns.`,
          structuredOutput: {
            mode: 'SCRIPTED SIMULATION',
            mission: input.mission,
            incidentId: 'SIM-042',
            severity: 'provisional SEV-2 (simulation only)',
            syntheticTimeline: [
              { time: '09:14:02', event: 'Synthetic support query submitted to assistant' },
              { time: '09:14:03', event: 'Retriever returned document DOC-SYN-17 from index kb-synthetic-v4' },
              { time: '09:14:04', event: 'Assistant response included a synthetic account detail' },
            ],
            responsePhases: [
              'Preserve the synthetic event trail and record hashes',
              'Confirm the affected index and retrieval path',
              'Prepare scoped quarantine with a tested rollback',
              'Require operator approval before any action',
            ],
            knownFacts: ['Only synthetic records are present in this scenario'],
            unknowns: ['Real-world exposure scope is unknown and was not investigated'],
          },
          evidenceReferences: [],
          warnings: ['All incident data is synthetic. No logs, indexes, or external systems were accessed.'],
          executionMode: 'mock',
          timestamps: { startedAt, completedAt },
        };
      }

      case 'researcher': {
        const planResult = Object.values(input.upstreamResults).find((r) =>
          r.structuredOutput && (r.structuredOutput as { responsePhases?: unknown }).responsePhases
        );

        return {
          id: `res-research-${input.nodeId}-${Date.now().toString(36)}`,
          nodeId: input.nodeId,
          summary: `Correlated DOC-SYN-17 with the synthetic answer trace; real exposure scope remains unknown.`,
          structuredOutput: {
            mode: 'SCRIPTED SIMULATION',
            syntheticObservations: [
              { id: 'TRACE-SYN-8841', finding: 'Retriever returned DOC-SYN-17' },
              { id: 'DOC-SYN-17', finding: 'Document belongs to the synthetic support collection' },
              { id: 'IDX-SYN-04', finding: 'Index version matches the scenario configuration' },
            ],
            evidenceGaps: [
              'No production telemetry was queried; real exposure scope is unknown.',
              'A real response would require an incident owner to confirm affected tenants and time range.',
            ],
            analyzedTriageReference: planResult?.id ?? 'implicit',
          },
          evidenceReferences: [],
          warnings: ['Synthetic trace only. These identifiers are not real telemetry or verified evidence.'],
          executionMode: 'mock',
          timestamps: { startedAt, completedAt },
        };
      }

      case 'executor': {
        return {
          id: `res-exec-${input.nodeId}-${Date.now().toString(36)}`,
          nodeId: input.nodeId,
          summary: `Prepared a staged containment plan that preserves evidence and includes a rollback path.`,
          structuredOutput: {
            mode: 'SCRIPTED SIMULATION',
            containmentPlan: [
              { step: 1, action: 'Preserve the synthetic request and retrieval events', changesProduction: false },
              { step: 2, action: 'Quarantine kb-synthetic-v4 in the simulation', changesProduction: false },
              { step: 3, action: 'Replay the synthetic query against a clean index snapshot', changesProduction: false },
            ],
            proposedAction: 'Approve the simulated quarantine of kb-synthetic-v4 and preserve the event trail.',
            rollback: 'Restore the saved synthetic index snapshot after replay passes.',
            impact: 'The simulated assistant cannot retrieve from the quarantined test index until restored.',
            executionBoundary: 'Plan only. No production tools or external systems are called.',
            requiresHumanApproval: true,
          },
          evidenceReferences: [],
          warnings: ['This is a proposed simulation plan; no containment action has been executed.'],
          executionMode: 'mock',
          timestamps: { startedAt, completedAt },
        };
      }

      case 'reviewer': {
        const execResult = Object.values(input.upstreamResults).find((r) =>
          r.structuredOutput && (r.structuredOutput as { proposedAction?: unknown }).proposedAction
        );

        return {
          id: `res-review-${input.nodeId}-${Date.now().toString(36)}`,
          nodeId: input.nodeId,
          summary: `REVIEW READY: SIM-042 containment is scoped and reversible. Confirm an incident owner before any real response.`,
          structuredOutput: {
            mode: 'SCRIPTED SIMULATION',
            incidentId: 'SIM-042',
            reviewStatus: 'READY FOR OPERATOR DECISION',
            checks: [
              { check: 'Scenario scope is explicitly synthetic', passed: true },
              { check: 'Evidence preservation precedes containment', passed: true },
              { check: 'Rollback path is documented', passed: true },
              { check: 'No external or production action was executed', passed: true },
              { check: 'Real exposure scope is independently verified', passed: false },
            ],
            recommendation: 'APPROVE SIMULATED PLAN ONLY',
            requiredEvidence: 'Incident owner confirmation, affected tenant/time range, and verified production telemetry before a real response.',
            targetProposal: execResult?.structuredOutput?.proposedAction ?? 'Ready for deployment.',
            impact: execResult?.structuredOutput?.impact ?? 'No production impact; plan is simulated.',
            rollbackPlan: execResult?.structuredOutput?.rollback ?? 'Restore the saved synthetic index snapshot.',
          },
          evidenceReferences: [],
          warnings: ['This scripted review is not incident evidence and does not authorize a production change.'],
          executionMode: 'mock',
          timestamps: { startedAt, completedAt },
        };
      }
      default: {
        return {
          id: `res-gen-${input.nodeId}-${Date.now().toString(36)}`,
          nodeId: input.nodeId,
          summary: `Completed generic task for ${input.nodeLabel}`,
          structuredOutput: { mode: 'DEMO MODE' },
          evidenceReferences: [],
          warnings: [],
          executionMode: 'mock',
          timestamps: { startedAt, completedAt },
        };
      }
    }
  }

  private tickDelay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        return reject(new Error('Operation aborted.'));
      }
      const timeout = setTimeout(resolve, ms);
      signal?.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error('Operation aborted.'));
      }, { once: true });
    });
  }
}

