/**
 * Workflow execution runner supporting both demo simulation and real API proxying.
 */

import { eventBus } from '../core/event-bus.js';
import { logger } from '../core/logger.js';
import { store } from '../state/store.js';
import { PRESET_MISSIONS, type WorkflowMission } from './workflow-types.js';

export class WorkflowEngine {
  private activeMission: WorkflowMission | null = null;
  private currentStepIndex = 0;
  private isRunning = false;

  startMission(missionId: string): void {
    const mission = PRESET_MISSIONS.find((m) => m.missionId === missionId);
    if (!mission) {
      logger.error('WorkflowEngine', `Mission not found: ${missionId}`);
      return;
    }

    this.activeMission = mission;
    this.currentStepIndex = 0;
    this.isRunning = true;

    store.setState({
      isExecuting: true,
      activeMissionId: missionId,
      activeMissionTitle: mission.title,
    });

    eventBus.emit('workflow:start', { workflowId: missionId, missionTitle: mission.title });
    logger.info('WorkflowEngine', `Starting mission: ${mission.title}`);

    this.executeCurrentStep();
  }

  private executeCurrentStep(): void {
    if (!this.isRunning || !this.activeMission) return;

    if (this.currentStepIndex >= this.activeMission.steps.length) {
      this.completeMission();
      return;
    }

    const step = this.activeMission.steps[this.currentStepIndex];
    const agentId = `agent-${step.agentRole}`;

    store.updateAgent(agentId, {
      state: 'working',
      progress: 0.1,
      statusMessage: step.title,
    });

    logger.info('WorkflowEngine', `Step started [${step.agentRole}]: ${step.title}`);

    // In demo mode or fallback execution, progress updates deterministically
    let progress = 0.1;
    const interval = setInterval(() => {
      progress += 0.3;
      if (progress >= 1.0) {
        clearInterval(interval);
        progress = 1.0;

        store.updateAgent(agentId, {
          progress: 1.0,
          statusMessage: 'Step payload synthesized',
          logs: [...(store.getState().agents[agentId]?.logs || []), `Completed: ${step.title}`],
        });

        if (step.requiresHumanApproval) {
          store.updateAgent(agentId, { state: 'waiting_approval' });
          store.setState({
            approvalRequired: true,
            pendingApprovalAction: `Executive Report Approval: ${step.title}`,
          });
          eventBus.emit('workflow:paused_for_approval', {
            agentId,
            actionSummary: step.title,
            proposal: 'Final recommendation ready for human sign-off.',
          });
        } else {
          store.updateAgent(agentId, { state: 'completed' });
          this.currentStepIndex++;
          this.executeCurrentStep();
        }
      } else {
        store.updateAgent(agentId, {
          progress,
          statusMessage: `Processing ${Math.round(progress * 100)}%...`,
        });
      }
    }, 400);
  }

  approveStep(): void {
    if (!this.activeMission) return;
    const step = this.activeMission.steps[this.currentStepIndex];
    const agentId = `agent-${step.agentRole}`;

    store.updateAgent(agentId, { state: 'completed', statusMessage: 'Approved by operator' });
    store.setState({ approvalRequired: false, pendingApprovalAction: null });

    eventBus.emit('workflow:approved', { agentId });
    this.currentStepIndex++;
    this.executeCurrentStep();
  }

  rejectStep(reason: string): void {
    if (!this.activeMission) return;
    const step = this.activeMission.steps[this.currentStepIndex];
    const agentId = `agent-${step.agentRole}`;

    store.updateAgent(agentId, { state: 'error', statusMessage: `Revision needed: ${reason}` });
    store.setState({ approvalRequired: false, pendingApprovalAction: null, isExecuting: false });

    eventBus.emit('workflow:rejected', { agentId, reason });
    this.isRunning = false;
  }

  private completeMission(): void {
    this.isRunning = false;
    store.setState({ isExecuting: false });
    eventBus.emit('workflow:complete', {
      workflowId: this.activeMission?.missionId || '',
      finalOutput: 'Mission executed successfully with human sign-off.',
    });
    logger.info('WorkflowEngine', 'Mission execution complete.');
  }
}

export const workflowEngine = new WorkflowEngine();

