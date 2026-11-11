/**
 * Shared ECS component manifest.
 */

import { defineComponents } from '@iwsdk/core';
import {
  AgentNodeComponent,
  CompanionDroneComponent,
} from './agents/agent-component.js';

export default defineComponents([AgentNodeComponent, CompanionDroneComponent]);
