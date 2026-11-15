/**
 * AgentSphere Application Entry Point.
 */

import { World } from '@iwsdk/core';
import projectOptions from 'virtual:iwsdk-project';
import { AgentNodeSystem } from './agents/agent-system.js';
import { config } from './core/config.js';
import { logger } from './core/logger.js';
import { GrabFeedbackSystem } from './interactions/grab-feedback-system.js';
import { interactionState } from './interactions/interaction-state.js';
import { InteractionSystem } from './interactions/interaction-system.js';
import {
  selectAgentNode,
  SelectionSystem,
  selectWorkflowEdge,
} from './interactions/selection-system.js';
import { executeSpatialAction } from './interactions/spatial-input-adapter.js';
import { PanelSystem } from './panel.js';
import { aiBackendService } from './services/ai-backend.js';
import { typedWorkflowEngine } from './workflows/execution/typed-workflow-engine.js';
import { connectionHandle } from './workflows/graph-editor/connection-handle.js';
import { graphSelectionSystem } from './workflows/graph-editor/graph-selection-system.js';
import { WorkflowGraphSystem } from './workflows/graph-editor/workflow-graph-system.js';
import {
  workflowInspector,
  workflowToolbar,
} from './workflows/graph-editor/workflow-toolbar-inspector.js';
import { templateSelector } from './workflows/template-selector.js';
import { workflowStore } from './workflows/workflow-store.js';

declare global {
  interface Window {
    __AGENTSPHERE_INTERACTION__?: {
      getInteractionState: typeof interactionState.getState;
      getWorkflow: typeof workflowStore.getWorkflow;
      executeSpatialAction: typeof executeSpatialAction;
      selectAgentNode: typeof selectAgentNode;
      selectWorkflowEdge: typeof selectWorkflowEdge;
      workflowToolbar: typeof workflowToolbar;
      workflowInspector: typeof workflowInspector;
      templateSelector: typeof templateSelector;
      connectionHandle: typeof connectionHandle;
      graphSelectionSystem: typeof graphSelectionSystem;
      typedWorkflowEngine: typeof typedWorkflowEngine;
    };
  }
}

World.create(
  document.getElementById('scene-container') as HTMLDivElement,
  projectOptions,
).then(async (world) => {
  // Configure workflow engine based on runtime config and backend availability
  const isDemo = config.app.isDemo;
  let executionMode: 'demo' | 'remote' = isDemo ? 'demo' : 'remote';

  if (!isDemo) {
    const health = await aiBackendService.checkHealth();
    if (!health) {
      logger.warn('Index', 'AI backend service unreachable; falling back to demo mode');
      executionMode = 'demo';
    } else {
      logger.info('Index', `Connected to AI backend v${health.version} (${health.provider})`);
    }
  }

  typedWorkflowEngine.configure({
    mode: executionMode,
    apiBaseUrl: config.api.backendUrl,
    stepTimeoutMs: config.api.requestTimeoutMs,
  });

  world.registerSystem(WorkflowGraphSystem);
  world.registerSystem(GrabFeedbackSystem);
  world.registerSystem(SelectionSystem);
  world.registerSystem(InteractionSystem);
  world.registerSystem(AgentNodeSystem);
  world.registerSystem(PanelSystem);

  if (typeof window !== 'undefined') {
    window.__AGENTSPHERE_INTERACTION__ = {
      getInteractionState: () => interactionState.getState(),
      getWorkflow: () => workflowStore.getWorkflow(),
      executeSpatialAction,
      selectAgentNode,
      selectWorkflowEdge,
      workflowToolbar,
      workflowInspector,
      templateSelector,
      connectionHandle,
      graphSelectionSystem,
      typedWorkflowEngine,
    };
  }
});
