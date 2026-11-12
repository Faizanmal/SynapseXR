/**
 * Procedural 3D Holographic Agent Meshes & AI Companion Fallback.
 *
 * Each agent features a distinct geometric silhouette, faction palette,
 * semantic named hierarchy, and state-responsive indicator rings:
 * 1. Planner: Spherical geometric icosahedron core, cyan visual identity, dual orbiting planning rings
 * 2. Researcher: Violet crystalline prism, layered scanning rings, floating information particles
 * 3. Executor: Orange mechanical/geometric rotating gyro elements, power core, active state ring
 * 4. Reviewer: Green verification dual-octahedron core, audit rings, status indicator halo
 * 5. Companion Guide: Procedural fallback for the GLB companion drone
 */

import {
  BoxGeometry,
  createScenePrimitiveObject,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  SphereGeometry,
  TorusGeometry,
} from '@iwsdk/core';

const darkChrome = new MeshStandardMaterial({
  color: '#1a1f30',
  roughness: 0.25,
  metalness: 0.85,
});

function createStatusBeaconRing(initialColor: string): Mesh {
  const beacon = new Mesh(
    new TorusGeometry(0.13, 0.004, 8, 32),
    new MeshBasicMaterial({ color: initialColor }),
  );
  beacon.rotation.x = Math.PI / 2;
  beacon.position.y = -0.11;
  beacon.name = 'status-beacon-ring';
  return beacon;
}

/**
 * Attaches large, ergonomic spatial graph ports (port-in, port-out) and an
 * elevated overhead label badge (y = +0.16m) so connection lines never obscure labels.
 */
function attachGraphPortsAndBadge(root: Group, accentColor: string): void {
  const portIn = new Mesh(
    new SphereGeometry(0.024, 12, 12),
    new MeshBasicMaterial({ color: '#80ffdb' }),
  );
  portIn.position.set(-0.145, -0.02, 0);
  portIn.name = 'port-in';
  root.add(portIn);

  const portOut = new Mesh(
    new SphereGeometry(0.024, 12, 12),
    new MeshBasicMaterial({ color: accentColor }),
  );
  portOut.position.set(0.145, -0.02, 0);
  portOut.name = 'port-out';
  root.add(portOut);

  const labelBadge = new Mesh(
    new BoxGeometry(0.16, 0.028, 0.012),
    new MeshBasicMaterial({ color: accentColor }),
  );
  labelBadge.position.set(0, 0.16, 0);
  labelBadge.name = 'node-label-badge';
  root.add(labelBadge);
}

/**
 * 1. Planner Agent Hologram (Cyan #00e5ff)
 * - Spherical geometric core
 * - Animated orbiting rings
 * - Geometric planning motif
 */
export function createPlannerAgent(): Group {
  const root = new Group();
  root.name = 'PlannerAgentRoot';

  const core = new Mesh(
    new IcosahedronGeometry(0.068, 1),
    new MeshBasicMaterial({ color: '#00e5ff' }),
  );
  core.name = 'agent-core';
  root.add(core);

  const innerFrame = new Mesh(
    new DodecahedronGeometry(0.082, 0),
    darkChrome,
  );
  innerFrame.scale.set(1, 0.35, 1);
  innerFrame.name = 'planning-frame';
  root.add(innerFrame);

  const ring1 = new Mesh(
    new TorusGeometry(0.102, 0.005, 8, 32),
    new MeshBasicMaterial({ color: '#00b4d8' }),
  );
  ring1.name = 'orbit-ring-1';
  ring1.rotation.x = Math.PI / 4;
  root.add(ring1);

  const ring2 = new Mesh(
    new TorusGeometry(0.118, 0.004, 8, 32),
    new MeshBasicMaterial({ color: '#90e0ef' }),
  );
  ring2.name = 'orbit-ring-2';
  ring2.rotation.y = Math.PI / 3;
  root.add(ring2);

  root.add(createStatusBeaconRing('#00e5ff'));
  attachGraphPortsAndBadge(root, '#00e5ff');
  return root;
}

/**
 * 2. Researcher Agent Hologram (Violet #bd00ff)
 * - Layered scanning rings
 * - Floating information particles
 */
