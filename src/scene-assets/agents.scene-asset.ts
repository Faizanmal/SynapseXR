/**
 * Procedural 3D Holographic Agent Meshes.
 *
 * Each agent features a distinct geometric silhouette, faction palette,
 * and orbital ring elements:
 * - Planner: 12-sided faceted core with dual orbital rings (Electric Cyan)
 * - Researcher: Crystalline floating prism surrounded by orbiting satellite crystals (Amethyst Violet)
 * - Executor: Concentric gyro rings encasing an energized engine cylinder (Solar Amber)
 * - Reviewer: Dual intersecting octahedrons with an emitter shield (Emerald Green)
 */

import {
  createScenePrimitiveObject,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  TorusGeometry,
} from '@iwsdk/core';

// Base materials for agent hulls
const darkChrome = new MeshStandardMaterial({
  color: '#1a1f30',
  roughness: 0.2,
  metalness: 0.8,
});

/**
 * 1. Planner Agent Hologram (Cyan #00e5ff)
 */
export function createPlannerAgent(): Group {
  const root = new Group();

  // Glowing Icosahedron Core
  const core = new Mesh(
    new IcosahedronGeometry(0.065, 0),
    new MeshBasicMaterial({ color: '#00e5ff' }),
  );
  core.name = 'agent-core';
  root.add(core);

  // Outer orbital ring 1
  const ring1 = new Mesh(
    new TorusGeometry(0.095, 0.005, 8, 32),
    new MeshBasicMaterial({ color: '#00b4d8' }),
  );
  ring1.name = 'orbit-ring-1';
  ring1.rotation.x = Math.PI / 4;
  root.add(ring1);

  // Outer orbital ring 2
  const ring2 = new Mesh(
    new TorusGeometry(0.11, 0.004, 8, 32),
    new MeshBasicMaterial({ color: '#90e0ef' }),
  );
  ring2.name = 'orbit-ring-2';
  ring2.rotation.y = Math.PI / 3;
  root.add(ring2);

  return root;
}

/**
 * 2. Researcher Agent Hologram (Violet #bd00ff)
 */
export function createResearcherAgent(): Group {
  const root = new Group();

  // Faceted crystal prism core
  const core = new Mesh(
    new OctahedronGeometry(0.07, 0),
    new MeshBasicMaterial({ color: '#bd00ff' }),
  );
  core.name = 'agent-core';
  core.scale.set(0.8, 1.4, 0.8);
  root.add(core);

  // Floating satellite data crystals
  const satMat = new MeshBasicMaterial({ color: '#e0aaff' });
  const sat1 = new Mesh(new OctahedronGeometry(0.02, 0), satMat);
  sat1.position.set(0.1, 0.05, 0);
  sat1.name = 'satellite-1';
  root.add(sat1);

  const sat2 = new Mesh(new OctahedronGeometry(0.02, 0), satMat);
  sat2.position.set(-0.08, -0.06, 0.07);
  sat2.name = 'satellite-2';
  root.add(sat2);

  const sat3 = new Mesh(new OctahedronGeometry(0.02, 0), satMat);
  sat3.position.set(-0.05, 0.08, -0.08);
  sat3.name = 'satellite-3';
  root.add(sat3);

  return root;
}

/**
 * 3. Executor Agent Hologram (Amber #ff9100)
 */
export function createExecutorAgent(): Group {
  const root = new Group();

  // Cylindrical power core
  const core = new Mesh(
    new CylinderGeometry(0.035, 0.035, 0.08, 16),
    new MeshBasicMaterial({ color: '#ff9100' }),
  );
  core.name = 'agent-core';
  root.add(core);

  // Concentric kinetic gyro ring
  const gyro = new Mesh(
    new TorusGeometry(0.09, 0.007, 8, 32),
    darkChrome,
  );
  gyro.name = 'gyro-ring';
  gyro.rotation.x = Math.PI / 2;
  root.add(gyro);

  // Energy accelerator coil
  const coil = new Mesh(
    new TorusGeometry(0.11, 0.005, 8, 32),
    new MeshBasicMaterial({ color: '#ffb703' }),
  );
  coil.name = 'accelerator-coil';
  coil.rotation.z = Math.PI / 6;
  root.add(coil);

  return root;
}

/**
 * 4. Reviewer Agent Hologram (Emerald #00e676)
 */
export function createReviewerAgent(): Group {
  const root = new Group();

  // Intersecting dual octahedron core
  const core1 = new Mesh(
    new OctahedronGeometry(0.065, 0),
    new MeshBasicMaterial({ color: '#00e676' }),
  );
  core1.name = 'agent-core';
  root.add(core1);

  const core2 = new Mesh(
    new OctahedronGeometry(0.065, 0),
    new MeshBasicMaterial({ color: '#57cc99' }),
  );
  core2.rotation.y = Math.PI / 4;
  core2.rotation.z = Math.PI / 4;
  core2.name = 'audit-ring';
  root.add(core2);

  // Horizontal scanner shield disc
  const shield = createScenePrimitiveObject(
    {
      geometry: {
        type: 'lathe',
        profile: [
          [0.08, 0],
          [0.12, 0.004],
          [0.12, 0.008],
          [0.08, 0.008],
        ],
        segments: 32,
      },
    },
    darkChrome,
  );
  shield.position.y = -0.01;
  shield.name = 'scanner-shield';
  root.add(shield);

  return root;
}

