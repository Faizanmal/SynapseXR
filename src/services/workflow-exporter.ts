/**
 * Markdown Report Exporter for AgentSphere.
 * Synthesizes completed multi-agent workflow results into a formatted,
 * verifiable Markdown document and triggers browser download/clipboard copy.
 */

import { logger } from '../core/logger.js';
import type { AgentResult, Workflow } from '../workflows/domain-types.js';

export interface WorkflowExportData {
  workflow: Workflow;
  results: Record<string, AgentResult>;
  exportedAt: string;
  executionMode: 'live' | 'demo' | 'hybrid';
}

export function inferExecutionMode(
  results: Record<string, AgentResult>,
  fallbackMode: 'live' | 'demo' | 'remote',
): WorkflowExportData['executionMode'] {
  const modes = new Set(Object.values(results).map((result) => result.executionMode));
  if (modes.size === 0) return fallbackMode === 'remote' ? 'live' : fallbackMode;
  if (modes.size > 1) return 'hybrid';
  return modes.has('mock') ? 'demo' : 'live';
}

export class WorkflowExporter {
  generateMarkdownReport(data: WorkflowExportData): string {
    const { workflow, results, exportedAt, executionMode } = data;
    const lines: string[] = [];

    // Title and metadata header
    lines.push(`# SynapseXR Workflow Report: ${workflow.title}`);
    const modeLabel = executionMode === 'demo'
      ? 'SCRIPTED DEMO'
      : executionMode === 'hybrid'
        ? 'MIXED LIVE AND DEMO'
        : 'LIVE MODEL';
    lines.push(`> **Generated:** ${exportedAt} | **Mode:** ${modeLabel} | **Schema Version:** ${workflow.schemaVersion}`);
    lines.push('');
    lines.push(`### Mission Overview`);
    lines.push(`${workflow.mission}`);
    lines.push('');

    // Workflow Graph Topology
    lines.push(`### Orchestration Pipeline (${workflow.nodes.length} Stages)`);
    workflow.nodes.forEach((node, idx) => {
      lines.push(`${idx + 1}. **${node.label}** (\`${node.role}\`) — *Status:* \`${node.status}\``);
    });
    lines.push('');

    if (workflow.edges.length > 0) {
      lines.push(`**Connections:**`);
      workflow.edges.forEach((edge) => {
        const srcNode = workflow.nodes.find((n) => n.id === edge.sourceNodeId);
        const dstNode = workflow.nodes.find((n) => n.id === edge.targetNodeId);
        lines.push(`- \`${srcNode?.label || edge.sourceNodeId}\` ➔ \`${dstNode?.label || edge.targetNodeId}\``);
      });
      lines.push('');
    }

    lines.push('---');
    lines.push('');

    // Stage by Stage Execution Results
    lines.push(`## Stage Execution Results`);
    lines.push('');

    for (const node of workflow.nodes) {
      const result = node.outputReference ? results[node.outputReference] : undefined;

      lines.push(`### Stage: ${node.label} (\`${node.role.toUpperCase()}\`)`);
      lines.push(`- **Node ID:** \`${node.id}\``);
      lines.push(`- **Status:** \`${node.status}\``);

      if (result) {
        lines.push(`- **Execution Mode:** \`${result.executionMode === 'mock' ? 'scripted demo output' : 'live model output'}\``);
        lines.push(`- **Execution Window:** \`${result.timestamps.startedAt}\` → \`${result.timestamps.completedAt}\``);
        lines.push('');
        lines.push(`#### Summary`);
        lines.push(`${result.summary}`);
        lines.push('');

        lines.push(`#### Structured Deliverable`);
        lines.push('```json');
        lines.push(JSON.stringify(result.structuredOutput, null, 2));
        lines.push('```');
        lines.push('');

        if (result.evidenceReferences && result.evidenceReferences.length > 0) {
          lines.push(`**References supplied to this stage (not independently verified):**`);
          result.evidenceReferences.forEach((ref) => lines.push(`- [${ref}](${ref})`));
          lines.push('');
        }

        if (result.warnings && result.warnings.length > 0) {
          lines.push(`> [!WARNING]`);
          result.warnings.forEach((w) => lines.push(`> - ${w}`));
          lines.push('');
        }
      } else {
        lines.push(`*No execution result recorded for this node.*`);
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }

    // Safety and Sign-off Verification
    lines.push(`## Verification & Operator Sign-off`);
    const reviewer = workflow.nodes.find((node) => node.role === 'reviewer');
    const approvalStatus = reviewer?.status === 'completed'
      ? 'Approved by operator'
      : reviewer?.status === 'failed'
        ? 'Rejected by operator'
        : 'Pending or not recorded';
    lines.push(`- **Human-in-the-Loop Approval:** ${approvalStatus}`);
    lines.push(`- **Intended Platform:** Meta Quest VR / WebXR`);
    lines.push(`- **Engine:** SynapseXR IWSDK Orchestrator`);
    lines.push('');

    return lines.join('\n');
  }

  downloadMarkdownFile(filename: string, content: string): boolean {
    if (typeof window === 'undefined' || !document?.createElement) {
      logger.info('WorkflowExporter', `Generated ${filename} (${content.length} bytes) in non-browser context`);
      return false;
    }

    try {
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      logger.info('WorkflowExporter', `Exported report to download: ${filename}`);
      return true;
    } catch (err) {
      logger.error('WorkflowExporter', `Failed to trigger file download: ${(err as Error).message}`);
      return false;
    }
  }
}

export const workflowExporter = new WorkflowExporter();

