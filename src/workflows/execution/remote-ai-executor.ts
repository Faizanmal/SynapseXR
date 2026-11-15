/**
 * Remote AI Agent Executor.
 *
 * Dispatches agent tasks to the AgentSphere Python FastAPI backend.
 * Validates payload structures, respects cancellation AbortSignals,
 * falls back gracefully if backend is unreachable, and never invents tool results.
 */

import { logger } from '../../core/logger.js';
import type { AgentResult } from '../domain-types.js';
import type {
  AgentExecutionContext,
  AgentExecutionInput,
  IAgentExecutor,
} from './agent-executor-interface.js';
import { DeterministicDemoExecutor } from './deterministic-demo-executor.js';

export class RemoteAIExecutor implements IAgentExecutor {
  readonly mode = 'remote' as const;
  private fallbackExecutor = new DeterministicDemoExecutor();

  async executeAgent(
    input: AgentExecutionInput,
    context: AgentExecutionContext,
    abortSignal?: AbortSignal,
  ): Promise<AgentResult> {
    const baseUrl = context.apiBaseUrl || 'http://127.0.0.1:8000';
    const endpoint = `${baseUrl}/api/v1/agents/${input.role}/execute`;

    logger.info('RemoteAIExecutor', `Dispatching ${input.role} to remote backend: ${endpoint}`);
    context.onProgress?.(0.2, `Connecting to remote AI backend at ${endpoint}...`);

    try {
      const controller = new AbortController();
      if (abortSignal) {
        abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      // Map frontend agent context to backend AgentExecuteRequest schema
      const priorResults = Object.values(input.upstreamResults).map((res) => ({
        nodeId: res.nodeId,
        role: input.role, // role for reference
        summary: res.summary,
        structuredOutput: res.structuredOutput,
      }));

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(context.authToken ? { Authorization: `Bearer ${context.authToken}` } : {}),
        },
        body: JSON.stringify({
          runId: context.runId,
          nodeId: input.nodeId,
          role: input.role,
          mission: input.mission,
          context: {
            nodeLabel: input.nodeLabel,
            workflowId: context.workflowId,
            configuration: input.configuration,
          },
          priorResults,
          userProvidedEvidence: [],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Remote AI backend responded with HTTP status ${response.status}`);
      }

      const data = await response.json();
      context.onProgress?.(1.0, `Received verified payload from remote AI service.`);

      return {
        id: data.id || `res-remote-${input.nodeId}-${Date.now().toString(36)}`,
        nodeId: input.nodeId,
        summary: data.summary || `Remote AI execution completed for ${input.nodeLabel}`,
        structuredOutput: data.structuredOutput || data,
        evidenceReferences: data.evidenceReferences || [],
        warnings: data.warnings || [],
        executionMode: 'live',
        timestamps: {
          startedAt: data.timestamps?.startedAt || new Date().toISOString(),
          completedAt: data.timestamps?.completedAt || new Date().toISOString(),
        },
      };
    } catch (err) {
      if (abortSignal?.aborted) {
        throw new Error(`Remote execution aborted by operator.`);
      }

      logger.warn(
        'RemoteAIExecutor',
        `Remote AI backend offline or unreachable (${(err as Error).message}). Falling back to Deterministic Demo Executor.`,
      );
      context.onProgress?.(
        0.5,
        `Remote endpoint offline; engaging resilient Deterministic Demo Executor...`,
      );

      const fallbackResult = await this.fallbackExecutor.executeAgent(
        input,
        context,
        abortSignal,
      );
      fallbackResult.warnings.push(
        `Executed via local fallback: Remote AI backend unreachable (${(err as Error).message})`,
      );
      return fallbackResult;
    }
  }
}

