import { describe, it, expect, beforeEach } from 'vitest';
import { WorkflowStore } from '../workflows/workflow-store.js';
import { validateWorkflowGraph } from '../workflows/graph-validator.js';
import { LocalStorageAdapter, migrateWorkflowSchema } from '../workflows/storage.js';
import { SEED_AI_INCIDENT_WORKFLOW } from '../workflows/seed-workflow.js';
import type { Workflow } from '../workflows/domain-types.js';

describe('Phase 3: Workflow Domain Models & State Store', () => {
  let store: WorkflowStore;
  let storage: LocalStorageAdapter;

  beforeEach(() => {
    storage = new LocalStorageAdapter();
    store = new WorkflowStore(undefined, storage);
  });

  describe('1. CRUD Operations', () => {
    it('initializes with the seed AI incident workflow', () => {
      const wf = store.getWorkflow();
      expect(wf.id).toBe('wf-ai-incident-command');
      expect(wf.nodes.length).toBe(4);
      expect(wf.edges.length).toBe(3);
    });

    it('creates a fresh new workflow', () => {
      const wf = store.createWorkflow('New Mission', 'Custom goal');
      expect(wf.title).toBe('New Mission');
      expect(wf.nodes).toHaveLength(0);
      expect(wf.edges).toHaveLength(0);
    });

    it('adds and moves a node', () => {
      const node = store.addNode('planner', 'Strategy Agent', [0, 1, 0]);
      expect(node.role).toBe('planner');
      expect(node.position).toEqual([0, 1, 0]);

      const moved = store.moveNode(node.id, [1, 2, 3]);
      expect(moved).toBe(true);
      expect(store.getWorkflow().nodes.find((n) => n.id === node.id)?.position).toEqual([1, 2, 3]);
    });

    it('removes a node and cascades associated edge removals', () => {
      const n1 = store.addNode('planner', 'P1', [0, 0, 0]);
      const n2 = store.addNode('researcher', 'R1', [1, 0, 0]);
      store.connectNodes(n1.id, n2.id);

      expect(store.getWorkflow().edges.some((e) => e.sourceNodeId === n1.id)).toBe(true);

      const removed = store.removeNode(n1.id);
      expect(removed).toBe(true);
      expect(store.getWorkflow().nodes.some((n) => n.id === n1.id)).toBe(false);
      expect(store.getWorkflow().edges.some((e) => e.sourceNodeId === n1.id)).toBe(false);
    });

    it('connects and disconnects nodes cleanly', () => {
      store.createWorkflow('Empty', 'Empty');
      const n1 = store.addNode('planner', 'P1', [0, 0, 0]);
      const n2 = store.addNode('researcher', 'R1', [1, 0, 0]);

      const connectResult = store.connectNodes(n1.id, n2.id);
      expect(connectResult.success).toBe(true);
      expect(store.getWorkflow().edges).toHaveLength(1);

      const disconnected = store.disconnectNodes(n1.id, n2.id);
      expect(disconnected).toBe(true);
      expect(store.getWorkflow().edges).toHaveLength(0);
    });
  });

  describe('2. Graph Validation & Constraint Safety', () => {
    it('detects and forbids self-links', () => {
      const n1 = store.addNode('planner', 'P1', [0, 0, 0]);
      const res = store.connectNodes(n1.id, n1.id);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Self-connections are forbidden/);
    });

    it('detects and forbids duplicate edges', () => {
      const n1 = store.addNode('planner', 'P1', [0, 0, 0]);
      const n2 = store.addNode('researcher', 'R1', [1, 0, 0]);

      store.connectNodes(n1.id, n2.id);
      const res2 = store.connectNodes(n1.id, n2.id);
      expect(res2.success).toBe(false);
      expect(res2.error).toMatch(/already connected/);
    });

    it('detects and forbids cycles (A -> B -> C -> A)', () => {
      const n1 = store.addNode('planner', 'P1', [0, 0, 0]);
      const n2 = store.addNode('researcher', 'R1', [1, 0, 0]);
      const n3 = store.addNode('executor', 'E1', [2, 0, 0]);

      store.connectNodes(n1.id, n2.id);
      store.connectNodes(n2.id, n3.id);

      // Attempting to close the loop: N3 -> N1 should fail
      const cycleAttempt = store.connectNodes(n3.id, n1.id);
      expect(cycleAttempt.success).toBe(false);
      expect(cycleAttempt.error).toMatch(/Cycle detected/);
    });

    it('validates seed workflow as a valid DAG', () => {
      const validation = validateWorkflowGraph(SEED_AI_INCIDENT_WORKFLOW);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('3. Undo / Redo Mechanism', () => {
    it('supports step-by-step undo and redo of graph modifications', () => {
      store.createWorkflow('Empty', 'Empty');
      expect(store.getWorkflow().nodes).toHaveLength(0);

      store.addNode('planner', 'P1', [0, 0, 0]);
      expect(store.getWorkflow().nodes).toHaveLength(1);

      store.addNode('researcher', 'R1', [1, 0, 0]);
      expect(store.getWorkflow().nodes).toHaveLength(2);

      // Undo adding R1
      expect(store.canUndo()).toBe(true);
      store.undo();
      expect(store.getWorkflow().nodes).toHaveLength(1);
      expect(store.getWorkflow().nodes[0].role).toBe('planner');

      // Undo adding P1
      store.undo();
      expect(store.getWorkflow().nodes).toHaveLength(0);

      // Redo adding P1
      expect(store.canRedo()).toBe(true);
      store.redo();
      expect(store.getWorkflow().nodes).toHaveLength(1);
      expect(store.getWorkflow().nodes[0].role).toBe('planner');
    });
  });

  describe('4. Persistence & Schema Migration', () => {
    it('migrates legacy schema version 0 to version 1', () => {
      const legacyRaw = {
        id: 'legacy-wf',
        title: 'Legacy',
        mission: 'Old mission',
        nodes: [],
      };

      const migrated = migrateWorkflowSchema(legacyRaw);
      expect(migrated.schemaVersion).toBe(1);
      expect(migrated.status).toBe('draft');
      expect(migrated.edges).toEqual([]);
      expect(migrated.createdAt).toBeDefined();
    });

    it('persists and restores workflows from storage', async () => {
      const customWf: Workflow = {
        schemaVersion: 1,
        id: 'persisted-wf-001',
        title: 'Persisted Launch',
        mission: 'Testing persistence',
        nodes: [
          {
            id: 'n1',
            role: 'planner',
            label: 'Plan',
            position: [0, 1, 0],
            configuration: {},
            status: 'ready',
          },
        ],
        edges: [],
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await storage.saveWorkflow(customWf);
      const retrieved = await storage.getWorkflow('persisted-wf-001');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.title).toBe('Persisted Launch');
      expect(retrieved?.nodes).toHaveLength(1);
    });
  });
});
