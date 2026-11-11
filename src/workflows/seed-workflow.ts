/**
 * Seed preset workflow definition: "Plan a SaaS launch in 14 days".
 */

import { CURRENT_WORKFLOW_SCHEMA_VERSION, type Workflow } from './domain-types.js';

export const SEED_SAAS_LAUNCH_WORKFLOW: Workflow = {
  schemaVersion: CURRENT_WORKFLOW_SCHEMA_VERSION,
  id: 'wf-saas-launch-14d',
  title: 'Plan a SaaS Launch in 14 Days',
  mission: 'Orchestrate a high-velocity 14-day go-to-market plan for an AI Developer Tool SaaS, including user acquisition, security compliance, landing page synthesis, and executive approval.',
  status: 'draft',
  createdAt: '2026-11-11T00:00:00.000Z',
  updatedAt: '2026-11-11T00:00:00.000Z',
  nodes: [
    {
      id: 'node-planner',
      role: 'planner',
      label: 'Strategic Planner',
      position: [-0.45, 1.15, -0.75],
      configuration: {
        timeframeDays: 14,
        sprints: 2,
        primaryKpi: '1,000 developer signups',
      },
      status: 'ready',
    },
    {
      id: 'node-researcher',
      role: 'researcher',
      label: 'Market & Tech Researcher',
      position: [-0.15, 1.25, -0.85],
      configuration: {
        channels: ['ProductHunt', 'HackerNews', 'X / Dev Community'],
        benchmarkCompetitors: ['Cursor', 'v0', 'Replit'],
      },
      status: 'idle',
    },
    {
      id: 'node-executor',
      role: 'executor',
      label: 'Launch Content Executor',
      position: [0.15, 1.25, -0.85],
      configuration: {
        deliverables: ['Launch Day Tweet Thread', 'Show HN Post Draft', 'Product Hunt Taglines'],
      },
      status: 'idle',
    },
    {
      id: 'node-reviewer',
      role: 'reviewer',
      label: 'Governance & Security Auditor',
      position: [0.45, 1.15, -0.75],
      configuration: {
        requireHumanSignoff: true,
        complianceCheck: 'SOC2 / Data Privacy',
      },
      status: 'idle',
    },
  ],
  edges: [
    {
      id: 'edge-planner-researcher',
      sourceNodeId: 'node-planner',
      targetNodeId: 'node-researcher',
    },
    {
      id: 'edge-researcher-executor',
      sourceNodeId: 'node-researcher',
      targetNodeId: 'node-executor',
    },
    {
      id: 'edge-executor-reviewer',
      sourceNodeId: 'node-executor',
      targetNodeId: 'node-reviewer',
    },
  ],
};

