# SynapseXR: AI Incident Command

SynapseXR is a spatial incident-response room for AI retrieval leaks. Four
specialist agents triage a synthetic event, correlate its evidence, prepare a
scoped containment plan with rollback, and ask an operator before proceeding.

## Demo scenario

The scenario simulates a synthetic support record appearing in an assistant
answer after retrieval from a knowledge index. The agents surface what is known,
mark real-world scope as unknown, preserve the event trail, and propose
quarantining only the test index. The plan includes a rollback path. Approval
and rejection both produce a visible outcome.

The default experience uses scripted simulation data. It does not read telemetry,
browse the web, or call operational systems. The inspector labels the simulation
and exported reports preserve that boundary. This is a response-planning demo,
not a real incident investigation or authorization to change production.

## Try the demo

```sh
npm install
npm run dev
```

In the managed browser, enter the immersive session and start the workflow.
Follow the four stages: incident commander, evidence analyst, containment
planner, safety reviewer. At the review pause, inspect scope, evidence gaps,
impact, and rollback. Approve or reject the simulated plan. The result panel
shows the decision; no real action is executed.

## What to show

- The spatial handoff from incident triage to evidence correlation.
- The boundary between synthetic facts and unknown real-world scope.
- The quarantine plan, expected impact, and rollback path.
- The reviewer pausing for operator sign-off before any action.
- The visible approved or rejected outcome, with no production change.

## Development checks

```sh
npm run --if-present typecheck
npm run build
```

The app uses `iwsdk.config.json` as the source of truth for its scene, assets,
components, and XR features. See [AGENTS.md](AGENTS.md) for project-specific
development guidance.
