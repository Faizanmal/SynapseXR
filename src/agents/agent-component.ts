/**
 * AgentSphere ECS components for 3D agents, spatial buttons, workflow edges,
 * results inspector panel, and the AI companion guide.
 */

import { createComponent } from '@iwsdk/core';

export const AgentNodeComponent = createComponent('AgentNodeComponent', {
  role: { type: 'String', default: 'planner' },
  agentId: { type: 'String', default: 'agent-planner' },
  status: { type: 'String', default: 'idle' },
  baseY: { type: 'Float32', default: 1.15 },
  isSelected: { type: 'Boolean', default: false },
  isHovered: { type: 'Boolean', default: false },
});

export const CompanionDroneComponent = createComponent('CompanionDroneComponent', {
  baseY: { type: 'Float32', default: 1.38 },
  mood: { type: 'String', default: 'ready' },
});

export const SpatialActionButtonComponent = createComponent(
  'SpatialActionButtonComponent',
  {
    action: { type: 'String', default: 'start_run' },
    label: { type: 'String', default: 'Start Run' },
    cooldownMs: { type: 'Float32', default: 350 },
    baseY: { type: 'Float32', default: 0.93 },
  },
);

export const WorkflowEdgeComponent = createComponent('WorkflowEdgeComponent', {
  edgeId: { type: 'String', default: 'edge-1' },
  sourceNodeId: { type: 'String', default: 'node-planner-1' },
  targetNodeId: { type: 'String', default: 'node-researcher-1' },
  sourceAgentId: { type: 'String', default: 'agent-planner' },
  targetAgentId: { type: 'String', default: 'agent-researcher' },
  isSelected: { type: 'Boolean', default: false },
});

export const ResultsPanelComponent = createComponent('ResultsPanelComponent', {
  panelId: { type: 'String', default: 'results-inspector-panel' },
  isOpen: { type: 'Boolean', default: true },
  baseY: { type: 'Float32', default: 1.28 },
});
