/**
 * AgentSphere Immersive Command Center Scene Asset.
 *
 * Procedurally authors the futuristic AI orchestration laboratory:
 * - Dark navy and graphite architectural shell
 * - Central circular command platform with holographic ring emitters
 * - Four agent podiums with glowing faction accents (Cyan, Purple, Amber, Emerald)
 * - Seated ergonomic workspace layout (centered around eye-height y ≈ 1.1m - 1.3m, radius 0.65m)
 * - Low-poly procedural geometry optimized for Intel HD 4000 GPU
 */

import {
  BoxGeometry,
  ConeGeometry,
  createSceneMaterial,
  createScenePrimitiveObject,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  OctahedronGeometry,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
} from '@iwsdk/core';

// Dark navy and graphite architectural materials
const navyChamberMaterial = createSceneMaterial({
  id: 'agentsphere-navy-chamber',
  model: 'standard',
  baseColor: '#0a0d18',
  roughness: 0.85,
});

const darkGraphiteMaterial = createSceneMaterial({
  id: 'agentsphere-dark-graphite',
  model: 'standard',
  baseColor: '#161a29',
  roughness: 0.45,
});

const metallicPedestalMaterial = createSceneMaterial({
  id: 'agentsphere-metallic-pedestal',
  model: 'standard',
  baseColor: '#1e2438',
  roughness: 0.35,
});

// Emissive accent materials
const cyanGlowMaterial = new MeshBasicMaterial({
  color: '#00e5ff',
});

const violetGlowMaterial = new MeshBasicMaterial({
  color: '#bd00ff',
});

const amberGlowMaterial = new MeshBasicMaterial({
  color: '#ff9100',
});

const emeraldGlowMaterial = new MeshBasicMaterial({
  color: '#00e676',
});

/**
 * Procedural Command Center Floor with radial concentric rings.
 */
export function createCommandFloor(radius = 16): Group {
  const root = new Group();

  // Base circular dark platform
  const floorMesh = new Mesh(
    new CylinderGeometry(radius, radius, 0.1, 48),
    new MeshStandardMaterial({ color: '#090c16', roughness: 0.9 }),
  );
  floorMesh.position.y = -0.05;
  root.add(floorMesh);

  // Outer ambient ring
  const outerRing = new Mesh(
    new RingGeometry(radius - 0.4, radius - 0.1, 48),
    new MeshBasicMaterial({ color: '#131b30' }),
  );
  outerRing.rotation.x = -Math.PI / 2;
  outerRing.position.y = 0.001;
  root.add(outerRing);

  return root;
}

/**
 * Central Command Workspace Platform.
 * Low stepped dais that frames the seated operator's golden interaction sphere.
 */
export function createCommandPlatform(): Group {
  const root = new Group();

  // Tier 1 Base Platform
  const base = createScenePrimitiveObject(
    {
      geometry: {
        type: 'lathe',
        profile: [
          [0.001, 0],
          [2.2, 0],
          [2.22, 0.04],
          [2.15, 0.08],
          [0.001, 0.08],
        ],
        segments: 64,
      },
    },
    metallicPedestalMaterial,
  );
  root.add(base);

  // Glowing cyan holographic focus ring embedded in the dais floor
  const glowRing = new Mesh(
    new TorusGeometry(1.2, 0.008, 12, 64),
    cyanGlowMaterial,
  );
  glowRing.rotation.x = -Math.PI / 2;
  glowRing.position.y = 0.081;
  root.add(glowRing);

  // Inner dark acoustic mat
  const innerDisc = new Mesh(
    new RingGeometry(0.1, 1.15, 48),
    new MeshStandardMaterial({ color: '#0d111d', roughness: 0.95 }),
  );
  innerDisc.rotation.x = -Math.PI / 2;
  innerDisc.position.y = 0.081;
  root.add(innerDisc);

  // Lightweight holographic panel support pylons (Left & Right flanking arms)
  const leftPanelSupport = createScenePrimitiveObject(
    {
      geometry: {
        type: 'cylinder',
        radius: 0.025,
        height: 1.15,
      },
    },
    metallicPedestalMaterial,
  );
  leftPanelSupport.name = 'panel-support-left';
  leftPanelSupport.position.set(-1.35, 0.575, -0.55);
  root.add(leftPanelSupport);

  const rightPanelSupport = createScenePrimitiveObject(
    {
      geometry: {
        type: 'cylinder',
        radius: 0.025,
        height: 1.15,
      },
    },
    metallicPedestalMaterial,
  );
  rightPanelSupport.name = 'panel-support-right';
  rightPanelSupport.position.set(1.35, 0.575, -0.55);
  root.add(rightPanelSupport);

  return root;
}

