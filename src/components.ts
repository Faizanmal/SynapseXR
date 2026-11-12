/**
 * Shared ECS component manifest.
 */

import { defineComponents } from '@iwsdk/core';
import {
  AgentNodeComponent,
  CompanionDroneComponent,
  ResultsPanelComponent,
  SpatialActionButtonComponent,
  WorkflowEdgeComponent,
} from './agents/agent-component.js';

export default defineComponents([
  AgentNodeComponent,
  CompanionDroneComponent,
  SpatialActionButtonComponent,
  WorkflowEdgeComponent,
  ResultsPanelComponent,
]);
