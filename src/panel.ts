/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createSystem, UIKitMLAsset, VisibilityState } from '@iwsdk/core';
import { typedWorkflowEngine } from './workflows/execution/typed-workflow-engine.js';
import { interactionState } from './interactions/interaction-state.js';
import { workflowStore } from './workflows/workflow-store.js';

export class PanelSystem extends createSystem({}) {
  private lastUpdate = 0;

  init(): void {
    const panel = this.world.getSceneObject<UIKitMLAsset>('welcome-panel');
    const xrButton = panel?.getElementById('xr-button');
    const exitButton = panel?.getElementById('exit-button');
    if (xrButton == null || exitButton == null) {
      return;
    }
    if (!this.world.xrEnabled) {
      xrButton.setProperties({ display: 'none' });
      exitButton.setProperties({ display: 'none' });
      return;
    }

    const launchXR = () => this.world.launchXR();
    const exitXR = () => this.world.exitXR();
    xrButton.addEventListener('click', launchXR);
    exitButton.addEventListener('click', exitXR);
    this.cleanupFuncs.push(
      () => xrButton.removeEventListener('click', launchXR),
      () => exitButton.removeEventListener('click', exitXR),
      this.world.visibilityState.subscribe((visibilityState) => {
        const is2D = visibilityState === VisibilityState.NonImmersive;
        xrButton.setProperties({ display: is2D ? 'flex' : 'none' });
        exitButton.setProperties({ display: is2D ? 'none' : 'flex' });
      }),
    );
  }

  update(): void {
    const now = Date.now();
    if (now - this.lastUpdate < 300) return;
    this.lastUpdate = now;

    const inspectorUI = this.world.getSceneObject<UIKitMLAsset>('results-inspector-ui');
    if (!inspectorUI) return;

    const wf = workflowStore.getWorkflow();
    const state = interactionState.getState();

    const titleEl = inspectorUI.getElementById('inspector-mission-title');
    const badgeEl = inspectorUI.getElementById('inspector-status-badge');
    const modeEl = inspectorUI.getElementById('inspector-mode-label');
    const summaryEl = inspectorUI.getElementById('inspector-summary');
    const roleEl = inspectorUI.getElementById('inspector-stage-role');
    const nodeEl = inspectorUI.getElementById('inspector-node-id');
    const bannerEl = inspectorUI.getElementById('inspector-approval-banner');
    const actionCopyEl = inspectorUI.getElementById('inspector-action-copy');
    const actionHintEl = inspectorUI.getElementById('inspector-action-hint');

    if (titleEl) titleEl.setProperties({ text: wf.title });

    const hasWaiting = wf.nodes.some((n) => n.status === 'waiting_approval');
    const hasRunning = wf.nodes.some((n) => n.status === 'running');
    const allCompleted = wf.nodes.every((n) => n.status === 'completed');
    const reviewerRejected = wf.nodes.some((n) => n.role === 'reviewer' && n.status === 'failed');
    const runFailed = typedWorkflowEngine.getState() === 'failed';

    if (badgeEl) {
      const statusText = hasWaiting
        ? 'REVIEW READY'
        : hasRunning
          ? 'RUNNING'
          : reviewerRejected
            ? 'REJECTED'
            : runFailed
              ? 'FAILED'
          : allCompleted
              ? 'APPROVED'
              : wf.status.toUpperCase();
      badgeEl.setProperties({ text: statusText });
    }

    // Keep the reviewer result in view after the operator signs off.
    const targetNodeId = state.selectedNodeId
      || wf.nodes.find((n) => n.status === 'waiting_approval')?.id
      || wf.nodes.find((n) => n.role === 'reviewer' && n.outputReference)?.id
      || wf.nodes[0]?.id;
    const targetNode = wf.nodes.find((n) => n.id === targetNodeId);

    if (bannerEl) bannerEl.setProperties({ display: hasWaiting ? 'flex' : 'none' });

    if (targetNode) {
      if (roleEl) roleEl.setProperties({ text: `Role: ${targetNode.role.toUpperCase()}` });
      if (nodeEl) nodeEl.setProperties({ text: `Node: ${targetNode.label}` });

      const result = targetNode.outputReference
        ? workflowStore.getExecutionResult(targetNode.outputReference)
        : undefined;

      if (modeEl) {
        const isScripted = result
          ? result.executionMode === 'mock'
          : typedWorkflowEngine.getExecutionMode() === 'demo';
        modeEl.setProperties({
          text: isScripted
            ? 'SCRIPTED DEMO - NO SOURCES VERIFIED'
            : 'LIVE MODEL - SOURCES NOT VERIFIED',
        });
      }

      if (summaryEl) {
        if (result) {
          summaryEl.setProperties({ text: result.summary });
        } else {
          summaryEl.setProperties({
            text: `Status: ${targetNode.status.toUpperCase()}. Awaiting pipeline trigger to synthesize deliverable artifacts.`,
          });
        }
      }

      if (hasWaiting && result) {
        const requiredEvidence = result.structuredOutput.requiredEvidence
          ?? result.structuredOutput.missingEvidence;
        const proposedAction = result.structuredOutput.proposedAction
          ?? result.structuredOutput.targetProposal;
        if (actionCopyEl) actionCopyEl.setProperties({ text: result.summary });
        if (actionHintEl) {
          const hint = result.executionMode === 'mock'
            ? `SCRIPTED SCENARIO. Missing evidence: ${String(requiredEvidence ?? 'none specified')}. Proposed: ${String(proposedAction ?? 'Review the draft before approval')}`
            : `Model proposal: ${String(proposedAction ?? 'Review the generated output')}. Verify source material independently before approving.`;
          actionHintEl.setProperties({ text: hint });
        }
      }
    }
  }
}
