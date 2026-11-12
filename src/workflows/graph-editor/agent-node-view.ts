/**
 * AgentNodeView: Encapsulates the 3D visual state, ports, and overhead label badge
 * for a single WorkflowNode in the Spatial Workflow Graph Editor.
 */

import { Color, Mesh, MeshBasicMaterial, Object3D } from '@iwsdk/core';
import type { WorkflowNode } from '../domain-types.js';

export interface AgentNodeViewDescriptor {
  nodeId: string;
  role: WorkflowNode['role'];
  label: string;
  status: WorkflowNode['status'];
  position: [number, number, number];
  isSelected: boolean;
  isConnectionSource: boolean;
}

const ROLE_COLORS: Readonly<Record<string, number>> = {
  planner: 0x00e5ff,
  researcher: 0xbd00ff,
  executor: 0xff9100,
  reviewer: 0x00e676,
};

const STATUS_BADGE_COLORS: Readonly<Record<string, number>> = {
  idle: 0x546e7a,
  ready: 0x00e5ff,
  running: 0x00b4d8,
  waiting_approval: 0xffab00,
  completed: 0x00e676,
  failed: 0xff1744,
  cancelled: 0x78909c,
};

export class AgentNodeView {
  private scratchColor = new Color();

  /**
   * Synchronizes a 3D agent Object3D's ports (`port-in`, `port-out`) and
   * elevated label badge (`node-label-badge`) with the current workflow node state.
   */
  syncObject3D(object3D: Object3D, descriptor: AgentNodeViewDescriptor): void {
    const portIn = object3D.getObjectByName('port-in') as Mesh | undefined;
    if (portIn) {
      portIn.scale.setScalar(descriptor.isSelected ? 1.25 : 1.0);
    }

    const portOut = object3D.getObjectByName('port-out') as Mesh | undefined;
    if (portOut) {
      portOut.scale.setScalar(
        descriptor.isConnectionSource ? 1.55 : descriptor.isSelected ? 1.25 : 1.0,
      );
      if (portOut.material instanceof MeshBasicMaterial) {
        const hex = descriptor.isConnectionSource
          ? 0xffd600
          : (ROLE_COLORS[descriptor.role] ?? 0x00e5ff);
        this.scratchColor.setHex(hex);
        portOut.material.color.copy(this.scratchColor);
      }
    }

    const labelBadge = object3D.getObjectByName('node-label-badge') as
      | Mesh
      | undefined;
    if (labelBadge) {
      // Keep overhead label badge elevated at y = +0.16m so connection beams never obscure it
      labelBadge.position.set(0, 0.16, 0);
      labelBadge.scale.set(
        descriptor.isSelected ? 1.18 : 1.0,
        descriptor.isSelected ? 1.18 : 1.0,
        1.0,
      );
      if (labelBadge.material instanceof MeshBasicMaterial) {
        const badgeHex = descriptor.isSelected
          ? 0xffd600
          : (STATUS_BADGE_COLORS[descriptor.status] ??
            ROLE_COLORS[descriptor.role] ??
            0x00e5ff);
        this.scratchColor.setHex(badgeHex);
        labelBadge.material.color.copy(this.scratchColor);
      }
    }
  }
}

export const agentNodeView = new AgentNodeView();

