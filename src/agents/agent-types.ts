/**
 * Agent models and archetype definitions.
 */

import type { AgentRole } from '../state/store.js';

export interface AgentVisualSpec {
  role: AgentRole;
  displayName: string;
  primaryColor: string;
  emissiveColor: string;
  description: string;
}

export const AGENT_SPECS: Record<AgentRole, AgentVisualSpec> = {
  planner: {
    role: 'planner',
    displayName: 'Planner',
    primaryColor: '#00e5ff', // Cyan
    emissiveColor: '#00b4d8',
    description: 'Deconstructs goals into strategic multi-agent execution steps.',
  },
  researcher: {
    role: 'researcher',
    displayName: 'Researcher',
    primaryColor: '#bd00ff', // Purple
    emissiveColor: '#9d4edd',
    description: 'Queries literature, extracts facts, and verifies context.',
  },
  executor: {
    role: 'executor',
    displayName: 'Executor',
    primaryColor: '#ff9100', // Amber
    emissiveColor: '#f77f00',
    description: 'Synthesizes code, formats briefs, and executes planned deliverables.',
  },
  reviewer: {
    role: 'reviewer',
    displayName: 'Reviewer',
    primaryColor: '#00e676', // Emerald
    emissiveColor: '#06d6a0',
    description: 'Audits safety, compliance, accuracy, and validates acceptance gates.',
  },
};

