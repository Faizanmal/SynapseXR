/**
 * Workflow execution definitions, schemas, and topological step model.
 */

import type { AgentRole } from '../state/store.js';

export interface WorkflowStep {
  stepId: string;
  agentRole: AgentRole;
  title: string;
  description: string;
  actionPayload: Record<string, unknown>;
  requiresHumanApproval?: boolean;
}

export interface WorkflowMission {
  missionId: string;
  title: string;
  goal: string;
  steps: WorkflowStep[];
}

export const PRESET_MISSIONS: WorkflowMission[] = [
  {
    missionId: 'mission-001',
    title: 'Autonomous Market Research & Executive Brief',
    goal: 'Analyze competitive landscape in Spatial Computing and draft C-suite recommendation.',
    steps: [
      {
        stepId: 'step-plan',
        agentRole: 'planner',
        title: 'Formulate Research Architecture',
        description: 'Breaks mission into targeted query verticals and source evaluation criteria.',
        actionPayload: { targets: ['WebXR', 'Meta Horizon OS', 'Spatial AI'] },
      },
      {
        stepId: 'step-research',
        agentRole: 'researcher',
        title: 'Deep Information Retrieval',
        description: 'Queries literature, market benchmarks, and extracts key adoption metrics.',
        actionPayload: { depth: 'rigorous', citeSources: true },
      },
      {
        stepId: 'step-execute',
        agentRole: 'executor',
        title: 'Synthesize Executive Report',
        description: 'Compiles findings into actionable executive briefing document.',
        actionPayload: { format: 'executive_summary' },
      },
      {
        stepId: 'step-review',
        agentRole: 'reviewer',
        title: 'Quality & Governance Audit',
        description: 'Verifies evidence integrity, checks compliance, and pauses for human approval.',
        actionPayload: { strictness: 'high' },
        requiresHumanApproval: true,
      },
    ],
  },
];
