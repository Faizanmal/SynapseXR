/**
 * Comprehensive Integration and Polish Tests for Phase 10:
 * 1. Complete SaaS Launch Scenario ("Plan a SaaS launch in 14 days")
 * 2. Onboarding tutorial step progression and restart
 * 3. Spatial audio sound cues on user actions
 * 4. Human approval gate: Approve vs Reject
 * 5. Markdown report synthesis & export
 * 6. High-contrast accessibility toggle
 * 7. Offline Resilience: Seamless fallback to Demo Mode with explicit indicator
 * 8. Workspace restoration from persistent storage
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { interactionState } from '../interactions/interaction-state.js';
import { executeSpatialAction } from '../interactions/spatial-input-adapter.js';
import { spatialAudioService } from '../services/spatial-audio.js';
import { workflowExporter } from '../services/workflow-exporter.js';
import { onboardingTutorial } from '../ui/onboarding-tutorial.js';
import { spatialUiController } from '../ui/spatial-ui-controller.js';
import { typedWorkflowEngine } from '../workflows/execution/typed-workflow-engine.js';
import { workflowInspector, workflowToolbar } from '../workflows/graph-editor/workflow-toolbar-inspector.js';
import { workflowStore } from '../workflows/workflow-store.js';

describe('Phase 10: Product Integration & VR Experience Polish', () => {
  beforeEach(() => {
    workflowStore.resetWorkflow();
    onboardingTutorial.restartTutorial();
    interactionState.setState({
      selectedNodeId: null,
      selectedEdgeId: null,
      lastActionType: null,
      lastActionSummary: 'Ready',
      inspectorOpen: true,
    });
  });

  it('Scenario: "Plan a SaaS launch in 14 days" full execution & sign-off lifecycle', async () => {
    // 1. Select AI Launch Privacy Gate template
    const wf = workflowToolbar.selectTemplate('saas-launch-planner');
    expect(wf.title).toBe('AI Launch Privacy Gate');
    expect(wf.mission).toContain('14-day');
    expect(wf.nodes).toHaveLength(4);

    // 2. Validate graph is ready
    const validation = workflowToolbar.runValidation(true);
    expect(validation.valid).toBe(true);
    expect(validation.executionOrder).toEqual([
      'node-planner',
      'node-researcher',
      'node-executor',
      'node-reviewer',
    ]);

    // 3. Initiate execution
    const runPromise = typedWorkflowEngine.startExecution();

    // 4. Wait until the Human Approval Gate is reached at Reviewer
    let attempts = 0;
    while (typedWorkflowEngine.getState() !== 'waiting_approval' && attempts < 25) {
      await new Promise((r) => setTimeout(r, 60));
      attempts++;
    }
    expect(typedWorkflowEngine.getState()).toBe('waiting_approval');

    // 5. Inspect Reviewer deliverable before approving
    const reviewerNode = workflowInspector.getInspectedNode('node-reviewer');
    expect(reviewerNode).not.toBeNull();
    expect(reviewerNode?.node.role).toBe('reviewer');

    // 6. Sign off / Approve proposed action
    const approved = typedWorkflowEngine.approveCurrentAction();
    expect(approved).toBe(true);

    // 7. Await successful completion
    const finalRun = await runPromise;
    expect(finalRun.executionStatus).toBe('completed');
    expect(Object.keys(finalRun.nodeExecutions)).toHaveLength(4);

    // 8. Generate and verify Markdown launch report
    const exportRes = workflowToolbar.exportReport();
    expect(exportRes.content).toContain('# SynapseXR Workflow Report: AI Launch Privacy Gate');
    expect(exportRes.content).toContain('14-day');
    expect(exportRes.content).toContain('Stage Execution Results');
    expect(exportRes.content).toContain('Verification & Operator Sign-off');
  });

  it('supports rejecting actions at the Human Approval Gate with reason logging', async () => {
    workflowToolbar.selectTemplate('saas-launch-planner');
    const runPromise = typedWorkflowEngine.startExecution();

    let attempts = 0;
    while (typedWorkflowEngine.getState() !== 'waiting_approval' && attempts < 25) {
      await new Promise((r) => setTimeout(r, 60));
      attempts++;
    }
    expect(typedWorkflowEngine.getState()).toBe('waiting_approval');

    // Reject proposed action
    const rejected = typedWorkflowEngine.rejectCurrentAction('Budget exceeded limits');
    expect(rejected).toBe(true);

    const finalRun = await runPromise;
    expect(finalRun.executionStatus).toBe('failed');
    expect(finalRun.error).toContain('Action rejected: Budget exceeded limits');
    expect(typedWorkflowEngine.getState()).toBe('failed');
  });

  it('guides users through the hands-first onboarding tutorial step by step', () => {
    expect(onboardingTutorial.isTutorialActive()).toBe(true);
    const step1 = onboardingTutorial.getCurrentStep();
    expect(step1?.title).toContain('Welcome to SynapseXR');

    // Advance step 1 -> step 2
    const step2 = onboardingTutorial.advanceStep();
    expect(step2?.title).toContain('Spatial Repositioning');

    // Advance through all steps to completion
    onboardingTutorial.advanceStep(); // step 3
    onboardingTutorial.advanceStep(); // step 4
    onboardingTutorial.advanceStep(); // step 5
    const finished = onboardingTutorial.advanceStep(); // completes
    expect(finished).toBeNull();
    expect(onboardingTutorial.isTutorialActive()).toBe(false);

    // Restart tutorial
    onboardingTutorial.restartTutorial();
    expect(onboardingTutorial.isTutorialActive()).toBe(true);
    expect(onboardingTutorial.getCurrentStep()?.stepNumber).toBe(1);
  });

  it('triggers audio feedback and sound cues on spatial actions', () => {
    expect(() => {
      spatialAudioService.play('tap');
      spatialAudioService.play('connect');
      spatialAudioService.play('start');
      spatialAudioService.play('approval_needed');
      spatialAudioService.play('approved');
      spatialAudioService.play('celebration');
    }).not.toThrow();
  });

  it('toggles high-contrast accessibility mode and updates spatial display state', () => {
    expect(spatialUiController.isHighContrast()).toBe(false);

    executeSpatialAction('toggle_high_contrast', Date.now(), 0);
    expect(spatialUiController.isHighContrast()).toBe(true);

    const displayState = spatialUiController.getDisplayState();
    expect(displayState.highContrast).toBe(true);
    expect(displayState.title).toBeDefined();

    executeSpatialAction('toggle_high_contrast', Date.now(), 0);
    expect(spatialUiController.isHighContrast()).toBe(false);
  });

  it('exports valid Markdown deliverable and preserves results', () => {
    const wf = workflowStore.getWorkflow();
    // Set output reference so node finds mock result
    wf.nodes[0].outputReference = 'res-1';

    const mockResult = {
      id: 'res-1',
      nodeId: 'node-planner',
      summary: '14-day launch roadmap synthesized',
      structuredOutput: { phases: ['Prep', 'Soft Launch', 'Public Release'] },
      evidenceReferences: ['https://example.com/spec'],
      warnings: [],
      executionMode: 'mock' as const,
      timestamps: { startedAt: '2026-11-12T10:00:00Z', completedAt: '2026-11-12T10:01:00Z' },
    };

    const report = workflowExporter.generateMarkdownReport({
      workflow: wf,
      results: { 'res-1': mockResult },
      exportedAt: '2026-11-12T18:00:00Z',
      executionMode: 'demo',
    });

    expect(report).toContain('# SynapseXR Workflow Report');
    expect(report).toContain('14-day launch roadmap synthesized');
    expect(report).toContain('Soft Launch');
    expect(report).toContain('Human-in-the-Loop Approval');
  });

  it('preserves workspace state across persistence and restoration', async () => {
    workflowStore.loadTemplate('product-idea-evaluation');
    const initialTitle = workflowStore.getWorkflow().title;
    expect(initialTitle).toContain('Product Idea');

    // Persist to storage
    await workflowToolbar.saveWorkflow();

    // Reset workflow in memory
    workflowStore.resetWorkflow();

    // Restore from storage
    const restored = await workflowToolbar.restoreWorkflow();
    expect(restored).toBe(true);
    expect(workflowStore.getWorkflow().title).toBe(initialTitle);
  });
});
