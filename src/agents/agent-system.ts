/**
 * AgentNodeSystem: Animates agent orbital rings and gentle floating bob.
 * Adheres to 0 per-frame heap allocations rule.
 */

import { createSystem } from '@iwsdk/core';
import { AgentNodeComponent } from './agent-component.js';

export class AgentNodeSystem extends createSystem({
  agents: { required: [AgentNodeComponent] },
}) {
  private elapsedTime = 0;

  init(): void {
    this.elapsedTime = 0;
  }

  update(delta: number): void {
    this.elapsedTime += delta;
    const time = this.elapsedTime;

    this.queries.agents.entities.forEach((entity) => {
      const transform = entity.object3D;
      if (!transform) return;

      const baseY = entity.getValue(AgentNodeComponent, 'baseY') ?? 1.15;
      transform.position.y = baseY + Math.sin(time * 2.5) * 0.025;

      // Rotate orbital rings inside the model
      const ring1 = transform.getObjectByName('orbit-ring-1');
      if (ring1) ring1.rotation.z += delta * 1.5;

      const ring2 = transform.getObjectByName('orbit-ring-2');
      if (ring2) ring2.rotation.x += delta * 1.8;

      const gyro = transform.getObjectByName('gyro-ring');
      if (gyro) gyro.rotation.y += delta * 2.0;

      const coil = transform.getObjectByName('accelerator-coil');
      if (coil) coil.rotation.z -= delta * 2.2;

      const auditRing = transform.getObjectByName('audit-ring');
      if (auditRing) auditRing.rotation.y -= delta * 1.2;

      const sat1 = transform.getObjectByName('satellite-1');
      if (sat1) {
        sat1.position.x = Math.cos(time * 3) * 0.12;
        sat1.position.z = Math.sin(time * 3) * 0.12;
      }
      const sat2 = transform.getObjectByName('satellite-2');
      if (sat2) {
        sat2.position.x = Math.cos(time * 3 + 2.1) * 0.11;
        sat2.position.z = Math.sin(time * 3 + 2.1) * 0.11;
      }
    });
  }
}
