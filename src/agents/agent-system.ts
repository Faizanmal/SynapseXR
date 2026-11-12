/**
 * AgentNodeSystem: State-driven 3D animations for the 4 holographic AI agents
 * and the optional GLB AI Companion Drone.
 *
 * Adheres strictly to:
 * - Zero per-frame heap allocations (all Color instances pre-allocated in init())
 * - Delta-time frame-independent motion
 * - Full execution state visuals:
 *   - idle / ready: gentle floating bob and role-matched status beacon
 *   - Hovered: highlight / scale pulse (1.08x)
 *   - Selected / Pressed: visual focus (1.12x) and synchronized rapid ring spin
 *   - running: active rotating energy (3.5x speed + vertical scanning rings)
 *   - waiting_approval: amber pulse (#ffab00)
 *   - completed: emerald success beacon (#00e676) + gentle celebration pulse
 *   - failed: red warning state (#ff1744) + alert oscillation
 * - Automatic procedural fallback if GLTF companion fails to populate children
 */

import {
  Color,
  createSystem,
  Grabbed,
  Hovered,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Pressed,
} from '@iwsdk/core';
import { logger } from '../core/logger.js';
import { createCompanionFallback } from '../scene-assets/agents.scene-asset.js';
import { workflowStore } from '../workflows/workflow-store.js';
import { AgentNodeComponent, CompanionDroneComponent } from './agent-component.js';

export interface AgentAnimationMetrics {
  speedMultiplier: number;
  bobAmplitude: number;
  bobFrequency: number;
  targetScale: number;
  beaconHex: number;
}

/**
 * Pure deterministic helper to compute animation parameters from agent state.
 * Exported for unit testing without requiring a full WebGL runtime.
 */
export function computeAgentAnimationMetrics(
  role: string,
  status: string,
  isHovered: boolean,
  isSelected: boolean,
  time: number,
): AgentAnimationMetrics {
  let speedMultiplier = 1.0;
  let bobAmplitude = 0.022;
  let bobFrequency = 2.2;
  let targetScale = 1.0;

  // Default role color for idle/ready beacon
  let beaconHex = 0x00e5ff;
  if (role === 'researcher') beaconHex = 0xbd00ff;
  else if (role === 'executor') beaconHex = 0xff9100;
  else if (role === 'reviewer') beaconHex = 0x00e676;

  switch (status) {
    case 'running':
      speedMultiplier = 3.5;
      bobAmplitude = 0.036;
      bobFrequency = 4.5;
      targetScale = 1.06 + Math.sin(time * 6.0) * 0.03;
      break;
    case 'waiting_approval':
      speedMultiplier = 0.65;
      bobAmplitude = 0.018;
      bobFrequency = 3.2;
      targetScale = 1.04 + Math.sin(time * 5.0) * 0.04;
      beaconHex = 0xffab00; // Amber pulse
      break;
    case 'completed':
      speedMultiplier = 1.35;
      bobAmplitude = 0.025;
      bobFrequency = 2.6;
      targetScale = 1.05 + Math.sin(time * 3.5) * 0.02;
      beaconHex = 0x00e676; // Emerald verification glow
      break;
    case 'failed':
      speedMultiplier = 0.25;
      bobAmplitude = 0.012;
      bobFrequency = 9.0;
      targetScale = 0.98 + Math.sin(time * 12.0) * 0.03;
      beaconHex = 0xff1744; // Red warning state
      break;
    case 'cancelled':
      speedMultiplier = 0.2;
      bobAmplitude = 0.008;
      bobFrequency = 1.2;
      targetScale = 0.94;
      beaconHex = 0x607d8b;
      break;
    default:
      // idle or ready
      break;
  }

  if (isSelected) {
    targetScale = Math.max(targetScale, 1.12);
    speedMultiplier *= 1.35;
  } else if (isHovered) {
    targetScale = Math.max(targetScale, 1.08 + Math.sin(time * 7.0) * 0.025);
    speedMultiplier *= 1.15;
  }

  return {
    speedMultiplier,
    bobAmplitude,
    bobFrequency,
    targetScale,
    beaconHex,
  };
}

