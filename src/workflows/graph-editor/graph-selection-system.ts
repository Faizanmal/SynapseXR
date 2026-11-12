/**
 * GraphSelectionSystem: Coordinates node/edge selection, deletion of selected
 * graph elements, and spatial port-to-port connection linking.
 */

import {
  interactionState,
} from '../../interactions/interaction-state.js';
import {
  selectAgentNode,
  selectWorkflowEdge,
} from '../../interactions/selection-system.js';
import { resolveWorkflowNodeId } from '../../interactions/spatial-input-adapter.js';
import { workflowStore } from '../workflow-store.js';
import { connectionHandle } from './connection-handle.js';

export class GraphSelectionSystem {
  private connectModeEnabled = false;

  isConnectModeEnabled(): boolean {
    return this.connectModeEnabled;
  }

  setConnectMode(enabled: boolean): void {
    this.connectModeEnabled = enabled;
    if (!enabled) {
      connectionHandle.cancelConnection();
    }
  }

  toggleConnectMode(): boolean {
    this.setConnectMode(!this.connectModeEnabled);
    return this.connectModeEnabled;
  }

  /**
   * Handles selecting a node in the graph editor. If `connectMode` is active or a
   * pending connection source exists, routes the tap to `connectionHandle`.
   */
  activateNode(agentOrNodeId: string, nowMs: number = Date.now()): void {
    const pendingSource = interactionState.getState().pendingConnectionSourceId;
    if (this.connectModeEnabled || pendingSource !== null) {
      connectionHandle.handlePortActivation(agentOrNodeId);
      return;
    }
    selectAgentNode(agentOrNodeId, nowMs);
  }

  activateEdge(edgeId: string, nowMs: number = Date.now()): void {
    selectWorkflowEdge(edgeId, nowMs);
  }

  /**
   * Deletes whichever graph element (edge or node) is currently selected.
   */
  deleteSelectedElement(): {
    deletedType: 'edge' | 'node' | null;
    deletedId: string | null;
  } {
    const state = interactionState.getState();

    if (state.selectedEdgeId) {
      const edgeId = state.selectedEdgeId;
      const removed = workflowStore.removeEdge(edgeId);
      if (removed) {
        interactionState.setState({
          selectedEdgeId: null,
          lastActionType: 'delete_edge',
          lastActionSummary: `Deleted workflow connection ${edgeId}`,
        });
        return { deletedType: 'edge', deletedId: edgeId };
      }
    }

    if (state.selectedNodeId) {
      const wfNodeId = resolveWorkflowNodeId(state.selectedNodeId);
      const removed = workflowStore.removeNode(wfNodeId);
      if (removed) {
        interactionState.setState({
          selectedNodeId: null,
          lastActionType: 'delete_node',
          lastActionSummary: `Removed agent node ${wfNodeId}`,
        });
        return { deletedType: 'node', deletedId: wfNodeId };
      }
    }

    return { deletedType: null, deletedId: null };
  }
}

export const graphSelectionSystem = new GraphSelectionSystem();

