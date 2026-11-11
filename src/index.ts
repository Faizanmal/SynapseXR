/**
 * AgentSphere Application Entry Point.
 */

import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { AgentNodeSystem } from './agents/agent-system.js';
import { PanelSystem } from './panel.js';

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then((world) => {
  world.registerSystem(AgentNodeSystem);
  world.registerSystem(PanelSystem);
});
