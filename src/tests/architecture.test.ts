import { describe, it, expect, vi } from 'vitest';
import { TypedEventBus } from '../core/event-bus.js';
import { store } from '../state/store.js';
import { AGENT_SPECS } from '../agents/agent-types.js';

describe('AgentSphere Architecture & State Modules', () => {
  it('TypedEventBus registers and fires events cleanly', () => {
    const bus = new TypedEventBus<{ 'test:event': { value: number } }>();
    const handler = vi.fn();

    const unsubscribe = bus.on('test:event', handler);
    bus.emit('test:event', { value: 42 });

    expect(handler).toHaveBeenCalledWith({ value: 42 });

    unsubscribe();
    bus.emit('test:event', { value: 100 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('StateStore updates agent states and notifies subscribers', () => {
    let capturedState = store.getState();
    const unsub = store.subscribe((s) => {
      capturedState = s;
    });

    store.updateAgent('agent-planner', { progress: 0.75 });
    expect(capturedState.agents['agent-planner'].progress).toBe(0.75);

    unsub();
  });

  it('Four core agent archetypes are properly configured', () => {
    expect(AGENT_SPECS.planner.displayName).toBe('Planner');
    expect(AGENT_SPECS.researcher.displayName).toBe('Researcher');
    expect(AGENT_SPECS.executor.displayName).toBe('Executor');
    expect(AGENT_SPECS.reviewer.displayName).toBe('Reviewer');
  });
});
