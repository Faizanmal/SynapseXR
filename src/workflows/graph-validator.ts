/**
 * Directed Acyclic Graph (DAG) validation for spatial workflow networks.
 */

import type { Workflow, WorkflowEdge, WorkflowNode } from './domain-types.js';

export interface GraphValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateWorkflowGraph(workflow: Workflow): GraphValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const nodeMap = new Map<string, WorkflowNode>();
  for (const node of workflow.nodes) {
    if (nodeMap.has(node.id)) {
      errors.push(`Duplicate node ID detected: "${node.id}".`);
    } else {
      nodeMap.set(node.id, node);
    }
  }

  const edgeSet = new Set<string>();
  const adjacencyList = new Map<string, string[]>();
  for (const node of workflow.nodes) {
    adjacencyList.set(node.id, []);
  }

  for (const edge of workflow.edges) {
    if (edge.sourceNodeId === edge.targetNodeId) {
      errors.push(`Self-link forbidden: Edge "${edge.id}" connects node "${edge.sourceNodeId}" to itself.`);
      continue;
    }

    if (!nodeMap.has(edge.sourceNodeId)) {
      errors.push(`Invalid edge "${edge.id}": Source node "${edge.sourceNodeId}" does not exist.`);
    }

    if (!nodeMap.has(edge.targetNodeId)) {
      errors.push(`Invalid edge "${edge.id}": Target node "${edge.targetNodeId}" does not exist.`);
    }

    const edgeKey = `${edge.sourceNodeId}->${edge.targetNodeId}`;
    if (edgeSet.has(edgeKey)) {
      errors.push(`Duplicate edge detected between "${edge.sourceNodeId}" and "${edge.targetNodeId}".`);
    } else {
      edgeSet.add(edgeKey);
      if (adjacencyList.has(edge.sourceNodeId)) {
        adjacencyList.get(edge.sourceNodeId)!.push(edge.targetNodeId);
      }
    }
  }

  // Cycle detection via Depth-First Search with 3-color marking
  // 0 = unvisited, 1 = visiting (in recursion stack), 2 = visited
  const visitState = new Map<string, number>();
  for (const nodeId of nodeMap.keys()) {
    visitState.set(nodeId, 0);
  }

  function hasCycle(nodeId: string, path: string[]): boolean {
    visitState.set(nodeId, 1);
    path.push(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      const state = visitState.get(neighbor) || 0;
      if (state === 1) {
        errors.push(`Cycle detected in workflow graph: ${[...path, neighbor].join(' -> ')}`);
        return true;
      }
      if (state === 0 && hasCycle(neighbor, path)) {
        return true;
      }
    }

    path.pop();
    visitState.set(nodeId, 2);
    return false;
  }

  for (const nodeId of nodeMap.keys()) {
    if ((visitState.get(nodeId) || 0) === 0) {
      hasCycle(nodeId, []);
    }
  }

  // Check for disconnected nodes as a friendly warning
  if (workflow.nodes.length > 1) {
    const connectedNodes = new Set<string>();
    for (const edge of workflow.edges) {
      connectedNodes.add(edge.sourceNodeId);
      connectedNodes.add(edge.targetNodeId);
    }
    for (const node of workflow.nodes) {
      if (!connectedNodes.has(node.id)) {
        warnings.push(`Node "${node.label}" (${node.id}) is isolated and has no connections.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

