/**
 * Seed preset workflow for a simulated AI retrieval incident.
 */

import { CURRENT_WORKFLOW_SCHEMA_VERSION, type Workflow } from './domain-types.js';

export const SEED_AI_INCIDENT_WORKFLOW: Workflow = {
  schemaVersion: CURRENT_WORKFLOW_SCHEMA_VERSION,
  id: 'wf-ai-incident-command',
  title: 'AI Incident Command',
  mission: 'SIMULATION: A synthetic support record appeared in an AI assistant answer after retrieval from a knowledge index. Triage the event, preserve the evidence trail, propose scoped containment and rollback steps, and pause for a human decision. Do not call external systems or claim a real incident occurred.',
  status: 'draft',
  createdAt: '2026-11-11T00:00:00.000Z',
  updatedAt: '2026-11-11T00:00:00.000Z',
  nodes: [
    {
      id: 'node-planner',
      role: 'planner',
      label: 'Incident Commander',
      position: [-0.45, 1.15, -0.75],
      configuration: {
        incidentId: 'SIM-042',
        severity: 'provisional SEV-2',
        scope: 'synthetic retrieval index only',
      },
      status: 'ready',
    },
    {
      id: 'node-researcher',
      role: 'researcher',
      label: 'Evidence Analyst',
      position: [-0.15, 1.25, -0.85],
      configuration: {
        evidenceToVerify: ['synthetic request trace', 'retrieval document ID', 'index version'],
        unknowns: ['whether any real customer data was exposed'],
      },
      status: 'idle',
    },
    {
      id: 'node-executor',
      role: 'executor',
      label: 'Containment Planner',
      position: [0.15, 1.25, -0.85],
      configuration: {
        deliverables: ['scoped index quarantine plan', 'evidence preservation checklist', 'rollback plan'],
      },
      status: 'idle',
    },
    {
      id: 'node-reviewer',
      role: 'reviewer',
      label: 'Safety & Recovery Reviewer',
      position: [0.45, 1.15, -0.75],
      configuration: {
        requireHumanSignoff: true,
        complianceCheck: 'scope, evidence preservation, operator authorization, and rollback readiness',
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