/**
 * Seated Ergonomic Command Console Desk.
 * Sits directly in front of the seated operator (y ≈ 0.85m to 0.92m).
 */
export function createCommandConsoleDesk(): Group {
  const root = new Group();

  // Curved tabletop console
  const consoleDesk = createScenePrimitiveObject(
    {
      geometry: {
        type: 'roundedBox',
        size: [1.35, 0.04, 0.48],
        radius: 0.018,
        segments: 4,
      },
    },
    darkGraphiteMaterial,
  );
  consoleDesk.position.set(0, 0.88, -0.65);
  root.add(consoleDesk);

  // Pedestal support stem
  const stem = createScenePrimitiveObject(
    {
      geometry: {
        type: 'cylinder',
        radius: 0.08,
        height: 0.88,
      },
    },
    metallicPedestalMaterial,
  );
  stem.position.set(0, 0.44, -0.65);
  root.add(stem);

  // Holographic projection emitter strip
  const emitterStrip = createScenePrimitiveObject(
    {
      geometry: {
        type: 'box',
        size: [0.8, 0.005, 0.015],
      },
    },
    cyanGlowMaterial,
  );
  emitterStrip.position.set(0, 0.901, -0.62);
  root.add(emitterStrip);

  return root;
}

/**
 * Dedicated Agent Hologram Pedestals (4 positions).
 */
