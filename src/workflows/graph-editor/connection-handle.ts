/**
 * ConnectionHandle: Manages spatial port-to-port workflow connections.
 *
 * Allows users to:
 * 1. Start a connection from a source node's output handle (`startConnection(sourceNodeId)`)
 * 2. Complete the connection on a target node's input handle (`completeConnection(targetNodeId)`)
 * 3. Cancel an in-progress connection (`cancelConnection()`)
 *
 * All connections mutate `workflowStore` directly and enforce DAG validation
 * (no cycles, no self-links, no duplicate edges).
 */

import {
  interactionState,
} from '../../interactions/interaction-state.js';
import { resolveWorkflowNodeId } from '../../interactions/spatial-input-adapter.js';
import { logger } from '../../core/logger.js';
import { workflowStore } from '../workflow-store.js';

export interface ConnectionAttemptResult {
  success: boolean;
  edgeCreated: boolean;
  sourceNodeId?: string;
  targetNodeId?: string;
  error?: string;
}

export class ConnectionHandle {
  startConnection(sourceAgentOrNodeId: string): string {
    const sourceNodeId = resolveWorkflowNodeId(sourceAgentOrNodeId);
    interactionState.setState({
      pendingConnectionSourceId: sourceNodeId,
      lastActionType: 'connection_start',
      lastActionSummary: `Started spatial connection from ${sourceNodeId}`,
    });
    logger.info(
      'ConnectionHandle',
      `Pending spatial connection started from ${sourceNodeId}`,
    );
    return sourceNodeId;
  }

  cancelConnection(): void {
    interactionState.setState({
      pendingConnectionSourceId: null,
      lastActionType: 'connection_cancel',
      lastActionSummary: 'Cancelled pending spatial connection',
    });
  }

  completeConnection(targetAgentOrNodeId: string): ConnectionAttemptResult {
    const sourceNodeId = interactionState.getState().pendingConnectionSourceId;
    const targetNodeId = resolveWorkflowNodeId(targetAgentOrNodeId);

    if (!sourceNodeId) {
      return {
        success: false,
        edgeCreated: false,
        error: 'No pending source node selected for connection.',
      };
    }

    const result = workflowStore.connectNodes(sourceNodeId, targetNodeId);
    interactionState.setState({
      pendingConnectionSourceId: null,
      lastActionType: result.success ? 'connection_complete' : 'connection_error',
      lastActionSummary: result.success
        ? `Connected ${sourceNodeId} -> ${targetNodeId}`
        : `Connection rejected: ${result.error}`,
    });

    if (result.success) {
      logger.info(
        'ConnectionHandle',
        `Created workflow connection ${sourceNodeId} -> ${targetNodeId}`,
      );
      return {
        success: true,
        edgeCreated: true,
        sourceNodeId,
        targetNodeId,
      };
    }

    logger.warn(
      'ConnectionHandle',
      `Rejected connection ${sourceNodeId} -> ${targetNodeId}: ${result.error}`,
    );
    return {
      success: false,
      edgeCreated: false,
      sourceNodeId,
      targetNodeId,
      error: result.error,
    };
  }

  /**
   * One-step convenience helper for two-node tap-to-connect:
   * First invocation starts the connection from `nodeId`; second invocation on a
   * different node completes the connection `pendingSource -> nodeId`.
   */
  handlePortActivation(agentOrNodeId: string): ConnectionAttemptResult {
    const pending = interactionState.getState().pendingConnectionSourceId;
    const resolved = resolveWorkflowNodeId(agentOrNodeId);

    if (!pending) {
      this.startConnection(resolved);
      return {
        success: true,
        edgeCreated: false,
        sourceNodeId: resolved,
      };
    }

    if (pending === resolved) {
      this.cancelConnection();
      return {
        success: true,
        edgeCreated: false,
        sourceNodeId: resolved,
      };
    }

    return this.completeConnection(resolved);
  }
}

export const connectionHandle = new ConnectionHandle();

