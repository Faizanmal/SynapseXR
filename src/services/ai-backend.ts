/**
 * Client service for delegating execution tasks to the optional Python FastAPI backend.
 */

import { config } from '../core/config.js';
import { logger } from '../core/logger.js';

export interface BackendHealthResponse {
  status: string;
  version: string;
  provider: string;
}

export class AiBackendService {
  private baseUrl = config.api.backendUrl;

  async checkHealth(): Promise<BackendHealthResponse | null> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        return (await res.json()) as BackendHealthResponse;
      }
      return null;
    } catch {
      logger.debug('AiBackendService', 'Backend not reachable, operating in standalone demo mode');
      return null;
    }
  }

  async runAgentTask(role: string, prompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/v1/agents/${role}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        runId: `run-${Date.now().toString(36)}`,
        nodeId: `node-${role}-direct`,
        role,
        mission: prompt,
        context: {},
        priorResults: [],
        userProvidedEvidence: [],
      }),
      signal: AbortSignal.timeout(config.api.requestTimeoutMs),
    });

    if (!res.ok) {
      throw new Error(`Agent task failed with status ${res.status}`);
    }

    const data = (await res.json()) as { summary?: string; structuredOutput?: unknown };
    return data.summary || JSON.stringify(data.structuredOutput);
  }
}

export const aiBackendService = new AiBackendService();

