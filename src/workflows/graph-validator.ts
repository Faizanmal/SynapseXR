/**
 * Directed Acyclic Graph (DAG) validation and topological execution ordering
 * for spatial workflow networks.
 *
 * Uses O(V + E) 3-color DFS for cycle reporting and Kahn's in-degree queue
 * algorithm for deterministic topological execution order.
 */

import type { Workflow, WorkflowNode } from './domain-types.js';

export interface GraphValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  executionOrder: string[];
  missingInputs: string[];
}

/**
 * Computes deterministic topological execution order using Kahn's algorithm O(V + E).
 * Returns ordered node IDs if acyclic, or partial list if a cycle exists.
 */
export function computeTopologicalExecutionOrder(workflow: Workflow): {
  acyclic: boolean;
  executionOrder: string[];
} {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const node of workflow.nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }

  const seenEdges = new Set<string>();
  for (const edge of workflow.edges) {
    const key = `${edge.sourceNodeId}->${edge.targetNodeId}`;
    if (seenEdges.has(key)) continue;
    if (!inDegree.has(edge.sourceNodeId) || !inDegree.has(edge.targetNodeId)) {
      continue;
    }
    seenEdges.add(key);
    adj.get(edge.sourceNodeId)!.push(edge.targetNodeId);
    inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [nodeId, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(nodeId);
    }
  }

  const executionOrder: string[] = [];
  let head = 0;
  while (head < queue.length) {
    const current = queue[head++]!;
    executionOrder.push(current);
    const neighbors = adj.get(current) ?? [];
    for (const next of neighbors) {
      const nextDeg = (inDegree.get(next) ?? 1) - 1;
      inDegree.set(next, nextDeg);
      if (nextDeg === 0) {
        queue.push(next);
      }
    }
  }

  return {
    acyclic: executionOrder.length === inDegree.size,
    executionOrder,
  };
}

export function validateWorkflowGraph(
  workflow: Workflow,
  options: { requireConnectedPipeline?: boolean } = {},
): GraphValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingInputs: string[] = [];

  if (workflow.nodes.length === 0 && options.requireConnectedPipeline) {
    errors.push('Workflow must contain at least one agent node before execution.');
  }

  const nodeMap = new Map<string, WorkflowNode>();
  for (const node of workflow.nodes) {
    if (!node.label || node.label.trim().length === 0) {
      errors.push(`Node "${node.id}" is missing a valid label.`);
    }
    if (nodeMap.has(node.id)) {
      errors.push(`Duplicate node ID detected: "${node.id}".`);
    } else {
      nodeMap.set(node.id, node);
    }
  }

  const edgeSet = new Set<string>();
  const adjacencyList = new Map<string, string[]>();
  const incomingCount = new Map<string, number>();
  for (const node of workflow.nodes) {
    adjacencyList.set(node.id, []);
    incomingCount.set(node.id, 0);
  }

  for (const edge of workflow.edges) {
    if (edge.sourceNodeId === edge.targetNodeId) {
      errors.push(
        `Self-link forbidden: Edge "${edge.id}" connects node "${edge.sourceNodeId}" to itself.`,
      );
      continue;
    }

    if (!nodeMap.has(edge.sourceNodeId)) {
      errors.push(
        `Invalid edge "${edge.id}": Source node "${edge.sourceNodeId}" does not exist.`,
      );
    }

    if (!nodeMap.has(edge.targetNodeId)) {
      errors.push(
        `Invalid edge "${edge.id}": Target node "${edge.targetNodeId}" does not exist.`,
      );
    }

    const edgeKey = `${edge.sourceNodeId}->${edge.targetNodeId}`;
    if (edgeSet.has(edgeKey)) {
      errors.push(
        `Duplicate edge detected between "${edge.sourceNodeId}" and "${edge.targetNodeId}".`,
      );
    } else {
      edgeSet.add(edgeKey);
      if (adjacencyList.has(edge.sourceNodeId)) {
        adjacencyList.get(edge.sourceNodeId)!.push(edge.targetNodeId);
      }
      if (incomingCount.has(edge.targetNodeId)) {
        incomingCount.set(
          edge.targetNodeId,
          (incomingCount.get(edge.targetNodeId) ?? 0) + 1,
        );
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
        errors.push(
          `Cycle detected in workflow graph: ${[...path, neighbor].join(' -> ')}`,
        );
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

  // Detect isolated nodes and downstream roles (executor / reviewer) missing required inputs
  if (workflow.nodes.length > 1) {
    const connectedNodes = new Set<string>();
    for (const edge of workflow.edges) {
      connectedNodes.add(edge.sourceNodeId);
      connectedNodes.add(edge.targetNodeId);
    }
    for (const node of workflow.nodes) {
      if (!connectedNodes.has(node.id)) {
        const msg = `Node "${node.label}" (${node.id}) is isolated and has no connections.`;
        warnings.push(msg);
        if (options.requireConnectedPipeline) {
          errors.push(msg);
        }
      }
      const inDeg = incomingCount.get(node.id) ?? 0;
      if ((node.role === 'executor' || node.role === 'reviewer') && inDeg === 0) {
        const missingMsg = `Missing required input: "${node.label}" (${node.role}) requires at least one upstream connection.`;
        missingInputs.push(node.id);
        warnings.push(missingMsg);
        if (options.requireConnectedPipeline) {
          errors.push(missingMsg);
        }
      }
    }
  }

  const topo = computeTopologicalExecutionOrder(workflow);

  return {
    valid: errors.length === 0 && topo.acyclic,
    errors,
    warnings,
    executionOrder: topo.executionOrder,
    missingInputs,
  };
}
