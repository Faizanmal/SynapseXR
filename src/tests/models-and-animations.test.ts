/**
 * Unit tests for Phase 5: Custom 3D Models, GLB Pipeline, and State-Driven Animations.
 */

import { describe, expect, it } from 'vitest';
import { computeAgentAnimationMetrics } from '../agents/agent-system.js';
import {
  createCompanionFallback,
  createExecutorAgent,
  createPlannerAgent,
  createResearcherAgent,
  createReviewerAgent,
} from '../scene-assets/agents.scene-asset.js';
import { createCommandPlatform } from '../scene-assets/command-center.scene-asset.js';

describe('Phase 5: Custom 3D Models & State Animations', () => {
  it('constructs Planner Agent with core, orbiting rings, planning frame, and status beacon', () => {
    const planner = createPlannerAgent();
    expect(planner.parent).toBeNull();
    expect(planner.getObjectByName('agent-core')).toBeDefined();
    expect(planner.getObjectByName('orbit-ring-1')).toBeDefined();
    expect(planner.getObjectByName('orbit-ring-2')).toBeDefined();
    expect(planner.getObjectByName('planning-frame')).toBeDefined();
    expect(planner.getObjectByName('status-beacon-ring')).toBeDefined();
  });

  it('constructs Researcher Agent with layered scanning rings and 3 floating data particles', () => {
    const researcher = createResearcherAgent();
    expect(researcher.parent).toBeNull();
    expect(researcher.getObjectByName('agent-core')).toBeDefined();
    expect(researcher.getObjectByName('scan-ring-upper')).toBeDefined();
    expect(researcher.getObjectByName('scan-ring-lower')).toBeDefined();
    expect(researcher.getObjectByName('satellite-1')).toBeDefined();
    expect(researcher.getObjectByName('satellite-2')).toBeDefined();
    expect(researcher.getObjectByName('satellite-3')).toBeDefined();
    expect(researcher.getObjectByName('status-beacon-ring')).toBeDefined();
  });

  it('constructs Executor Agent with mechanical gyroscope ring and accelerator coil', () => {
    const executor = createExecutorAgent();
    expect(executor.parent).toBeNull();
    expect(executor.getObjectByName('agent-core')).toBeDefined();
    expect(executor.getObjectByName('gyro-ring')).toBeDefined();
    expect(executor.getObjectByName('accelerator-coil')).toBeDefined();
    expect(executor.getObjectByName('status-beacon-ring')).toBeDefined();
  });

  it('constructs Reviewer Agent with verification ring and scanner shield', () => {
    const reviewer = createReviewerAgent();
    expect(reviewer.parent).toBeNull();
    expect(reviewer.getObjectByName('agent-core')).toBeDefined();
    expect(reviewer.getObjectByName('audit-ring')).toBeDefined();
    expect(reviewer.getObjectByName('scanner-shield')).toBeDefined();
    expect(reviewer.getObjectByName('status-beacon-ring')).toBeDefined();
  });

  it('constructs Command Center Platform with lightweight panel supports', () => {
    const platform = createCommandPlatform();
    expect(platform.parent).toBeNull();
    expect(platform.getObjectByName('panel-support-left')).toBeDefined();
    expect(platform.getObjectByName('panel-support-right')).toBeDefined();
  });

  it('constructs procedural Companion Fallback with matching node names', () => {
    const fallback = createCompanionFallback();
    expect(fallback.parent).toBeNull();
    expect(fallback.getObjectByName('companion-core')).toBeDefined();
    expect(fallback.getObjectByName('companion-halo-ring')).toBeDefined();
    expect(fallback.getObjectByName('companion-stabilizer-ring')).toBeDefined();
  });

  it('validates generated binary GLB asset at public/models/companion-drone.glb', async () => {
    const fsMod = (await import('node:fs' as string)) as {
      readFileSync: (p: string) => Uint8Array;
    };
    const raw = fsMod.readFileSync('public/models/companion-drone.glb');
    const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);

    // Check 12-byte GLB header: magic 'glTF' (0x46546C67), version 2, total length
    expect(raw.byteLength).toBeGreaterThan(1000);
    expect(view.getUint32(0, true)).toBe(0x46546c67);
    expect(view.getUint32(4, true)).toBe(2);
    expect(view.getUint32(8, true)).toBe(raw.byteLength);

    // Extract JSON chunk to verify named nodes and PBR materials
    const jsonChunkLength = view.getUint32(12, true);
    const jsonChunkType = view.getUint32(16, true);
    expect(jsonChunkType).toBe(0x4e4f534a); // 'JSON'

    const jsonBytes = raw.subarray(20, 20 + jsonChunkLength);
    const jsonString = new TextDecoder().decode(jsonBytes).trim();
    const gltf = JSON.parse(jsonString) as {
      asset: { version: string };
      nodes: Array<{ name: string }>;
    };
    expect(gltf.asset.version).toBe('2.0');
    const nodeNames = gltf.nodes.map((n) => n.name);
    expect(nodeNames).toEqual([
      'companion-core',
      'companion-halo-ring',
      'companion-stabilizer-ring',
      'CompanionDroneRoot',
    ]);
  });

  it('computes distinct state-driven animation metrics for all execution & interaction states', () => {
    const idle = computeAgentAnimationMetrics('planner', 'idle', false, false, 1.0);
    expect(idle.speedMultiplier).toBe(1.0);
    expect(idle.beaconHex).toBe(0x00e5ff);

    const running = computeAgentAnimationMetrics('planner', 'running', false, false, 1.0);
    expect(running.speedMultiplier).toBe(3.5);
    expect(running.bobAmplitude).toBeGreaterThan(idle.bobAmplitude);

    const waiting = computeAgentAnimationMetrics(
      'executor',
      'waiting_approval',
      false,
      false,
      1.0,
    );
    expect(waiting.beaconHex).toBe(0xffab00); // Amber pulse

    const completed = computeAgentAnimationMetrics(
      'researcher',
      'completed',
      false,
      false,
      1.0,
    );
    expect(completed.beaconHex).toBe(0x00e676); // Emerald completion glow

    const failed = computeAgentAnimationMetrics('reviewer', 'failed', false, false, 1.0);
    expect(failed.beaconHex).toBe(0xff1744); // Red warning state

    const hovered = computeAgentAnimationMetrics('planner', 'idle', true, false, 1.0);
    expect(hovered.targetScale).toBeGreaterThan(1.05);

    const selected = computeAgentAnimationMetrics('planner', 'idle', false, true, 1.0);
    expect(selected.targetScale).toBeCloseTo(1.12, 2);
  });
});
