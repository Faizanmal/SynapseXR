/**
 * Hands-first Guided Onboarding Tutorial Controller for AgentSphere.
 * Teaches users one interaction at a time:
 * 1. Pinch to select agent
 * 2. Grab and move agent node in 3D space
 * 3. Connect nodes using spatial connector handles
 * 4. Tap the Start Run button to execute
 * 5. Review results and sign off at the human approval gate
 */

export interface TutorialStep {
  id: string;
  stepNumber: number;
  title: string;
  instruction: string;
  actionHint: string;
  completed: boolean;
}

export class OnboardingTutorial {
  private activeStepIndex = 0;
  private isVisible = true;
  private isCompleted = false;

  private steps: TutorialStep[] = [
    {
      id: 'step-welcome',
      stepNumber: 1,
      title: 'Welcome to SynapseXR',
      instruction: 'You are seated in the AI Orchestration Laboratory. Point and pinch at an agent hologram to focus on it.',
      actionHint: 'Pinch index & thumb or click an Agent Core',
      completed: false,
    },
    {
      id: 'step-reposition',
      stepNumber: 2,
      title: 'Spatial Repositioning',
      instruction: 'Reach out to grab any agent node and adjust its position along the circular workspace platform.',
      actionHint: 'Squeeze hand / proximity grab to move',
      completed: false,
    },
    {
      id: 'step-connect',
      stepNumber: 3,
      title: 'Connect Pipeline',
      instruction: 'Select a source agent, then select a downstream target to establish an execution conduit.',
      actionHint: 'Pinch Planner then pinch Researcher',
      completed: false,
    },
    {
      id: 'step-execute',
      stepNumber: 4,
      title: 'Launch Multi-Agent Mission',
      instruction: 'Tap the green [Start Run] button on your command console to initiate the multi-stage pipeline.',
      actionHint: 'Tap Start Run with fingertip or ray',
      completed: false,
    },
    {
      id: 'step-inspect-approve',
      stepNumber: 5,
      title: 'Inspect & Sign Off',
      instruction: 'Inspect generated agent deliverables on the right console. Approve the plan to complete the mission.',
      actionHint: 'Tap [Approve Action] on the console',
      completed: false,
    },
  ];

  getCurrentStep(): TutorialStep | null {
    if (this.isCompleted || !this.isVisible) return null;
    return this.steps[this.activeStepIndex] ?? null;
  }

  getAllSteps(): TutorialStep[] {
    return [...this.steps];
  }

  isTutorialActive(): boolean {
    return this.isVisible && !this.isCompleted;
  }

  advanceStep(): TutorialStep | null {
    if (this.activeStepIndex < this.steps.length) {
      this.steps[this.activeStepIndex].completed = true;
    }
    this.activeStepIndex++;
    if (this.activeStepIndex >= this.steps.length) {
      this.isCompleted = true;
      this.isVisible = false;
      return null;
    }
    return this.steps[this.activeStepIndex];
  }

  skipTutorial(): void {
    this.steps.forEach((s) => (s.completed = true));
    this.isCompleted = true;
    this.isVisible = false;
  }

  restartTutorial(): void {
    this.steps.forEach((s) => (s.completed = false));
    this.activeStepIndex = 0;
    this.isCompleted = false;
    this.isVisible = true;
  }

  hide(): void {
    this.isVisible = false;
  }

  show(): void {
    this.isVisible = true;
  }
}

export const onboardingTutorial = new OnboardingTutorial();

