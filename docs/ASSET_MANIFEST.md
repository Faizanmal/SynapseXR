# AgentSphere - Asset Manifest

This document catalogs all 3D procedural geometries, materials, audio effects, and UI definitions used in the AgentSphere application.

---

## 1. 3D Procedural Geometries & Scene Assets

| Asset ID | Source File | Type | Description | Tri Count / Cost |
|---|---|---|---|---|
| `command-center-console` | `src/scene-assets/command-center.scene-asset.ts` | Procedural Mesh | Curved seated ergonomic console desk with holographic emitter rings | Low (~1.2k tris) |
| `agent-planner` | `src/scene-assets/agents.scene-asset.ts` | Procedural Mesh | Glowing icosahedron core with rotating orbital rings (Electric Cyan) | Low (~800 tris) |
| `agent-researcher` | `src/scene-assets/agents.scene-asset.ts` | Procedural Mesh | Crystalline faceted prism with satellite sensory crystals (Amethyst Purple) | Low (~850 tris) |
| `agent-executor` | `src/scene-assets/agents.scene-asset.ts` | Procedural Mesh | Kinetic gyro rings around glowing energy cylinder (Solar Amber) | Low (~950 tris) |
| `agent-reviewer` | `src/scene-assets/agents.scene-asset.ts` | Procedural Mesh | Dual nested octahedron with scanning laser fan (Emerald Green) | Low (~750 tris) |
| `cable-connector` | Dynamic runtime spline | Procedural Tube | Catmull-Rom spline tube connecting agent nodes with glow shaders | Dynamic |

---

## 2. Spatial UI & UIKitML Templates

| Template ID | File Path | Usage |
|---|---|---|
| `mission-selector` | `public/ui/mission-selector.uikitml` | Central desk UI for selecting or loading agent workflows |
| `agent-inspector` | `public/ui/agent-inspector.uikitml` | Holographic floating window for examining intermediate agent data |
| `approval-dialog` | `public/ui/approval-dialog.uikitml` | Human-in-the-loop prompt to approve/revise proposed agent outputs |

---

## 3. Audio & Haptics

| Asset ID | File Path | Usage |
|---|---|---|
| `chime` | `public/audio/chime.mp3` | Feedback sound on agent connection and mission step completion |
| `pulse-ambient` | Synthesized / Web Audio | Subtle ambient low hum for sci-fi command center immersion |

