/**
 * Core domain types and schemas for AgentSphere workflow orchestration.
 * Completely independent of Three.js/rendering.
 */

export type AgentRole = 'planner' | 'researcher' | 'executor' | 'reviewer';

export type AgentStatus =
  | 'idle'
  | 'ready'
  | 'running'
  | 'waiting_approval'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface WorkflowNode {
  id: string;
  role: AgentRole;
  label: string;
  position: [number, number, number];
  configuration: Record<string, unknown>;
  status: AgentStatus;
  outputReference?: string;
}

export interface WorkflowEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
}

export type WorkflowStatus = 'draft' | 'running' | 'paused' | 'completed' | 'failed';

export interface Workflow {
  schemaVersion: number;
  id: string;
  title: string;
  mission: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AgentResult {
  id: string;
  nodeId: string;
  summary: string;
  structuredOutput: Record<string, unknown>;
  evidenceReferences: string[];
  warnings: string[];
  executionMode: 'mock' | 'live';
  timestamps: {
    startedAt: string;
    completedAt: string;
  };
}

export interface NodeExecutionState {
  nodeId: string;
  status: AgentStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  resultId?: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  executionStatus: WorkflowStatus;
  nodeExecutions: Record<string, NodeExecutionState>;
  currentNodeId?: string;
  error?: string;
  timestamps: {
    startedAt: string;
    completedAt?: string;
  };
}

export const CURRENT_WORKFLOW_SCHEMA_VERSION = 1;