export function createResearcherAgent(): Group {
  const root = new Group();
  root.name = 'ResearcherAgentRoot';

  const core = new Mesh(
    new OctahedronGeometry(0.068, 0),
    new MeshBasicMaterial({ color: '#bd00ff' }),
  );
  core.name = 'agent-core';
  core.scale.set(0.85, 1.35, 0.85);
  root.add(core);

  // Layered scanning rings
  const scanRingUpper = new Mesh(
    new TorusGeometry(0.095, 0.004, 8, 32),
    new MeshBasicMaterial({ color: '#c77dff' }),
  );
  scanRingUpper.rotation.x = Math.PI / 2;
  scanRingUpper.position.y = 0.035;
  scanRingUpper.name = 'scan-ring-upper';
  root.add(scanRingUpper);

  const scanRingLower = new Mesh(
    new TorusGeometry(0.095, 0.004, 8, 32),
    new MeshBasicMaterial({ color: '#9d4edd' }),
  );
  scanRingLower.rotation.x = Math.PI / 2;
  scanRingLower.position.y = -0.035;
  scanRingLower.name = 'scan-ring-lower';
  root.add(scanRingLower);

  // Floating information particles
  const satMat = new MeshBasicMaterial({ color: '#e0aaff' });
  const sat1 = new Mesh(new OctahedronGeometry(0.018, 0), satMat);
  sat1.position.set(0.11, 0.05, 0);
  sat1.name = 'satellite-1';
  root.add(sat1);

  const sat2 = new Mesh(new OctahedronGeometry(0.018, 0), satMat);
  sat2.position.set(-0.09, -0.05, 0.07);
  sat2.name = 'satellite-2';
  root.add(sat2);

  const sat3 = new Mesh(new OctahedronGeometry(0.018, 0), satMat);
  sat3.position.set(-0.06, 0.07, -0.08);
  sat3.name = 'satellite-3';
  root.add(sat3);

  root.add(createStatusBeaconRing('#bd00ff'));
  attachGraphPortsAndBadge(root, '#bd00ff');
  return root;
}

/**
 * 3. Executor Agent Hologram (Orange #ff9100)
 * - Mechanical/geometric rotating elements
 * - Distinct active/execution state
 */
export function createExecutorAgent(): Group {
  const root = new Group();
  root.name = 'ExecutorAgentRoot';

  const core = new Mesh(
    new CylinderGeometry(0.038, 0.038, 0.09, 16),
    new MeshBasicMaterial({ color: '#ff9100' }),
  );
  core.name = 'agent-core';
  root.add(core);

  const gyro = new Mesh(
    new TorusGeometry(0.092, 0.008, 8, 32),
    darkChrome,
  );
  gyro.name = 'gyro-ring';
  gyro.rotation.x = Math.PI / 2;
  root.add(gyro);

  const coil = new Mesh(
    new TorusGeometry(0.112, 0.005, 8, 32),
    new MeshBasicMaterial({ color: '#ffb703' }),
  );
  coil.name = 'accelerator-coil';
  coil.rotation.z = Math.PI / 5;
  root.add(coil);

  root.add(createStatusBeaconRing('#ff9100'));
  attachGraphPortsAndBadge(root, '#ff9100');
  return root;
}

/**
 * 4. Reviewer Agent Hologram (Green #00e676)
 * - Verification-style ring geometry
 * - Success and warning states
 */
export function createReviewerAgent(): Group {
  const root = new Group();
  root.name = 'ReviewerAgentRoot';

  const core1 = new Mesh(
    new OctahedronGeometry(0.064, 0),
    new MeshBasicMaterial({ color: '#00e676' }),
  );
  core1.name = 'agent-core';
  root.add(core1);

  const core2 = new Mesh(
    new OctahedronGeometry(0.064, 0),
    new MeshBasicMaterial({ color: '#57cc99' }),
  );
  core2.rotation.y = Math.PI / 4;
  core2.rotation.z = Math.PI / 4;
  core2.name = 'audit-ring';
  root.add(core2);

  const shield = createScenePrimitiveObject(
    {
      geometry: {
        type: 'lathe',
        profile: [
          [0.082, 0],
          [0.122, 0.004],
          [0.122, 0.008],
          [0.082, 0.008],
        ],
        segments: 32,
      },
    },
    darkChrome,
  );
  shield.position.y = -0.01;
  shield.name = 'scanner-shield';
  root.add(shield);

  root.add(createStatusBeaconRing('#00e676'));
  attachGraphPortsAndBadge(root, '#00e676');
  return root;
}

/**
 * 5. Procedural Companion Drone Fallback
 * Used if GLB loading encounters an offline or GPU barrier.
 */
export function createCompanionFallback(): Group {
  const root = new Group();
  root.name = 'CompanionFallbackRoot';

  const core = new Mesh(
    new OctahedronGeometry(0.06, 0),
    new MeshBasicMaterial({ color: '#00e5ff' }),
  );
  core.name = 'companion-core';
  root.add(core);

  const halo = new Mesh(
    new TorusGeometry(0.095, 0.006, 8, 24),
    darkChrome,
  );
  halo.rotation.x = Math.PI / 2;
  halo.name = 'companion-halo-ring';
  root.add(halo);

  const stabilizer = new Mesh(
    new TorusGeometry(0.075, 0.004, 8, 24),
    new MeshBasicMaterial({ color: '#00b4d8' }),
  );
  stabilizer.rotation.y = Math.PI / 3;
  stabilizer.name = 'companion-stabilizer-ring';
  root.add(stabilizer);

  return root;
}