export function createAgentPedestal(accentColor: string): Group {
  const root = new Group();

  const column = createScenePrimitiveObject(
    {
      geometry: {
        type: 'lathe',
        profile: [
          [0.001, 0],
          [0.18, 0],
          [0.16, 0.03],
          [0.08, 0.15],
          [0.07, 0.85],
          [0.14, 0.95],
          [0.001, 0.95],
        ],
        segments: 32,
      },
    },
    metallicPedestalMaterial,
  );
  root.add(column);

  // Accent emitter ring
  const accentMat = new MeshBasicMaterial({ color: accentColor });
  const ring = new Mesh(
    new TorusGeometry(0.13, 0.006, 8, 32),
    accentMat,
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.952;
  root.add(ring);

  return root;
}

export function createPlannerPedestal(): Group {
  return createAgentPedestal('#00e5ff'); // Cyan
}

export function createResearcherPedestal(): Group {
  return createAgentPedestal('#bd00ff'); // Violet
}

export function createExecutorPedestal(): Group {
  return createAgentPedestal('#ff9100'); // Amber
}

export function createReviewerPedestal(): Group {
  return createAgentPedestal('#00e676'); // Emerald
}

/**
 * Minimal Futuristic Background Arch Pillars.
 */
export function createChamberArchitecture(): Group {
  const root = new Group();

  const p1 = createScenePrimitiveObject(
    {
      geometry: {
        type: 'box',
        size: [0.4, 4.5, 0.4],
      },
    },
    navyChamberMaterial,
  );
  p1.position.set(-3.5, 2.25, -4.5);
  root.add(p1);

  const p2 = createScenePrimitiveObject(
    {
      geometry: {
        type: 'box',
        size: [0.4, 4.5, 0.4],
      },
    },
    navyChamberMaterial,
  );
  p2.position.set(3.5, 2.25, -4.5);
  root.add(p2);

  const horizontalBrace = createScenePrimitiveObject(
    {
      geometry: {
        type: 'box',
        size: [7.4, 0.25, 0.35],
      },
    },
    navyChamberMaterial,
  );
  horizontalBrace.position.set(0, 4.25, -4.5);
  root.add(horizontalBrace);

  return root;
}

/**
 * Large, accessible 3D tactile spatial button for hands-first poke and ray interaction.
 * Target footprint: 12cm wide x 4.5cm tall x 9cm deep.
 */
export function createSpatialActionButton(accentColor: string): Group {
  const root = new Group();
  root.name = 'SpatialActionButtonRoot';

  const baseHousing = new Mesh(
    new BoxGeometry(0.12, 0.028, 0.09),
    metallicPedestalMaterial,
  );
  baseHousing.name = 'button-housing';
  root.add(baseHousing);

  const cap = new Mesh(
    new BoxGeometry(0.104, 0.022, 0.074),
    new MeshBasicMaterial({ color: accentColor }),
  );
  cap.position.y = 0.018;
  cap.name = 'button-cap';
  root.add(cap);

  return root;
}

export function createStartRunButton(): Group {
  return createSpatialActionButton('#00e5ff'); // Cyan
}

export function createCancelRunButton(): Group {
  return createSpatialActionButton('#ff9100'); // Amber
}

export function createApproveButton(): Group {
  return createSpatialActionButton('#00e676'); // Emerald
}

export function createRejectButton(): Group {
  return createSpatialActionButton('#ff1744'); // Crimson
}

export function createToggleResultsButton(): Group {
  return createSpatialActionButton('#bd00ff'); // Violet
}

export function createRecenterButton(): Group {
  return createSpatialActionButton('#ffd600'); // Gold
}

/**
 * 3D Interactive Workflow Connection Beam & Selectable Junction Node.
 * Oriented along the Z-axis (unit length 0.36m by default, dynamically scaled by SelectionSystem).
 */
export function createWorkflowConnectionBeam(): Group {
  const root = new Group();
  root.name = 'WorkflowConnectionBeamRoot';

  const beam = new Mesh(
    new CylinderGeometry(0.008, 0.008, 0.36, 12),
    new MeshBasicMaterial({ color: '#00e5ff' }),
  );
  beam.rotation.x = Math.PI / 2;
  beam.name = 'edge-beam';
  root.add(beam);

  const junction = new Mesh(
    new OctahedronGeometry(0.036, 0),
    new MeshBasicMaterial({ color: '#80ffdb' }),
  );
  junction.name = 'edge-junction';
  root.add(junction);

  // Directional indicator cone pointing toward destination (+Z in local lookAt space)
  const directionArrow = new Mesh(
    new ConeGeometry(0.022, 0.055, 12),
    new MeshBasicMaterial({ color: '#00e676' }),
  );
  directionArrow.rotation.x = Math.PI / 2;
  directionArrow.position.z = 0.09;
  directionArrow.name = 'edge-direction-arrow';
  root.add(directionArrow);

  // Animated data transfer energy pulse sphere traveling along the conduit
  const dataPulse = new Mesh(
    new SphereGeometry(0.018, 12, 12),
    new MeshBasicMaterial({ color: '#ffffff' }),
  );
  dataPulse.name = 'edge-data-pulse';
  root.add(dataPulse);

  return root;
}

/**
 * 3D Holographic Results & Approval Inspector Panel.
 * Opens and closes in 3D space on the right wing of the command center.
 */
export function createResultsInspectorPanel(): Group {
  const root = new Group();
  root.name = 'ResultsInspectorPanelRoot';

  const backing = new Mesh(
    new BoxGeometry(0.42, 0.3, 0.022),
    darkGraphiteMaterial,
  );
  backing.name = 'panel-backing';
  root.add(backing);

  const screen = new Mesh(
    new BoxGeometry(0.38, 0.25, 0.026),
    new MeshBasicMaterial({ color: '#0f203c' }),
  );
  screen.name = 'panel-screen';
  root.add(screen);

  const statusBar = new Mesh(
    new BoxGeometry(0.34, 0.024, 0.03),
    new MeshBasicMaterial({ color: '#00e5ff' }),
  );
  statusBar.position.y = 0.095;
  statusBar.name = 'panel-status-bar';
  root.add(statusBar);

  return root;
}
