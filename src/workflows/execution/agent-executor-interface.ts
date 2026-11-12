/**
 * Agent Execution Interfaces and Standardized Input/Output Models.
 */

import type { AgentResult, AgentRole } from '../domain-types.js';

export interface AgentExecutionInput {
  mission: string;
  nodeId: string;
  nodeLabel: string;
  role: AgentRole;
  configuration: Record<string, unknown>;
  upstreamResults: Record<string, AgentResult>;
}

export interface AgentExecutionContext {
  runId: string;
  workflowId: string;
  executionMode: 'demo' | 'remote';
  apiBaseUrl?: string;
  authToken?: string;
  onProgress?: (progressFraction: number, message: string) => void;
}

export interface IAgentExecutor {
  readonly mode: 'demo' | 'remote';
  executeAgent(
    input: AgentExecutionInput,
    context: AgentExecutionContext,
    abortSignal?: AbortSignal,
  ): Promise<AgentResult>;
}

