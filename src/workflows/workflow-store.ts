/**
 * Central Workflow State Store.
 * Provides complete CRUD operations, undo/redo history stack, and validation gates.
 */

import {
  CURRENT_WORKFLOW_SCHEMA_VERSION,
  type AgentResult,
  type AgentRole,
  type AgentStatus,
  type Workflow,
  type WorkflowEdge,
  type WorkflowNode,
  type WorkflowRun,
} from './domain-types.js';
import { validateWorkflowGraph, type GraphValidationResult } from './graph-validator.js';
import { SEED_SAAS_LAUNCH_WORKFLOW } from './seed-workflow.js';
import { workflowStorage, type StorageAdapter } from './storage.js';

export type WorkflowStoreListener = (workflow: Readonly<Workflow>) => void;

export class WorkflowStore {
  private currentWorkflow: Workflow;
  private undoStack: Workflow[] = [];
  private redoStack: Workflow[] = [];
  private maxHistorySize = 30;
  private listeners = new Set<WorkflowStoreListener>();
  private storage: StorageAdapter;

  constructor(initialWorkflow?: Workflow, storageAdapter: StorageAdapter = workflowStorage) {
    this.storage = storageAdapter;
    this.currentWorkflow = initialWorkflow
      ? JSON.parse(JSON.stringify(initialWorkflow))
      : JSON.parse(JSON.stringify(SEED_SAAS_LAUNCH_WORKFLOW));
  }

  getWorkflow(): Readonly<Workflow> {
    return this.currentWorkflow;
  }

  private saveHistorySnapshot(): void {
    this.undoStack.push(JSON.parse(JSON.stringify(this.currentWorkflow)));
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo stack on new action
  }

  private notify(): void {
    this.currentWorkflow.updatedAt = new Date().toISOString();
    for (const listener of this.listeners) {
      try {
        listener(this.currentWorkflow);
      } catch (err) {
        console.error('Workflow store listener error:', err);
      }
    }
  }

  subscribe(listener: WorkflowStoreListener): () => void {
    this.listeners.add(listener);
    listener(this.currentWorkflow);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Undo / Redo
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): boolean {
    if (!this.canUndo()) return false;
    this.redoStack.push(JSON.parse(JSON.stringify(this.currentWorkflow)));
    this.currentWorkflow = this.undoStack.pop()!;
    this.notify();
    return true;
  }

  redo(): boolean {
    if (!this.canRedo()) return false;
    this.undoStack.push(JSON.parse(JSON.stringify(this.currentWorkflow)));
    this.currentWorkflow = this.redoStack.pop()!;
    this.notify();
    return true;
  }