export class AgentNodeSystem extends createSystem({
  agents: { required: [AgentNodeComponent] },
  companions: { required: [CompanionDroneComponent] },
}) {
  private elapsedTime = 0;
  private scratchColor!: Color;
  private fallbackChecked = false;

  init(): void {
    this.elapsedTime = 0;
    this.scratchColor = new Color();
    this.fallbackChecked = false;

    // Subscribe to workflowStore changes to keep ECS AgentNodeComponent status synchronized
    const unsubStore = workflowStore.subscribe((workflow) => {
      this.queries.agents.entities.forEach((entity) => {
        const role = entity.getValue(AgentNodeComponent, 'role') ?? 'planner';
        const matchingNode = workflow.nodes.find((n) => n.role === role);
        if (matchingNode) {
          entity.setValue(AgentNodeComponent, 'status', matchingNode.status);
        }
      });
    });

    this.cleanupFuncs.push(unsubStore);
  }

  update(delta: number): void {
    this.elapsedTime += delta;
    const time = this.elapsedTime;

    // 1. Animate the 4 Agent Nodes
    this.queries.agents.entities.forEach((entity) => {
      const transform = entity.object3D;
      if (!transform) return;

      const role = entity.getValue(AgentNodeComponent, 'role') ?? 'planner';
      const status = entity.getValue(AgentNodeComponent, 'status') ?? 'idle';
      const baseY = entity.getValue(AgentNodeComponent, 'baseY') ?? 1.15;

      const hovered =
        entity.hasComponent(Hovered) ||
        Boolean(entity.getValue(AgentNodeComponent, 'isHovered'));
      const selected =
        entity.hasComponent(Pressed) ||
        Boolean(entity.getValue(AgentNodeComponent, 'isSelected'));

      const metrics = computeAgentAnimationMetrics(
        role,
        status,
        hovered,
        selected,
        time,
      );

      // Floating vertical motion (paused while actively Grabbed so hand translation is 1:1)
      if (!entity.hasComponent(Grabbed)) {
        transform.position.y =
          baseY + Math.sin(time * metrics.bobFrequency) * metrics.bobAmplitude;
      }

      // Smooth uniform scale interpolation for Hovered / Selected / Running states
      const currentScale = transform.scale.x;
      const nextScale =
        currentScale + (metrics.targetScale - currentScale) * Math.min(1, delta * 10);
      transform.scale.setScalar(nextScale);

      // Update status beacon ring color dynamically without allocating
      const beaconObj = transform.getObjectByName('status-beacon-ring') as Mesh | undefined;
      if (beaconObj && beaconObj.material instanceof MeshBasicMaterial) {
        this.scratchColor.setHex(metrics.beaconHex);
        beaconObj.material.color.copy(this.scratchColor);
      }

      const spd = metrics.speedMultiplier;

      // Planner rings & geometric frame
      const ring1 = transform.getObjectByName('orbit-ring-1');
      if (ring1) ring1.rotation.z += delta * 1.5 * spd;

      const ring2 = transform.getObjectByName('orbit-ring-2');
      if (ring2) ring2.rotation.x += delta * 1.8 * spd;

      const planningFrame = transform.getObjectByName('planning-frame');
      if (planningFrame) {
        planningFrame.rotation.y += delta * 0.9 * spd;
        planningFrame.rotation.x += delta * 0.45 * spd;
      }

      // Researcher scanning rings & orbiting data particles
      const scanUpper = transform.getObjectByName('scan-ring-upper');
      if (scanUpper) {
        scanUpper.position.y = 0.045 + Math.sin(time * 2.8 * spd) * 0.03;
        scanUpper.rotation.z += delta * 1.2 * spd;
      }

      const scanLower = transform.getObjectByName('scan-ring-lower');
      if (scanLower) {
        scanLower.position.y = -0.045 - Math.sin(time * 2.8 * spd) * 0.03;
        scanLower.rotation.z -= delta * 1.2 * spd;
      }

      const sat1 = transform.getObjectByName('satellite-1');
      if (sat1) {
        sat1.position.x = Math.cos(time * 2.6 * spd) * 0.135;
        sat1.position.z = Math.sin(time * 2.6 * spd) * 0.135;
      }
      const sat2 = transform.getObjectByName('satellite-2');
      if (sat2) {
        sat2.position.x = Math.cos(time * 2.6 * spd + 2.094) * 0.135;
        sat2.position.z = Math.sin(time * 2.6 * spd + 2.094) * 0.135;
      }
      const sat3 = transform.getObjectByName('satellite-3');
      if (sat3) {
        sat3.position.x = Math.cos(time * 2.6 * spd + 4.188) * 0.135;
        sat3.position.z = Math.sin(time * 2.6 * spd + 4.188) * 0.135;
      }

      // Executor mechanical gyroscope & accelerator coil
      const gyro = transform.getObjectByName('gyro-ring');
      if (gyro) {
        gyro.rotation.y += delta * 2.2 * spd;
        gyro.rotation.x += delta * 0.8 * spd;
      }

      const coil = transform.getObjectByName('accelerator-coil');
      if (coil) coil.rotation.z -= delta * 2.5 * spd;

      // Reviewer verification rings
      const auditRing = transform.getObjectByName('audit-ring');
      if (auditRing) auditRing.rotation.y -= delta * 1.4 * spd;

      const scannerShield = transform.getObjectByName('scanner-shield');
      if (scannerShield) {
        scannerShield.rotation.x = Math.PI / 3 + Math.sin(time * 2.0 * spd) * 0.25;
      }
    });

    // 2. Animate Companion Drone (and provide automatic procedural fallback if GLB failed)
    this.queries.companions.entities.forEach((entity) => {
      const transform = entity.object3D;
      if (!transform) return;

      if (!this.fallbackChecked && time > 3.0) {
        this.fallbackChecked = true;
        if (transform.children.length === 0) {
          logger.warn(
            'AgentNodeSystem',
            'CompanionDrone GLB hierarchy empty after 3s; attaching procedural fallback.',
          );
          const fallback: Object3D = createCompanionFallback();
          transform.add(fallback);
        }
      }

      const baseY = entity.getValue(CompanionDroneComponent, 'baseY') ?? 1.38;
      const mood = entity.getValue(CompanionDroneComponent, 'mood') ?? 'ready';
      const hovered = entity.hasComponent(Hovered);

      const moodSpeed = mood === 'active' ? 2.8 : hovered ? 1.8 : 1.0;

      // Gentle figure-8 / hover bob (paused while actively Grabbed)
      if (!entity.hasComponent(Grabbed)) {
        transform.position.y = baseY + Math.sin(time * 3.0) * 0.03;
        transform.rotation.y = Math.sin(time * 1.1) * 0.25;
      }

      const halo = transform.getObjectByName('companion-halo-ring');
      if (halo) {
        halo.rotation.z += delta * 1.8 * moodSpeed;
      }

      const stabilizer = transform.getObjectByName('companion-stabilizer-ring');
      if (stabilizer) {
        stabilizer.rotation.y -= delta * 2.4 * moodSpeed;
      }
    });
  }
}
