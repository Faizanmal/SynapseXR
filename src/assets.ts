/**
 * AgentSphere shared runtime and editor asset catalog.
 * Registers procedural command center architecture, the 4 holographic agent archetypes,
 * the binary GLB companion drone, tactile 3D spatial buttons, workflow connection beams,
 * and the holographic results inspector console.
 */

import { AssetType, defineAssets } from '@iwsdk/core';
import {
  createCompanionFallback,
  createPlannerAgent,
  createResearcherAgent,
  createExecutorAgent,
  createReviewerAgent,
} from './scene-assets/agents.scene-asset.js';
import {
  createApproveButton,
  createCancelRunButton,
  createChamberArchitecture,
  createCommandConsoleDesk,
  createCommandFloor,
  createCommandPlatform,
  createExecutorPedestal,
  createPlannerPedestal,
  createRecenterButton,
  createRejectButton,
  createResearcherPedestal,
  createResultsInspectorPanel,
  createReviewerPedestal,
  createStartRunButton,
  createToggleResultsButton,
  createWorkflowConnectionBeam,
} from './scene-assets/command-center.scene-asset.js';

const publicAssetUrl = (filePath: string): string =>
  `${import.meta.env.BASE_URL}${filePath.replace(/^\/+/u, '')}`;

const uikitml = (fileName: string, name: string) => ({
  url: publicAssetUrl(`ui/${fileName}`),
  type: AssetType.UIKitML,
  name,
});

const gltf = (fileName: string, name: string) => ({
  url: publicAssetUrl(`models/${fileName}`),
  type: AssetType.GLTF,
  priority: 'critical' as const,
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

  // Optional AI Companion Drone (GLB + Procedural Fallback)
  'companion-drone': gltf('companion-drone.glb', 'AI Companion Drone'),
  'companion-fallback': createCompanionFallback(),

  // Phase 6: 3D Tactile Spatial Buttons, Connection Beams & Inspector Console
  'btn-start-run': createStartRunButton(),
  'btn-cancel-run': createCancelRunButton(),
  'btn-approve': createApproveButton(),
  'btn-reject': createRejectButton(),
  'btn-toggle-results': createToggleResultsButton(),
  'btn-recenter': createRecenterButton(),
  'workflow-connection-beam': createWorkflowConnectionBeam(),
  'results-inspector-panel': createResultsInspectorPanel(),

  // UI Panels
  'welcome-panel': uikitml('welcome.uikitml', 'Welcome Panel'),
});
