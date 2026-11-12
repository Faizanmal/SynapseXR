/**
 * AgentSphere Spatial Interaction State & Ergonomic Geometry Helpers.
 *
 * Manages hands-first XR interaction state:
 * - Hover, selection, active grab, and connection-linking state
 * - Seated ergonomic reachability bounds and out-of-reach recovery
 * - Magnetic pedestal snapping and spatial grid snapping
 * - Cooldown / anti-double-activation debounce
 * - Drag vs. select conflict resolution
 */

export type SpatialInputMode = 'hand' | 'controller' | 'pointer';

export type InteractionListener = (state: Readonly<InteractionStateData>) => void;

export class InteractionStore {
  private state: InteractionStateData;
  private listeners = new Set<InteractionListener>();

  constructor(initial: InteractionStateData) {
    this.state = { ...initial };
  }

  getState(): Readonly<InteractionStateData> {
    return this.state;
  }

  setState(partial: Partial<InteractionStateData>): void {
    this.state = {
      ...this.state,
      ...partial,
    };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  subscribe(listener: InteractionListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export type SpatialActionType =
  | 'start_run'
  | 'cancel_run'
  | 'reset_workflow'
  | 'approve_action'
  | 'reject_action'
  | 'toggle_results'
  | 'recenter_workspace'
  | 'cycle_template'
  | 'validate_graph'
  | 'auto_layout'
  | 'undo_edit'
  | 'redo_edit'
  | 'save_workflow';

export interface WorkspaceBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  maxRadialDistance: number;
}

/**
 * Seated ergonomic workspace envelope (in meters relative to world origin).
 * Keeps all interactive agents within comfortable seated arm/ray reach.
 */
export const SEATED_WORKSPACE_BOUNDS: WorkspaceBounds = {
  minX: -1.15,
  maxX: 1.15,
  minY: 0.82,
  maxY: 1.65,
  minZ: -1.45,
  maxZ: -0.42,
  maxRadialDistance: 1.6,
};

/**
 * Default ergonomic home positions for each agent role and companion drone.
 */
export const DEFAULT_AGENT_POSITIONS: Readonly<
  Record<string, [number, number, number]>
> = {
  'agent-planner': [-0.48, 1.15, -0.75],
  'agent-researcher': [-0.16, 1.25, -0.92],
  'agent-executor': [0.16, 1.25, -0.92],
  'agent-reviewer': [0.48, 1.15, -0.75],
  'companion-drone': [0.68, 1.38, -0.72],
};

/**
 * Pedestal snap anchors (x, y, z) where agent nodes magnetically align when released nearby.
 */
export const PEDESTAL_SNAP_ANCHORS: ReadonlyArray<{
  id: string;
  position: [number, number, number];
}> = [
  { id: 'slot-left-outer', position: [-0.48, 1.15, -0.75] },
  { id: 'slot-left-inner', position: [-0.16, 1.25, -0.92] },
  { id: 'slot-right-inner', position: [0.16, 1.25, -0.92] },
  { id: 'slot-right-outer', position: [0.48, 1.15, -0.75] },
  { id: 'slot-center-focus', position: [0.0, 1.18, -0.68] },
];

export interface InteractionStateData {
  hoveredEntityId: string | null;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  pendingConnectionSourceId: string | null;
  activeGrabEntityId: string | null;
  grabStartPosition: [number, number, number] | null;
  grabCurrentPosition: [number, number, number] | null;
  inspectorOpen: boolean;
  activeInputMode: SpatialInputMode;
  lastActionTimestampMs: number;
  lastActionType: string | null;
  lastActionSummary: string;
  recenterCount: number;
}

export const INITIAL_INTERACTION_STATE: InteractionStateData = {
  hoveredEntityId: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  pendingConnectionSourceId: null,
  activeGrabEntityId: null,
  grabStartPosition: null,
  grabCurrentPosition: null,
  inspectorOpen: true,
  activeInputMode: 'hand',
  lastActionTimestampMs: 0,
  lastActionType: null,
  lastActionSummary: 'Ready for hands-first spatial input',
  recenterCount: 0,
};

/**
 * Singleton reactive store for spatial interaction state.
 */
export const interactionState = new InteractionStore(
  INITIAL_INTERACTION_STATE,
);

/**
 * Reset interaction state to clean defaults (used by tests and workspace reset).
 */
export function resetInteractionState(): void {
  interactionState.setState({ ...INITIAL_INTERACTION_STATE });
}

/**
 * Checks whether an object position is outside easy seated reach.
 */
export function isOutsideEasyReach(
  position: readonly [number, number, number],
  bounds: WorkspaceBounds = SEATED_WORKSPACE_BOUNDS,
): boolean {
  const [x, y, z] = position;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return true;
  }
  const radialSq = x * x + z * z;
  if (radialSq > bounds.maxRadialDistance * bounds.maxRadialDistance) {
    return true;
  }
  return (
    x < bounds.minX ||
    x > bounds.maxX ||
    y < bounds.minY ||
    y > bounds.maxY ||
    z < bounds.minZ ||
    z > bounds.maxZ
  );
}

/**
 * Clamps a 3D position into the reachable seated workspace envelope.
 */
export function clampToReachableWorkspace(
  position: readonly [number, number, number],
  bounds: WorkspaceBounds = SEATED_WORKSPACE_BOUNDS,
): [number, number, number] {
  const rawX = Number.isFinite(position[0]) ? position[0] : 0;
  const rawY = Number.isFinite(position[1]) ? position[1] : 1.15;
  const rawZ = Number.isFinite(position[2]) ? position[2] : -0.75;

  let x = Math.max(bounds.minX, Math.min(bounds.maxX, rawX));
  const y = Math.max(bounds.minY, Math.min(bounds.maxY, rawY));
  let z = Math.max(bounds.minZ, Math.min(bounds.maxZ, rawZ));

  const horizDist = Math.hypot(x, z);
  if (horizDist > bounds.maxRadialDistance && horizDist > 0) {
    const scale = bounds.maxRadialDistance / horizDist;
    x *= scale;
    z *= scale;
    z = Math.max(bounds.minZ, Math.min(bounds.maxZ, z));
  }

  return [
    Math.round(x * 1000) / 1000,
    Math.round(y * 1000) / 1000,
    Math.round(z * 1000) / 1000,
  ];
}

/**
 * Computes a safe recovery position for an entity that was thrown or moved
 * far outside comfortable reach. If severely out of bounds (> 2.2m away or NaN),
 * returns its home pedestal position; otherwise clamps it into the workspace.
 */
export function computeRecoveryPosition(
  entityId: string,
  currentPosition: readonly [number, number, number],
  bounds: WorkspaceBounds = SEATED_WORKSPACE_BOUNDS,
): [number, number, number] {
  const home = DEFAULT_AGENT_POSITIONS[entityId] ?? [0, 1.15, -0.75];
  const [x, y, z] = currentPosition;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return [...home];
  }
  const distFromOrigin = Math.hypot(x, y - 1.1, z);
  if (distFromOrigin > 2.2 || y < 0.45 || z > 0.1) {
    return [...home];
  }
  return clampToReachableWorkspace(currentPosition, bounds);
}

