/**
 * AgentSphere shared runtime and editor asset catalog.
 * Registers procedural command center architecture and the 4 holographic agent archetypes.
 */

import { AssetType, defineAssets } from '@iwsdk/core';
import {
  createPlannerAgent,
  createResearcherAgent,
  createExecutorAgent,
  createReviewerAgent,
} from './scene-assets/agents.scene-asset.js';
import {
  createChamberArchitecture,
  createCommandConsoleDesk,
  createCommandFloor,
  createCommandPlatform,
  createExecutorPedestal,
  createPlannerPedestal,
  createResearcherPedestal,
  createReviewerPedestal,
} from './scene-assets/command-center.scene-asset.js';

const publicAssetUrl = (filePath: string): string =>
  `${import.meta.env.BASE_URL}${filePath.replace(/^\/+/u, '')}`;

const uikitml = (fileName: string, name: string) => ({
  url: publicAssetUrl(`ui/${fileName}`),
  type: AssetType.UIKitML,
  name,
});

export default defineAssets({
  // Command Center Architecture & Set
  'command-floor': createCommandFloor(),
  'command-platform': createCommandPlatform(),
  'command-console-desk': createCommandConsoleDesk(),
  'chamber-architecture': createChamberArchitecture(),

  // Agent Pedestals
  'planner-pedestal': createPlannerPedestal(),
  'researcher-pedestal': createResearcherPedestal(),
  'executor-pedestal': createExecutorPedestal(),
  'reviewer-pedestal': createReviewerPedestal(),

  // 3D Holographic Agents
  'agent-planner': createPlannerAgent(),
  'agent-researcher': createResearcherAgent(),
  'agent-executor': createExecutorAgent(),
  'agent-reviewer': createReviewerAgent(),

  // UI Panels
  'welcome-panel': uikitml('welcome.uikitml', 'Welcome Panel'),
});
