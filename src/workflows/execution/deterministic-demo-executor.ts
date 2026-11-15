/**
 * Deterministic Demo Agent Executor.
 *
 * Produces structured, realistic domain outputs for all 4 roles:
 * - Planner: Structured roadmap, deliverables, milestones
 * - Researcher: Competitor analysis, references, evidence
 * - Executor: Concrete campaign payload, copy drafts, code scaffolds
 * - Reviewer: Quality audit, security compliance check, human sign-off proposal
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
          summary: `Deconstructed mission into 4 strategic phases and 8 prioritized milestones.`,
          structuredOutput: {
            mode: 'DEMO MODE',
            mission: input.mission,
            timeframe: input.configuration.timeframeDays ?? 14,
            phases: [
              { phase: 1, title: 'Scope Definition & Architecture Review', days: '1-3' },
              { phase: 2, title: 'Intelligence Gathering & CVE Audit', days: '4-7' },
              { phase: 3, title: 'Asset Generation & Launch Playbook Synthesis', days: '8-11' },
              { phase: 4, title: 'Security Governance & Human Sign-Off Gate', days: '12-14' },
            ],
            kpis: ['Zero critical vulnerabilities', 'Verified human sign-off', 'Production deploy readiness'],
          },
          evidenceReferences: ['docs/ARCHITECTURE.md', 'docs/ENVIRONMENT_REPORT.md'],
          warnings: [],
          executionMode: 'mock',
          timestamps: { startedAt, completedAt },
        };
      }

      case 'researcher': {
        const planResult = Object.values(input.upstreamResults).find((r) =>
          r.structuredOutput && (r.structuredOutput as { phases?: unknown }).phases
        );

        return {
          id: `res-research-${input.nodeId}-${Date.now().toString(36)}`,
          nodeId: input.nodeId,
          summary: `Found one launch blocker: the customer data-retention claim has no verified source.`,
          structuredOutput: {
            mode: 'DEMO MODE',
            ecosystemBenchmarks: [
              { tool: 'Meta Quest 3 WebXR', status: 'Optimal', targetFps: 72 },
              { tool: 'IWSDK Core v1.1.0-rc.2', status: 'Compliant', zeroHeapPerFrame: true },
              { tool: 'FastAPI AI Backend Service', status: 'Standby / Verified Spec' },
            ],
            prioritizedInsights: [
              'The draft claims customer prompts are deleted after 30 days, but no retention policy was supplied.',
              'Do not publish the retention claim until the owner provides a verifiable policy source.',
            ],
            analyzedPlanReference: planResult?.id ?? 'implicit',
          },
          evidenceReferences: [],
          warnings: ['Demo scenario only: no external sources were searched or verified.'],
          executionMode: 'mock',
          timestamps: { startedAt, completedAt },
        };
      }

      case 'executor': {
        return {
          id: `res-exec-${input.nodeId}-${Date.now().toString(36)}`,
          nodeId: input.nodeId,
          summary: `Prepared a safe launch draft with the unsupported 30-day deletion claim removed.`,
          structuredOutput: {
            mode: 'DEMO MODE',
            deliverables: [
              { name: 'Launch announcement with no unsupported privacy claims', ready: true },
              { name: 'Open evidence request for the retention policy owner', ready: true },
              { name: 'Pre-publication review checklist', ready: true },
            ],
            proposedAction: 'Approve publication of the draft with the unsupported retention claim removed.',
            blockedClaim: 'Customer prompts are deleted after 30 days.',
            missingEvidence: 'A verifiable, owner-approved retention policy.',
            requiresHumanApproval: true,
          },
          evidenceReferences: ['src/index.ts', 'public/scenes/main.iwsdk.scene.json'],
          warnings: ['Action requires explicit human-in-the-loop sign-off before downstream dispatch.'],
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
          summary: `SAFE DRAFT READY: the 30-day deletion claim is unsupported and has been removed. Approve this draft or reject it and request policy evidence.`,
          structuredOutput: {
            mode: 'DEMO MODE',
            complianceGrade: 'HOLD',
            checks: [
              { check: 'Retention claim has an approved source', passed: false },
              { check: 'Unsupported claim excluded from draft', passed: true },
              { check: 'Publication waits for human sign-off', passed: true },
            ],
            recommendation: 'APPROVE SAFE DRAFT',
            requiredEvidence: 'Owner-approved data-retention policy',
            targetProposal: execResult?.structuredOutput?.proposedAction ?? 'Ready for deployment.',
          },
          evidenceReferences: [],
          warnings: ['Demo review is scripted and does not certify real-world compliance.'],
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

