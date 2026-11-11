/**
 * AgentSphere ECS components.
 */

import { createComponent } from '@iwsdk/core';

export const AgentNodeComponent = createComponent('AgentNodeComponent', {
  role: { type: 'String', default: 'planner' },
  agentId: { type: 'String', default: 'agent-planner' },
  status: { type: 'String', default: 'idle' },
  baseY: { type: 'Float32', default: 1.15 },
});