  // Commands
  createWorkflow(title: string, mission: string): Workflow {
    this.saveHistorySnapshot();
    const newWorkflow: Workflow = {
      schemaVersion: CURRENT_WORKFLOW_SCHEMA_VERSION,
      id: `wf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title,
      mission,
      nodes: [],
      edges: [],
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.currentWorkflow = newWorkflow;
    this.notify();
    return this.currentWorkflow;
  }

  updateMission(title: string, mission: string): void {
    this.saveHistorySnapshot();
    this.currentWorkflow.title = title;
    this.currentWorkflow.mission = mission;
    this.notify();
  }

  addNode(role: AgentRole, label: string, position: [number, number, number], config: Record<string, unknown> = {}): WorkflowNode {
    this.saveHistorySnapshot();
    const id = `node-${role}-${Date.now().toString(36)}`;
    const newNode: WorkflowNode = {
      id,
      role,
      label,
      position,
      configuration: config,
      status: 'ready',
    };
    this.currentWorkflow.nodes.push(newNode);
    this.notify();
    return newNode;
  }

  removeNode(nodeId: string): boolean {
    const exists = this.currentWorkflow.nodes.some((n) => n.id === nodeId);
    if (!exists) return false;

    this.saveHistorySnapshot();
    this.currentWorkflow.nodes = this.currentWorkflow.nodes.filter((n) => n.id !== nodeId);
    // Cascade remove associated edges
    this.currentWorkflow.edges = this.currentWorkflow.edges.filter(
      (e) => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId,
    );
    this.notify();
    return true;
  }

  moveNode(nodeId: string, newPosition: [number, number, number]): boolean {
    const node = this.currentWorkflow.nodes.find((n) => n.id === nodeId);
    if (!node) return false;

    this.saveHistorySnapshot();
    node.position = [...newPosition];
    this.notify();
    return true;
  }

  connectNodes(sourceNodeId: string, targetNodeId: string): { success: boolean; error?: string } {
    if (sourceNodeId === targetNodeId) {
      return { success: false, error: 'Self-connections are forbidden.' };
    }

    const sourceExists = this.currentWorkflow.nodes.some((n) => n.id === sourceNodeId);
    const targetExists = this.currentWorkflow.nodes.some((n) => n.id === targetNodeId);
    if (!sourceExists || !targetExists) {
      return { success: false, error: 'Source or target node not found.' };
    }

    const alreadyConnected = this.currentWorkflow.edges.some(
      (e) => e.sourceNodeId === sourceNodeId && e.targetNodeId === targetNodeId,
    );
    if (alreadyConnected) {
      return { success: false, error: 'Nodes are already connected.' };
    }

    const testEdge: WorkflowEdge = {
      id: `edge-${Date.now().toString(36)}`,
      sourceNodeId,
      targetNodeId,
    };

    // Test cycle creation before committing
    const testWorkflow: Workflow = {
      ...this.currentWorkflow,
      edges: [...this.currentWorkflow.edges, testEdge],
    };

    const validation = validateWorkflowGraph(testWorkflow);
    if (!validation.valid) {
      return { success: false, error: validation.errors[0] };
    }

    this.saveHistorySnapshot();
    this.currentWorkflow.edges.push(testEdge);
    this.notify();
    return { success: true };
  }

  disconnectNodes(sourceNodeId: string, targetNodeId: string): boolean {
    const beforeCount = this.currentWorkflow.edges.length;
    this.saveHistorySnapshot();
    this.currentWorkflow.edges = this.currentWorkflow.edges.filter(
      (e) => !(e.sourceNodeId === sourceNodeId && e.targetNodeId === targetNodeId),
    );
    const changed = this.currentWorkflow.edges.length !== beforeCount;
    if (changed) {
      this.notify();
    } else {
      this.undoStack.pop(); // Revert snapshot if nothing changed
    }
    return changed;
  }

  updateNodeStatus(nodeId: string, status: AgentStatus): boolean {
    const node = this.currentWorkflow.nodes.find((n) => n.id === nodeId);
    if (!node) return false;

    node.status = status;
    this.notify();
    return true;
  }

  duplicateWorkflow(): Workflow {
    this.saveHistorySnapshot();
    const copy: Workflow = {
      ...JSON.parse(JSON.stringify(this.currentWorkflow)),
      id: `wf-${Date.now()}-copy`,
      title: `${this.currentWorkflow.title} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.currentWorkflow = copy;
    this.notify();
    return this.currentWorkflow;
  }

  resetToSeed(): void {
    this.saveHistorySnapshot();
    this.currentWorkflow = JSON.parse(JSON.stringify(SEED_SAAS_LAUNCH_WORKFLOW));
    this.notify();
  }

  validate(): GraphValidationResult {
    return validateWorkflowGraph(this.currentWorkflow);
  }

  // Persistence
  async persistCurrent(): Promise<void> {
    await this.storage.saveWorkflow(this.currentWorkflow);
  }

  async loadFromStorage(workflowId: string): Promise<boolean> {
    const loaded = await this.storage.getWorkflow(workflowId);
    if (!loaded) return false;

    this.saveHistorySnapshot();
    this.currentWorkflow = loaded;
    this.notify();
    return true;
  }
}

export const workflowStore = new WorkflowStore();
