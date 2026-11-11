# AgentSphere - Asset Manifest

This document provides the complete technical and licensing catalog for every 3D model, procedural scene asset, binary `.glb` artifact, and spatial UI panel registered in `src/assets.ts` via `defineAssets()`.

---

## 1. 3D Models & Scene Assets (`defineAssets()` Catalog)

| Name / Manifest ID | Origin / Generation Method | License | Triangle Count | Texture Sizes | File Size | Runtime Integration | Optimization Notes |
|---|---|---|---|---|---|---|---|
| **`agent-planner`**<br>*(Planner Agent)* | Original procedural Three.js hierarchy (`createPlannerAgent()` in `src/scene-assets/agents.scene-asset.ts`) | MIT (100% Original Competition Work) | **852 tris**<br>(`core` 80, `orbit-ring-1` 384, `orbit-ring-2` 320, `planning-frame` 8, `status-beacon-ring` 60) | 0 B (Procedural PBR + unlit emissive shaders) | ~1.4 KB TS source | Registered in `src/assets.ts`; animated by `AgentNodeSystem` (`orbit-ring-1`, `orbit-ring-2`, `planning-frame`, `status-beacon-ring`) | Low-segment `IcosahedronGeometry` and `OctahedronGeometry`; zero texture fetches; shared material instances |
| **`agent-researcher`**<br>*(Researcher Agent)* | Original procedural Three.js hierarchy (`createResearcherAgent()` in `src/scene-assets/agents.scene-asset.ts`) | MIT (100% Original Competition Work) | **828 tris**<br>(`core` 32, `scan-ring-upper` 384, `scan-ring-lower` 320, `satellite-1..3` 24, `status-beacon-ring` 68) | 0 B (Procedural PBR + unlit emissive shaders) | ~1.8 KB TS source | Registered in `src/assets.ts`; vertical scanning rings and 3 orbiting data particles driven by `AgentNodeSystem` | Reuses shared violet emissive material across scanning rings and satellite particles |
| **`agent-executor`**<br>*(Executor Agent)* | Original procedural Three.js hierarchy (`createExecutorAgent()` in `src/scene-assets/agents.scene-asset.ts`) | MIT (100% Original Competition Work) | **832 tris**<br>(`core` 116, `gyro-ring` 320, `accelerator-coil` 320, `status-beacon-ring` 76) | 0 B (Procedural PBR + unlit emissive shaders) | ~1.5 KB TS source | Registered in `src/assets.ts`; dual-axis `gyro-ring` and counter-rotating `accelerator-coil` driven by `AgentNodeSystem` | Uses 12-sided `DodecahedronGeometry` core and 10x32 `TorusGeometry` rings |
| **`agent-reviewer`**<br>*(Reviewer Agent)* | Original procedural Three.js hierarchy (`createReviewerAgent()` in `src/scene-assets/agents.scene-asset.ts`) | MIT (100% Original Competition Work) | **920 tris**<br>(`core` 80, `audit-ring` 384, `scanner-shield` 384, `status-beacon-ring` 72) | 0 B (Procedural PBR + unlit emissive shaders) | ~1.5 KB TS source | Registered in `src/assets.ts`; `audit-ring` and oscillating `scanner-shield` driven by `AgentNodeSystem` | Unlit `MeshBasicMaterial` on verification rings eliminates lighting overhead on Intel HD 4000 |
| **`companion-drone`**<br>*(Optional AI Companion GLB)* | Programmatically generated binary glTF 2.0 (`scripts/generate-glb.mjs` -> `public/models/companion-drone.glb`) | MIT (100% Original Competition Work) | **608 tris**<br>(`companion-core` 128, `companion-halo-ring` 288, `companion-stabilizer-ring` 192) | 0 B (Embedded glTF 2.0 `pbrMetallicRoughness` + `emissiveFactor`) | **17,844 bytes** (`17.4 KB` `.glb`) | Loaded via `AssetType.GLTF` in `src/assets.ts`; animated by `AgentNodeSystem` (`CompanionDroneComponent`); automatic fallback to `companion-fallback` | Pure binary buffer (`ARRAY_BUFFER` + `ELEMENT_ARRAY_BUFFER`) with 4-byte aligned chunks; zero external URI/texture dependencies |
| **`companion-fallback`**<br>*(Procedural Companion Fallback)* | Original procedural Three.js hierarchy (`createCompanionFallback()` in `src/scene-assets/agents.scene-asset.ts`) | MIT (100% Original Competition Work) | **656 tris** | 0 B (Procedural materials) | ~1.1 KB TS source | Registered in `src/assets.ts` and invoked automatically by `AgentNodeSystem` if `companion-drone.glb` fails to load | Shares identical child node names (`companion-core`, `companion-halo-ring`, `companion-stabilizer-ring`) so animation loops never break |
| **`command-platform`**<br>*(Command Center Platform)* | Original procedural Three.js hierarchy (`createCommandPlatform()` in `src/scene-assets/command-center.scene-asset.ts`) | MIT (100% Original Competition Work) | **1,408 tris**<br>(Lathe dais, focus torus, acoustic disc, `panel-support-left`, `panel-support-right`) | 0 B (Procedural PBR + cyan emissive ring) | ~1.6 KB TS source | Registered in `src/assets.ts`; placed at `[0, 0, -0.6]` in `public/scenes/main.iwsdk.scene.json` | Stepped lathe profile + 2 lightweight cylindrical panel support pylons |
| **`command-console-desk`**<br>*(Ergonomic Seated Desk)* | Original procedural Three.js hierarchy (`createCommandConsoleDesk()` in `src/scene-assets/command-center.scene-asset.ts`) | MIT (100% Original Competition Work) | **340 tris** | 0 B (Procedural PBR + cyan emitter strip) | ~1.1 KB TS source | Registered in `src/assets.ts`; placed in front of seated operator (`y = 0.88m`, `z = -0.65m`) | Rounded box tabletop + single cylindrical pedestal stem |
| **`planner-pedestal`**, **`researcher-pedestal`**, **`executor-pedestal`**, **`reviewer-pedestal`** | Original procedural Three.js lathe columns (`createAgentPedestal()` in `src/scene-assets/command-center.scene-asset.ts`) | MIT (100% Original Competition Work) | **576 tris each** (2,304 tris total across 4 pedestals) | 0 B (Shared `metallicPedestalMaterial` + faction ring) | ~1.2 KB TS source | Registered in `src/assets.ts`; arranged in an ergonomic arc (`z = -0.75m` to `-0.92m`) | Reuses a single `metallicPedestalMaterial` across all 4 pedestals |
| **`command-floor`** & **`chamber-architecture`** | Original procedural Three.js geometry (`src/scene-assets/command-center.scene-asset.ts`) | MIT (100% Original Competition Work) | **324 tris** | 0 B (Procedural materials + `DomeFade`) | ~1.2 KB TS source | Registered in `src/assets.ts`; root level anchors | Uses `DomeFade` (`start: 6`, `end: 14`) instead of high-poly background geometry |

