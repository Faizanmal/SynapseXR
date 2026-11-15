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
import {
  computeTopologicalExecutionOrder,
  validateWorkflowGraph,
  type GraphValidationResult,
} from './graph-validator.js';
import { SEED_SAAS_LAUNCH_WORKFLOW } from './seed-workflow.js';
import { workflowStorage, type StorageAdapter } from './storage.js';
import {
  templateSelector,
  type WorkflowTemplateId,
} from './template-selector.js';

export type WorkflowStoreListener = (workflow: Readonly<Workflow>) => void;

export class WorkflowStore {
  private currentWorkflow: Workflow;
  private results = new Map<string, AgentResult>();
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

  addNode(
    role: AgentRole,
    label: string,
    position: [number, number, number],
    config: Record<string, unknown> = {},
  ): WorkflowNode {
    this.saveHistorySnapshot();
    const safePos = this.findNonOverlappingPosition(position);
    const id = `node-${role}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`;
    const newNode: WorkflowNode = {
      id,
      role,
      label: label.trim() || `${role.toUpperCase()} Agent`,
      position: safePos,
      configuration: config,
      status: 'ready',
    };
    this.currentWorkflow.nodes.push(newNode);
    this.notify();
    return newNode;
  }

  renameNode(nodeId: string, newLabel: string): boolean {
    const trimmed = newLabel.trim();
    if (!trimmed) return false;
    const node = this.currentWorkflow.nodes.find((n) => n.id === nodeId);
    if (!node) return false;

    this.saveHistorySnapshot();
    node.label = trimmed;
    this.notify();
    return true;
  }

  updateNodeConfig(
    nodeId: string,
    configUpdate: Record<string, unknown>,
  ): boolean {
    const node = this.currentWorkflow.nodes.find((n) => n.id === nodeId);
    if (!node) return false;

    this.saveHistorySnapshot();
    node.configuration = {
      ...node.configuration,
      ...configUpdate,
    };
    this.notify();
    return true;
  }

  private findNonOverlappingPosition(
    desired: [number, number, number],
    minDistance = 0.2,
    excludeNodeId?: string,
  ): [number, number, number] {
    const candidate: [number, number, number] = [...desired];
    let attempts = 0;
    while (attempts < 12) {
      const collision = this.currentWorkflow.nodes.find((n) => {
        if (n.id === excludeNodeId) return false;
        const dx = n.position[0] - candidate[0];
        const dy = n.position[1] - candidate[1];
        const dz = n.position[2] - candidate[2];
        return Math.hypot(dx, dy, dz) < minDistance;
      });
      if (!collision) break;
      // Offset along X/Y within seated workspace envelope
      const step = (attempts + 1) * 0.11 * (attempts % 2 === 0 ? 1 : -1);
      candidate[0] = Math.max(-0.95, Math.min(0.95, desired[0] + step));
      candidate[1] = Math.max(
        0.95,
        Math.min(1.52, desired[1] + ((attempts % 3) - 1) * 0.06),
      );
      attempts++;
    }
    return [
      Math.round(candidate[0] * 1000) / 1000,
      Math.round(candidate[1] * 1000) / 1000,
      Math.round(candidate[2] * 1000) / 1000,
    ];
  }

  resolveOverlappingNodes(minDistance = 0.2): number {
    let adjusted = 0;
    for (const node of this.currentWorkflow.nodes) {
      const safe = this.findNonOverlappingPosition(
        node.position,
        minDistance,
        node.id,
      );
      if (
        safe[0] !== node.position[0] ||
        safe[1] !== node.position[1] ||
        safe[2] !== node.position[2]
      ) {
        node.position = safe;
        adjusted++;
      }
    }
    if (adjusted > 0) {
      this.notify();
    }
    return adjusted;
  }

