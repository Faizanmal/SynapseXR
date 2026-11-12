/**
 * AgentSphere central configuration.
 * Isolates runtime parameters, feature flags, and environment endpoints.
 */

export interface SynapseXRConfig {
  app: {
    name: string;
    version: string;
    mode: 'development' | 'production' | 'demo';
    isDemo: boolean;
  };
  xr: {
    defaultFov: number;
    nearPlane: number;
    farPlane: number;
    seatedEyeHeight: number;
    pointerFallback: boolean;
    handTracking: boolean;
  };
  features: {
    liveAiExecution: boolean;
    humanInTheLoopApproval: boolean;
    spatialSplineConnectors: boolean;
    soundEffects: boolean;
    holographicInspector: boolean;
  };
  api: {
    backendUrl: string;
    wsUrl: string;
    requestTimeoutMs: number;
  };
  performance: {
    maxAgentNodes: number;
    targetFrameTimeMs: number;
    lowPowerMode: boolean;
  };
}

export const config: SynapseXRConfig = {
  app: {
    name: 'SynapseXR',
    version: '0.1.0',
    mode: (import.meta.env.MODE as 'development' | 'production') || 'development',
    isDemo: import.meta.env.VITE_DEMO_MODE !== 'false',
  },
  xr: {
    defaultFov: 70,
    nearPlane: 0.001,
    farPlane: 200,
    seatedEyeHeight: 1.25,
    pointerFallback: true,
    handTracking: true,
  },
  features: {
    liveAiExecution: true,
    humanInTheLoopApproval: true,
    spatialSplineConnectors: true,
    soundEffects: true,
    holographicInspector: true,
  },
  api: {
    backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
    wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws',
    requestTimeoutMs: 30000,
  },
  performance: {
    maxAgentNodes: 8,
    targetFrameTimeMs: 13.8, // 72 fps target
    lowPowerMode: false,
  },
};

