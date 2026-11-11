/**
 * Type-safe, decoupling event bus for cross-module spatial and workflow communication.
 */

export type EventHandler<T = unknown> = (payload: T) => void;

export class TypedEventBus<EventMap extends object> {
  private handlers = new Map<keyof EventMap, Set<EventHandler<any>>>();

  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {

    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const eventHandlers = this.handlers.get(event)!;
    eventHandlers.add(handler);

    return () => {
      eventHandlers.delete(handler);
      if (eventHandlers.size === 0) {
        this.handlers.delete(event);
      }
    };
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      for (const handler of eventHandlers) {
        try {
          handler(payload);
        } catch (err) {
          console.error(`Error in event handler for "${String(event)}":`, err);
        }
      }
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

/**
 * Global application event map defining all system-wide reactive channels.
 */
export interface AgentSphereEvents {
  // XR & Interaction Events
  'xr:session_start': { mode: string };
  'xr:session_end': void;
  'agent:grabbed': { agentId: string; hand: 'left' | 'right' };
  'agent:released': { agentId: string; position: [number, number, number] };
  'agent:selected': { agentId: string };
  'connector:connected': { sourceId: string; targetId: string };
  'connector:disconnected': { sourceId: string; targetId: string };

  // Workflow & Execution Events
  'workflow:start': { workflowId: string; missionTitle: string };
  'workflow:step_progress': {
    agentId: string;
    stage: string;
    progress: number;
    message: string;
  };
  'workflow:step_complete': {
    agentId: string;
    output: unknown;
  };
  'workflow:paused_for_approval': {
    agentId: string;
    actionSummary: string;
    proposal: string;
  };
  'workflow:approved': { agentId: string; feedback?: string };
  'workflow:rejected': { agentId: string; reason: string };
  'workflow:complete': { workflowId: string; finalOutput: string };
  'workflow:error': { agentId?: string; error: string };

  // UI Events
  'ui:notification': { message: string; type: 'info' | 'success' | 'warn' | 'error' };
  'ui:toggle_inspector': { agentId: string; visible: boolean };
}

export const eventBus = new TypedEventBus<AgentSphereEvents>();
