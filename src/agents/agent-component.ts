/**
 * AgentSphere ECS components for 3D agents and the AI companion guide.
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
