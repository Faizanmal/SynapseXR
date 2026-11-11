# AgentSphere - Architecture & System Design

**Competition**: Meta VR Start Developer Competition 2026  
**Track**: Productivity  
**Division**: New Experience  
**Target Award**: Best Agentic Interaction  

---

## 1. Executive Summary & Vision
**AgentSphere** is a hands-first, spatial computing VR application built with Meta's Immersive Web SDK (IWSDK) and Three.js. It enables knowledge workers, developers, and autonomous system architects to visually compose, monitor, and steer multi-agent AI workflows in an immersive 3D command center.

Users sit comfortably in a futuristic, seated-friendly spatial environment where AI agents (Planner, Researcher, Executor, Reviewer) exist as interactive 3D holographic agents. Users connect agents using tactile spatial cables/data pipes, trigger real multi-stage AI workflows with live streaming telemetry, inspect intermediate artifacts on spatial UIKitML holographic glass boards, and exercise human-in-the-loop oversight (approve, revise, or redirect proposed outputs).

---

## 2. Technical Stack & Architectural Layers

```
┌────────────────────────────────────────────────────────────────────────┐
│                          User in WebXR (Quest 3 / IWER)                │
│                 Hands-First Interaction & Spatial UI                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Immersive Web SDK (IWSDK v1.1.0-rc.2)               │
│  - ECS Architecture (World, System, Component, Query)                  │
│  - Spatial Inputs: Grab, Ray Interactable, Poke, Hand Tracking         │
│  - Spatial UI: UIKitML Panels & Custom Procedural 3D Holograms         │
│  - Three.js Engine: PBR Materials, Instanced Visuals, Cable Rendering │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ WebSockets / SSE / REST
┌───────────────────────────────────▼────────────────────────────────────┐
│                  Agent Orchestration Engine & Runtime                  │
│  - Client-side deterministic workflow execution engine                 │
│  - Optional FastAPI Backend for deep multi-provider LLM orchestration │
│  - State Machine: Idle -> Planning -> Researching -> Executing ->      │
│                   Reviewing -> Human Review / Approval -> Complete     │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Technologies
- **XR Runtime**: Meta Immersive Web SDK (`@iwsdk/core` v1.1.0-rc.2)
- **3D Graphics Engine**: Three.js integration supplied via `@iwsdk/core`
- **Spatial UI**: `@pmndrs/uikit`, `@pmndrs/uikit-horizon`, UIKitML
- **Language**: TypeScript 5.8+ (Strict Mode)
- **Physics & Interaction**: IWSDK Havok Physics, Grabbable, RayInteractable
- **XR Emulator**: IWER browser-based XR device emulation
- **AI Backend (Optional / Extensible)**: Python 3.13 + FastAPI with modular provider adapters (Google Gemini, OpenAI, Anthropic, Mock/Demo engine)
- **Testing & Verification**: Vitest, TypeScript typecheck, IWER runtime verification

---

## 3. ECS Architecture & Component Breakdown

### Components
1. **`AgentNode`**:
   - `id: string`: Unique agent instance identifier
   - `role: 'planner' | 'researcher' | 'executor' | 'reviewer'`
   - `state: 'idle' | 'working' | 'waiting_approval' | 'completed' | 'error'`
   - `progress: number` (0.0 to 1.0)
   - `label: string`
   - `statusMessage: string`
2. **`WorkflowConnector`**:
   - `sourceAgentId: string`
   - `targetAgentId: string`
   - `activeDataPulse: boolean`
3. **`HologramInspector`**:
   - `targetAgentId: string`
   - `visible: boolean`
   - `currentTab: 'overview' | 'inputs' | 'outputs' | 'logs'`
4. **`HumanInTheLoopGate`**:
   - `workflowId: string`
   - `decisionRequired: boolean`
   - `proposedAction: string`

### Systems
1. **`AgentSphereSystem`**: Oversees world lifecycle, seated command center spatial anchor layout, and global environment tuning.
2. **`AgentNodeSystem`**: Manages 3D agent visual states, animations (idle floating, active orbit rings, glowing energy cores, pulse particles), and spatial grab bounds.
3. **`ConnectorSystem`**: Renders dynamic 3D spline cables and glowing data-flow pulse packets between connected agent nodes.
4. **`WorkflowExecutionSystem`**: Orchestrates state transitions, feeds step results from Planner to Researcher to Executor to Reviewer, handles Human-In-The-Loop pauses and approvals.
5. **`SpatialInspectorSystem`**: Bridges agent execution logs and intermediate outputs into interactive 3D spatial glass panels.

---

## 4. Four Core Agent Personas & 3D Visual Archetypes
Each agent has a distinct 3D visual language, procedural geometry, color palette, and animation:
- **Planner (Strategic Architect)**:
  - Color: Electric Cyan (`#00e5ff`)
  - Shape: Multi-faceted geometric icosahedron core with rotating orbital rings
  - Function: Deconstructs mission goals into actionable steps and assigns tasks
- **Researcher (Intelligence & Data Miner)**:
  - Color: Amethyst Purple (`#bd00ff`)
  - Shape: Floating crystalline prism surrounded by satellite data nodes
  - Function: Gathers facts, synthesizes references, and analyzes context
- **Executor (Action & Builder)**:
  - Color: Solar Amber (`#ff9100`)
  - Shape: Dynamic concentric gyro rings around an energized engine core
  - Function: Executes tasks, drafts code/documents, implements plans
- **Reviewer (Quality & Security Auditor)**:
  - Color: Emerald Green (`#00e676`)
  - Shape: Shielded dual octahedron with scanning laser fan
  - Function: Audits outputs for accuracy, safety, constraints, and criteria

---

## 5. Seated-Friendly Spatial Ergonomics
- All interactables reside within the seated ergonomics "Golden Reach Sphere" (radius 0.45m - 0.75m in front of the user at chest level $y \approx 0.9m - 1.3m$).
- Hands-first gestures: direct grab, gentle magnetic snap-to-grid/slot, touch-to-open inspector glass, one-touch spatial buttons ("Approve", "Revise", "Run Workflow").