  autoLayout(): Workflow {
    const count = this.currentWorkflow.nodes.length;
    if (count === 0) return this.currentWorkflow;

    this.saveHistorySnapshot();
    const topo = computeTopologicalExecutionOrder(this.currentWorkflow);
    const orderedIds =
      topo.executionOrder.length === count
        ? topo.executionOrder
        : this.currentWorkflow.nodes.map((n) => n.id);

    orderedIds.forEach((nodeId, idx) => {
      const node = this.currentWorkflow.nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const t = count === 1 ? 0.5 : idx / (count - 1);
      // Seated ergonomic semicircle in front of the operator
      const angle = (t - 0.5) * 1.15; // radians (-0.575 to +0.575)
      const radius = 0.88;
      const x = Math.round(Math.sin(angle) * radius * 1000) / 1000;
      const z = Math.round(-Math.cos(angle) * radius * 1000) / 1000;
      const y =
        Math.round((1.15 + Math.cos((t - 0.5) * Math.PI) * 0.1) * 1000) / 1000;
      node.position = [x, y, z];
    });

    this.notify();
    return this.currentWorkflow;
  }

  loadTemplate(templateId: WorkflowTemplateId): Workflow {
    this.saveHistorySnapshot();
    this.currentWorkflow = templateSelector.instantiateTemplate(templateId);
    this.results.clear();
    this.notify();
    return this.currentWorkflow;
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

  removeEdge(edgeId: string): boolean {
    const beforeCount = this.currentWorkflow.edges.length;
    this.saveHistorySnapshot();
    this.currentWorkflow.edges = this.currentWorkflow.edges.filter(
      (e) => e.id !== edgeId,
    );
    const changed = this.currentWorkflow.edges.length !== beforeCount;
    if (changed) {
      this.notify();
    } else {
      this.undoStack.pop();
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
    this.results.clear();
    this.notify();
  }

  resetWorkflow(): void {
    this.resetToSeed();
  }

  saveExecutionResult(result: AgentResult): void {
    this.results.set(result.id, result);
    void this.storage.saveResult(result);
    const node = this.currentWorkflow.nodes.find((n) => n.id === result.nodeId);
    if (node) {
      node.outputReference = result.id;
      this.notify();
    }
  }

  getExecutionResult(resultId: string): AgentResult | undefined {
    return this.results.get(resultId);
  }

  getAllExecutionResults(): Record<string, AgentResult> {
    const map: Record<string, AgentResult> = {};
    for (const [id, res] of this.results.entries()) {
      map[id] = res;
    }
    return map;
  }

  approveResult(nodeId: string): boolean {
    const node = this.currentWorkflow.nodes.find((n) => n.id === nodeId);
    if (!node) return false;
    node.status = 'completed';
    const result = node.outputReference ? this.results.get(node.outputReference) : undefined;
    if (result) {
      result.structuredOutput = { ...result.structuredOutput, operatorDecision: 'approved' };
    }
    this.notify();
    return true;
  }

  rejectResult(nodeId: string, reason?: string): boolean {
    const node = this.currentWorkflow.nodes.find((n) => n.id === nodeId);
    if (!node) return false;
    node.status = 'failed';
    const result = node.outputReference ? this.results.get(node.outputReference) : undefined;
    if (result) {
      result.summary = `REJECTED BY OPERATOR: ${reason || 'No reason provided.'} ${result.summary}`;
      result.structuredOutput = {
        ...result.structuredOutput,
        operatorDecision: 'rejected',
        rejectionReason: reason || 'No reason provided.',
      };
    }
    this.notify();
    return true;
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

    // Restore results for loaded workflow nodes
    for (const node of loaded.nodes) {
      if (node.outputReference) {
        const res = await this.storage.getResult(node.outputReference);
        if (res) {
          this.results.set(res.id, res);
        }
      }
    }

    this.notify();
    return true;
  }

  async restoreLatestFromStorage(): Promise<boolean> {
    const all = await this.storage.listWorkflows();
    if (all.length === 0) return false;
    const sorted = [...all].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
    const latest = sorted[0];
    if (!latest) return false;
    this.saveHistorySnapshot();
    this.currentWorkflow = JSON.parse(JSON.stringify(latest));

    // Restore results for latest workflow nodes
    for (const node of this.currentWorkflow.nodes) {
      if (node.outputReference) {
        const res = await this.storage.getResult(node.outputReference);
        if (res) {
          this.results.set(res.id, res);
        }
      }
    }

    this.notify();
    return true;
  }
}

export const workflowStore = new WorkflowStore();

