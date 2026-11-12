/**
 * ConnectionRenderer: Live-updates 3D connection beam geometry, direction arrows,
 * and animated data-transfer energy pulses between connected agent nodes.
 *
 * Ensures connection lines route along the lower port plane (y - 0.02m) so they
 * never obscure elevated overhead node labels (y + 0.16m).
 */

import { Color, Mesh, MeshBasicMaterial, Object3D, Vector3 } from '@iwsdk/core';

export interface ConnectionRenderParams {
  sourcePosition: Vector3;
  targetPosition: Vector3;
  isSelected: boolean;
  isHovered: boolean;
  isDataTransferActive: boolean;
  time: number;
  delta: number;
}

export class ConnectionRenderer {
  private scratchStart = new Vector3();
  private scratchEnd = new Vector3();
  private scratchMidpoint = new Vector3();
  private scratchColor = new Color();

  updateConnectionObject(
    edgeObj: Object3D,
    params: ConnectionRenderParams,
  ): number {
    const {
      sourcePosition,
      targetPosition,
      isSelected,
      isHovered,
      isDataTransferActive,
      time,
      delta,
    } = params;

    // Route connection along the port plane (-0.02m Y offset) so overhead labels (+0.16m) are never obscured
    this.scratchStart.set(
      sourcePosition.x,
      sourcePosition.y - 0.02,
      sourcePosition.z,
    );
    this.scratchEnd.set(
      targetPosition.x,
      targetPosition.y - 0.02,
      targetPosition.z,
    );

    this.scratchMidpoint
      .addVectors(this.scratchStart, this.scratchEnd)
      .multiplyScalar(0.5);
    edgeObj.position.copy(this.scratchMidpoint);
    edgeObj.lookAt(this.scratchEnd);

    const dist = this.scratchStart.distanceTo(this.scratchEnd);

    // 1. Scale and color the main conduit cylinder (base height = 0.36m)
    const beamMesh = edgeObj.getObjectByName('edge-beam') as Mesh | undefined;
    if (beamMesh) {
      const lengthScale = Math.max(0.08, dist / 0.36);
      const thicknessScale = isSelected ? 1.55 : isHovered ? 1.35 : 1.0;
      beamMesh.scale.set(thicknessScale, lengthScale, thicknessScale);
      if (beamMesh.material instanceof MeshBasicMaterial) {
        const beamHex = isSelected
          ? 0xffd600
          : isHovered
            ? 0x80ffdb
            : isDataTransferActive
              ? 0x00e676
              : 0x00e5ff;
        this.scratchColor.setHex(beamHex);
        beamMesh.material.color.copy(this.scratchColor);
      }
    }

    // 2. Rotate and highlight the central selectable junction crystal
    const junction = edgeObj.getObjectByName('edge-junction') as
      | Mesh
      | undefined;
    if (junction) {
      junction.rotation.y += delta * (isSelected ? 4.2 : 1.6);
      junction.scale.setScalar(isSelected ? 1.38 : isHovered ? 1.2 : 1.0);
      if (junction.material instanceof MeshBasicMaterial) {
        this.scratchColor.setHex(
          isSelected ? 0xffd600 : isHovered ? 0x00e676 : 0x80ffdb,
        );
        junction.material.color.copy(this.scratchColor);
      }
    }

    // 3. Position the directional cone arrow pointing toward the destination node
    const arrow = edgeObj.getObjectByName('edge-direction-arrow') as
      | Mesh
      | undefined;
    if (arrow) {
      arrow.position.set(0, 0, Math.min(dist * 0.28, 0.14));
      if (arrow.material instanceof MeshBasicMaterial) {
        this.scratchColor.setHex(isSelected ? 0xffd600 : 0x00e676);
        arrow.material.color.copy(this.scratchColor);
      }
    }

    // 4. Animate the data-transfer energy pulse sphere from source (-dist/2) to target (+dist/2)
    const pulse = edgeObj.getObjectByName('edge-data-pulse') as
      | Mesh
      | undefined;
    if (pulse) {
      const pulseSpeed = isDataTransferActive ? 1.65 : 0.55;
      const phase = ((time * pulseSpeed) % 1 + 1) % 1; // 0..1 from source to target
      const travelSpan = Math.max(0.06, dist * 0.82);
      pulse.position.set(0, 0, (phase - 0.5) * travelSpan);
      pulse.scale.setScalar(isDataTransferActive ? 1.35 : 0.85);
      if (pulse.material instanceof MeshBasicMaterial) {
        this.scratchColor.setHex(isDataTransferActive ? 0x00e676 : 0x90e0ef);
        pulse.material.color.copy(this.scratchColor);
      }
    }

    return dist;
  }
}

export const connectionRenderer = new ConnectionRenderer();