---

## 2. Total Scene Geometry & Memory Budget Summary

- **Total Scene Triangle Count**: **~8,244 triangles** across the entire command room, all 4 animated agents, 4 pedestals, console desk, and the `.glb` companion drone (well below the 50,000-triangle mobile XR / Intel HD 4000 target budget).
- **Total Texture Memory**: **0 MB** for 3D geometry (all visual richness is achieved through procedural geometric silhouettes, vertex normals, PBR metallic/roughness parameters, and unlit emissive rings).
- **Total Binary Model Payload**: **17.4 KB** (`public/models/companion-drone.glb`).

---

## 3. State-Driven Animation Matrix (`AgentNodeSystem`)

| State | Speed Multiplier | Bob Frequency / Amplitude | Target Scale | Status Beacon Color | Special Sub-Part Motion |
|---|---|---|---|---|---|
| **`idle` / `ready`** | `1.0x` | `2.2 rad/s` / `0.022 m` | `1.00x` | Role color (`#00e5ff`, `#bd00ff`, `#ff9100`, `#00e676`) | Gentle orbital rotation and floating bob |
| **`Hovered`** | `1.15x` | `2.2 rad/s` / `0.022 m` | `1.08x ± 0.025x` pulse | Role color | Smooth scale highlight pulse on ray/hand hover |
| **`Selected` / `Pressed`** | `1.35x` | `2.2 rad/s` / `0.022 m` | `1.12x` | Role color | Elevated visual focus and accelerated ring alignment |
| **`running`** | `3.50x` | `4.5 rad/s` / `0.036 m` | `1.06x ± 0.03x` | Role color | High-energy ring spin, rapid vertical scanning rings, fast satellite orbit |
| **`waiting_approval`** | `0.65x` | `3.2 rad/s` / `0.018 m` | `1.04x ± 0.04x` | **Amber (`#ffab00`)** | Breathing scale pulse and amber beacon |
| **`completed`** | `1.35x` | `2.6 rad/s` / `0.025 m` | `1.05x ± 0.02x` | **Emerald (`#00e676`)** | Harmonious celebration pulse and emerald beacon |
| **`failed`** | `0.25x` | `9.0 rad/s` / `0.012 m` | `0.98x ± 0.03x` | **Red (`#ff1744`)** | Rapid alert oscillation and red warning beacon |