/**
 * Snaps a released agent position to the nearest pedestal anchor if within `snapRadius`
 * (default 0.14m), or rounds to a clean 0.02m spatial grid for stable placement.
 */
export function snapToWorkspaceSlot(
  position: readonly [number, number, number],
  snapRadius = 0.14,
  gridSize = 0.02,
): { position: [number, number, number]; snappedToSlotId: string | null } {
  const clamped = clampToReachableWorkspace(position);

  let bestSlotId: string | null = null;
  let bestDist = snapRadius;

  for (const anchor of PEDESTAL_SNAP_ANCHORS) {
    const dx = clamped[0] - anchor.position[0];
    const dy = clamped[1] - anchor.position[1];
    const dz = clamped[2] - anchor.position[2];
    const dist = Math.hypot(dx, dy, dz);
    if (dist <= bestDist) {
      bestDist = dist;
      bestSlotId = anchor.id;
    }
  }

  if (bestSlotId) {
    const matched = PEDESTAL_SNAP_ANCHORS.find((a) => a.id === bestSlotId)!;
    return {
      position: [...matched.position],
      snappedToSlotId: bestSlotId,
    };
  }

  if (gridSize > 0) {
    return {
      position: [
        Math.round(clamped[0] / gridSize) * gridSize,
        Math.round(clamped[1] / gridSize) * gridSize,
        Math.round(clamped[2] / gridSize) * gridSize,
      ],
      snappedToSlotId: null,
    };
  }

  return { position: clamped, snappedToSlotId: null };
}

/**
 * Guard against accidental double-activation of spatial buttons or pinch toggles.
 */
export function canActivateInteraction(
  nowMs: number,
  lastActivationMs: number,
  cooldownMs = 350,
): boolean {
  if (lastActivationMs <= 0) return true;
  return nowMs - lastActivationMs >= cooldownMs;
}

/**
 * Resolves conflict between dragging an agent and tapping/selecting an agent.
 * Returns true if the gesture moved beyond `dragThresholdMeters` (default 0.035m).
 */
export function isDragGesture(
  startPos: readonly [number, number, number] | null,
  endPos: readonly [number, number, number] | null,
  dragThresholdMeters = 0.035,
): boolean {
  if (!startPos || !endPos) return false;
  const dx = endPos[0] - startPos[0];
  const dy = endPos[1] - startPos[1];
  const dz = endPos[2] - startPos[2];
  return Math.hypot(dx, dy, dz) >= dragThresholdMeters;
}

