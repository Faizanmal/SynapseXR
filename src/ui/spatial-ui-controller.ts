/**
 * High-Contrast, Ergonomic Spatial UI Controller for AgentSphere.
 * Manages spatial UI display strings, high contrast mode, and accessible interaction states:
 * - High-contrast readable typography
 * - Step progress indicator bars
 * - Demo mode vs Live AI indicators
 * - Error states & toast notifications
 */

import { config } from '../core/config.js';
import { workflowStore } from '../workflows/workflow-store.js';
import { onboardingTutorial } from './onboarding-tutorial.js';

export interface SpatialDisplayState {
  title: string;
  mission: string;
  statusText: string;
  isLiveAi: boolean;
  highContrast: boolean;
  activeRole: string;
  progressPercent: number;
  waitingApproval: boolean;
  tutorialText?: string;
  tutorialHint?: string;
  notificationMessage?: string;
}

export class SpatialUiController {
  private highContrast = false;
  private currentNotification: string | null = null;
  private notificationExpiryMs = 0;

  isHighContrast(): boolean {
    return this.highContrast;
  }

  toggleHighContrast(): boolean {
    this.highContrast = !this.highContrast;
    return this.highContrast;
  }

  setNotification(message: string, durationMs = 4000): void {
    this.currentNotification = message;
    this.notificationExpiryMs = Date.now() + durationMs;
  }

  getDisplayState(): SpatialDisplayState {
    const wf = workflowStore.getWorkflow();
    const isLive = config.features.liveAiExecution && !config.app.isDemo;

    // Check notification expiry
    if (this.currentNotification && Date.now() > this.notificationExpiryMs) {
      this.currentNotification = null;
    }

    // Determine current running or active node
    const activeNode = wf.nodes.find((n) => n.status === 'running') ??
      wf.nodes.find((n) => n.status === 'waiting_approval') ??
      wf.nodes.find((n) => n.status === 'ready');

    const completedNodes = wf.nodes.filter((n) => n.status === 'completed').length;
    const progressPercent = wf.nodes.length > 0 ? (completedNodes / wf.nodes.length) * 100 : 0;
    const isWaitingApproval = wf.nodes.some((n) => n.status === 'waiting_approval');

    const tutorialStep = onboardingTutorial.getCurrentStep();

    return {
      title: wf.title,
      mission: wf.mission,
      statusText: isWaitingApproval ? 'WAITING OPERATOR APPROVAL' : wf.status.toUpperCase(),
      isLiveAi: isLive,
      highContrast: this.highContrast,
      activeRole: activeNode ? activeNode.role : 'none',
      progressPercent: Math.round(progressPercent),
      waitingApproval: isWaitingApproval,
      tutorialText: tutorialStep ? `${tutorialStep.title}: ${tutorialStep.instruction}` : undefined,
      tutorialHint: tutorialStep ? tutorialStep.actionHint : undefined,
      notificationMessage: this.currentNotification ?? undefined,
    };
  }
}

export const spatialUiController = new SpatialUiController();

