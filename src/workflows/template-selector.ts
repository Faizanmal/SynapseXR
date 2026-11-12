/**
 * TemplateSelector: Catalog and instantiation service for predefined 3D spatial
 * AI agent workflows:
 * 1. SaaS Launch Planner ("Plan a SaaS Launch in 14 Days")
 * 2. Project Risk Review ("Autonomous Technical & Compliance Risk Audit")
 * 3. Product Idea Evaluation ("Spatial Product Discovery & Feasibility Matrix")
 */

import {
  CURRENT_WORKFLOW_SCHEMA_VERSION,
  type Workflow,
} from './domain-types.js';
import { SEED_SAAS_LAUNCH_WORKFLOW } from './seed-workflow.js';

export type WorkflowTemplateId =
  | 'saas-launch-planner'
  | 'project-risk-review'
  | 'product-idea-evaluation';

export interface WorkflowTemplateDescriptor {
  id: WorkflowTemplateId;
  name: string;
  subtitle: string;
  missionSummary: string;
  createWorkflow: () => Workflow;
}

export const PROJECT_RISK_REVIEW_WORKFLOW: Workflow = {
  schemaVersion: CURRENT_WORKFLOW_SCHEMA_VERSION,
  id: 'wf-project-risk-review',
  title: 'Project Risk Review',
  mission:
    'Conduct a comprehensive architecture, security dependency, SLA compliance, and mitigation audit before production release.',
  status: 'draft',
  createdAt: '2026-11-12T00:00:00.000Z',
  updatedAt: '2026-11-12T00:00:00.000Z',
  nodes: [
    {
      id: 'node-planner',
      role: 'planner',
      label: 'Risk Scope Architect',
      position: [-0.48, 1.15, -0.75],
      configuration: {
        auditDepth: 'deep',
        focusAreas: ['Architecture', 'Supply Chain', 'Data Privacy'],
      },
      status: 'ready',
    },
    {
      id: 'node-researcher',
      role: 'researcher',
      label: 'Threat & CVE Scanner',
      position: [-0.16, 1.25, -0.92],
      configuration: {
        repositories: ['frontend-xr', 'fastapi-agent-service'],
        checkCVEs: true,
      },
      status: 'idle',
    },
    {
      id: 'node-executor',
      role: 'executor',
      label: 'Mitigation Playbook Builder',
      position: [0.16, 1.25, -0.92],
      configuration: {
        deliverables: ['Remediation Checklist', 'Rollback Runbook'],
      },
      status: 'idle',
    },
    {
      id: 'node-reviewer',
      role: 'reviewer',
      label: 'Sign-Off Compliance Gate',
      position: [0.48, 1.15, -0.75],
      configuration: {
        requireHumanSignoff: true,
        policyStandard: 'OWASP ASVS L2',
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

export const PRODUCT_IDEA_EVALUATION_WORKFLOW: Workflow = {
  schemaVersion: CURRENT_WORKFLOW_SCHEMA_VERSION,
  id: 'wf-product-idea-evaluation',
  title: 'Product Idea Evaluation',
  mission:
    'Evaluate a new spatial computing product concept across user desirability, technical feasibility, competitive moat, and unit economics.',
  status: 'draft',
  createdAt: '2026-11-12T00:00:00.000Z',
  updatedAt: '2026-11-12T00:00:00.000Z',
  nodes: [
    {
      id: 'node-planner',
      role: 'planner',
      label: 'Hypothesis Framer',
      position: [-0.48, 1.15, -0.75],
      configuration: {
        targetSegment: 'Enterprise Spatial Productivity',
        evaluationHorizonMonths: 6,
      },
      status: 'ready',
    },
    {
      id: 'node-researcher',
      role: 'researcher',
      label: 'Market & Patent Analyst',
      position: [-0.16, 1.25, -0.92],
      configuration: {
        sources: ['Prior Art', 'Horizon Store Trends', 'User Interviews'],
      },
      status: 'idle',
    },
    {
      id: 'node-executor',
      role: 'executor',
      label: 'MVP Spec & Financial Modeler',
      position: [0.16, 1.25, -0.92],
      configuration: {
        deliverables: ['PRD v1', 'Unit Economics Matrix', '3D UX Wireframe Plan'],
      },
      status: 'idle',
    },
    {
      id: 'node-reviewer',
      role: 'reviewer',
      label: 'Venture Readiness Critic',
      position: [0.48, 1.15, -0.75],
      configuration: {
        requireHumanSignoff: true,
        decisionRubric: 'Go / No-Go Investment Memo',
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

function cloneWorkflowWithErgonomicPositions(wf: Workflow): Workflow {
  const clone: Workflow = JSON.parse(JSON.stringify(wf));
  // Ensure consistent seated ergonomic coordinates
  const defaultCoords: Array<[number, number, number]> = [
    [-0.48, 1.15, -0.75],
    [-0.16, 1.25, -0.92],
    [0.16, 1.25, -0.92],
    [0.48, 1.15, -0.75],
  ];
  clone.nodes.forEach((node, idx) => {
    if (defaultCoords[idx]) {
      node.position = [...defaultCoords[idx]!];
    }
  });
  clone.updatedAt = new Date().toISOString();
  return clone;
}

export const WORKFLOW_TEMPLATES: ReadonlyArray<WorkflowTemplateDescriptor> = [
  {
    id: 'saas-launch-planner',
    name: 'SaaS Launch Planner',
    subtitle: '14-Day Go-To-Market Pipeline',
    missionSummary: SEED_SAAS_LAUNCH_WORKFLOW.mission,
    createWorkflow: () =>
      cloneWorkflowWithErgonomicPositions(SEED_SAAS_LAUNCH_WORKFLOW),
  },
  {
    id: 'project-risk-review',
    name: 'Project Risk Review',
    subtitle: 'Technical & Compliance Risk Audit',
    missionSummary: PROJECT_RISK_REVIEW_WORKFLOW.mission,
    createWorkflow: () =>
      cloneWorkflowWithErgonomicPositions(PROJECT_RISK_REVIEW_WORKFLOW),
  },
  {
    id: 'product-idea-evaluation',
    name: 'Product Idea Evaluation',
    subtitle: 'Spatial Discovery & Venture Matrix',
    missionSummary: PRODUCT_IDEA_EVALUATION_WORKFLOW.mission,
    createWorkflow: () =>
      cloneWorkflowWithErgonomicPositions(PRODUCT_IDEA_EVALUATION_WORKFLOW),
  },
];

export class TemplateSelector {
  private isOpen = false;
  private activeTemplateId: WorkflowTemplateId = 'saas-launch-planner';

  listTemplates(): ReadonlyArray<WorkflowTemplateDescriptor> {
    return WORKFLOW_TEMPLATES;
  }

  getTemplate(id: WorkflowTemplateId): WorkflowTemplateDescriptor | undefined {
    return WORKFLOW_TEMPLATES.find((t) => t.id === id);
  }

  getActiveTemplateId(): WorkflowTemplateId {
    return this.activeTemplateId;
  }

  isSelectorOpen(): boolean {
    return this.isOpen;
  }

  open(): void {
    this.isOpen = true;
  }

  close(): void {
    this.isOpen = false;
  }

  toggle(): boolean {
    this.isOpen = !this.isOpen;
    return this.isOpen;
  }

  instantiateTemplate(id: WorkflowTemplateId): Workflow {
    const descriptor = this.getTemplate(id) ?? WORKFLOW_TEMPLATES[0]!;
    this.activeTemplateId = descriptor.id;
    return descriptor.createWorkflow();
  }

  cycleNextTemplate(): WorkflowTemplateDescriptor {
    const idx = WORKFLOW_TEMPLATES.findIndex(
      (t) => t.id === this.activeTemplateId,
    );
    const nextIdx = (idx + 1) % WORKFLOW_TEMPLATES.length;
    const next = WORKFLOW_TEMPLATES[nextIdx]!;
    this.activeTemplateId = next.id;
    return next;
  }
}

export const templateSelector = new TemplateSelector();

