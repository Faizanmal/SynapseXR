/**
 * Browser persistence layer supporting IndexedDB with fallback to localStorage.
 * Includes schema version migration handling.
 */

import {
  CURRENT_WORKFLOW_SCHEMA_VERSION,
  type AgentResult,
  type Workflow,
  type WorkflowRun,
} from './domain-types.js';

export interface StorageAdapter {
  saveWorkflow(workflow: Workflow): Promise<void>;
  getWorkflow(id: string): Promise<Workflow | null>;
  listWorkflows(): Promise<Workflow[]>;
  deleteWorkflow(id: string): Promise<void>;
  saveResult(result: AgentResult): Promise<void>;
  getResult(id: string): Promise<AgentResult | null>;
  saveRun(run: WorkflowRun): Promise<void>;
  getRun(id: string): Promise<WorkflowRun | null>;
}

export function migrateWorkflowSchema(raw: any): Workflow {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid workflow object');
  }

  const version = raw.schemaVersion || 0;
  let migrated = { ...raw };

  if (version < 1) {
    // Migration from version 0 to version 1: Add schemaVersion, ensure edges and status exist
    migrated.schemaVersion = 1;
    migrated.status = migrated.status || 'draft';
    migrated.nodes = migrated.nodes || [];
    migrated.edges = migrated.edges || [];
    migrated.createdAt = migrated.createdAt || new Date().toISOString();
    migrated.updatedAt = migrated.updatedAt || new Date().toISOString();
  }

  return migrated as Workflow;
}

/**
 * Universal memory & localStorage persistence adapter.
 * Works seamlessly in headless unit tests, node, and browser WebXR environments.
 */
export class LocalStorageAdapter implements StorageAdapter {
  private memoryWorkflows = new Map<string, Workflow>();
  private memoryResults = new Map<string, AgentResult>();
  private memoryRuns = new Map<string, WorkflowRun>();

  private isLocalStorageAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  async saveWorkflow(workflow: Workflow): Promise<void> {
    const migrated = migrateWorkflowSchema(workflow);
    this.memoryWorkflows.set(migrated.id, migrated);

    if (this.isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(`agentsphere:wf:${migrated.id}`, JSON.stringify(migrated));
      } catch (err) {
        console.warn('Failed to save workflow to localStorage:', err);
      }
    }
  }

  async getWorkflow(id: string): Promise<Workflow | null> {
    if (this.memoryWorkflows.has(id)) {
      return this.memoryWorkflows.get(id)!;
    }

    if (this.isLocalStorageAvailable()) {
      try {
        const item = window.localStorage.getItem(`agentsphere:wf:${id}`);
        if (item) {
          const parsed = JSON.parse(item);
          const migrated = migrateWorkflowSchema(parsed);
          this.memoryWorkflows.set(id, migrated);
          return migrated;
        }
      } catch (err) {
        console.warn('Failed to read workflow from localStorage:', err);
      }
    }

    return null;
  }

  async listWorkflows(): Promise<Workflow[]> {
    if (this.isLocalStorageAvailable()) {
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith('agentsphere:wf:')) {
            const raw = window.localStorage.getItem(key);
            if (raw) {
              const wf = migrateWorkflowSchema(JSON.parse(raw));
              this.memoryWorkflows.set(wf.id, wf);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to list workflows from localStorage:', err);
      }
    }

    return Array.from(this.memoryWorkflows.values());
  }

  async deleteWorkflow(id: string): Promise<void> {
    this.memoryWorkflows.delete(id);
    if (this.isLocalStorageAvailable()) {
      try {
        window.localStorage.removeItem(`agentsphere:wf:${id}`);
      } catch (err) {
        console.warn('Failed to delete workflow from localStorage:', err);
      }
    }
  }

  async saveResult(result: AgentResult): Promise<void> {
    this.memoryResults.set(result.id, result);
    if (this.isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(`agentsphere:res:${result.id}`, JSON.stringify(result));
      } catch (err) {
        console.warn('Failed to save result to localStorage:', err);
      }
    }
  }

  async getResult(id: string): Promise<AgentResult | null> {
    if (this.memoryResults.has(id)) {
      return this.memoryResults.get(id)!;
    }
    if (this.isLocalStorageAvailable()) {
      try {
        const item = window.localStorage.getItem(`agentsphere:res:${id}`);
        if (item) {
          return JSON.parse(item) as AgentResult;
        }
      } catch (err) {
        console.warn('Failed to read result from localStorage:', err);
      }
    }
    return null;
  }

  async saveRun(run: WorkflowRun): Promise<void> {
    this.memoryRuns.set(run.id, run);
    if (this.isLocalStorageAvailable()) {
      try {
        window.localStorage.setItem(`agentsphere:run:${run.id}`, JSON.stringify(run));
      } catch (err) {
        console.warn('Failed to save run to localStorage:', err);
      }
    }
  }

  async getRun(id: string): Promise<WorkflowRun | null> {
    if (this.memoryRuns.has(id)) {
      return this.memoryRuns.get(id)!;
    }
    if (this.isLocalStorageAvailable()) {
      try {
        const item = window.localStorage.getItem(`agentsphere:run:${id}`);
        if (item) {
          return JSON.parse(item) as WorkflowRun;
        }
      } catch (err) {
        console.warn('Failed to read run from localStorage:', err);
      }
    }
    return null;
  }
}

export const workflowStorage = new LocalStorageAdapter();
