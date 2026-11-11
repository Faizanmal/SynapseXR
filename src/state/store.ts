/**
 * Reactive application state store for AgentSphere.
 */

export type AgentRole = 'planner' | 'researcher' | 'executor' | 'reviewer';
export type AgentState = 'idle' | 'working' | 'waiting_approval' | 'completed' | 'error';

export interface AgentData {
  id: string;
  role: AgentRole;
  title: string;
  state: AgentState;
  progress: number;
  statusMessage: string;
  position: [number, number, number];
  logs: string[];
  outputData: unknown | null;
}

export interface WorkflowConnection {
  id: string;
  sourceId: string;
  targetId: string;
  active: boolean;
}

export interface AppState {
  isXrActive: boolean;
  activeMissionId: string | null;
  activeMissionTitle: string;
  isExecuting: boolean;
  selectedAgentId: string | null;
  inspectorOpen: boolean;
  approvalRequired: boolean;
  pendingApprovalAction: string | null;
  agents: Record<string, AgentData>;
  connections: WorkflowConnection[];
}

export type StateListener = (state: Readonly<AppState>) => void;

class StateStore {
  private state: AppState = {
    isXrActive: false,
    activeMissionId: 'mission-001',
    activeMissionTitle: 'Autonomous Market Research & Executive Brief',
    isExecuting: false,
    selectedAgentId: null,
    inspectorOpen: false,
    approvalRequired: false,
    pendingApprovalAction: null,
    agents: {
      'agent-planner': {
        id: 'agent-planner',
        role: 'planner',
        title: 'Planner (Architect)',
        state: 'idle',
        progress: 0,
        statusMessage: 'Ready for mission prompt',
        position: [-0.45, 1.15, -0.75],
        logs: [],
        outputData: null,
      },
      'agent-researcher': {
        id: 'agent-researcher',
        role: 'researcher',
        title: 'Researcher (Intelligence)',
        state: 'idle',
        progress: 0,
        statusMessage: 'Standby for research query',
        position: [-0.15, 1.25, -0.85],
        logs: [],
        outputData: null,
      },
      'agent-executor': {
        id: 'agent-executor',
        role: 'executor',
        title: 'Executor (Synthesis)',
        state: 'idle',
        progress: 0,
        statusMessage: 'Standby for task payload',
        position: [0.15, 1.25, -0.85],
        logs: [],
        outputData: null,
      },
      'agent-reviewer': {
        id: 'agent-reviewer',
        role: 'reviewer',
        title: 'Reviewer (Governance)',
        state: 'idle',
        progress: 0,
        statusMessage: 'Ready for quality audit',
        position: [0.45, 1.15, -0.75],
        logs: [],
        outputData: null,
      },
    },
    connections: [
      { id: 'c1', sourceId: 'agent-planner', targetId: 'agent-researcher', active: false },
      { id: 'c2', sourceId: 'agent-researcher', targetId: 'agent-executor', active: false },
      { id: 'c3', sourceId: 'agent-executor', targetId: 'agent-reviewer', active: false },
    ],
  };

  private listeners = new Set<StateListener>();

  getState(): Readonly<AppState> {
    return this.state;
  }

  setState(partial: Partial<AppState> | ((prev: AppState) => Partial<AppState>)): void {
    const next = typeof partial === 'function' ? partial(this.state) : partial;
    this.state = {
      ...this.state,
      ...next,
    };
    this.notify();
  }

  updateAgent(agentId: string, update: Partial<AgentData>): void {
    if (!this.state.agents[agentId]) return;
    this.state.agents[agentId] = {
      ...this.state.agents[agentId],
      ...update,
    };
    this.notify();
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener(this.state);
      } catch (err) {
        console.error('State listener error:', err);
      }
    }
  }
}

export const store = new StateStore();

