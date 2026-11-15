/**
 * Seed preset workflow definition: "Plan a SaaS launch in 14 days".
 */

import { CURRENT_WORKFLOW_SCHEMA_VERSION, type Workflow } from './domain-types.js';

export const SEED_SAAS_LAUNCH_WORKFLOW: Workflow = {
  schemaVersion: CURRENT_WORKFLOW_SCHEMA_VERSION,
  id: 'wf-saas-launch-14d',
  title: 'AI Launch Privacy Gate',
  mission: 'Prepare a 14-day launch for an AI meeting-notes product. The draft claims customer prompts are deleted after 30 days, but the approved retention policy is missing. Find the evidence gap, remove unsupported claims from launch copy, and pause for human sign-off before publication.',
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
        primaryKpi: 'Publish only claims backed by an approved source',
      },
      status: 'ready',
    },
    {
      id: 'node-researcher',
      role: 'researcher',
      label: 'Market & Tech Researcher',
      position: [-0.15, 1.25, -0.85],
      configuration: {
        evidenceToVerify: ['30-day prompt deletion claim'],
        requiredOwner: 'Privacy policy owner',
      },
      status: 'idle',
    },
    {
      id: 'node-executor',
      role: 'executor',
      label: 'Launch Content Executor',
      position: [0.15, 1.25, -0.85],
      configuration: {
        deliverables: ['Launch copy with unsupported claim removed', 'Evidence request for policy owner'],
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
        complianceCheck: 'Retention claim evidence and safe publication copy',
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

