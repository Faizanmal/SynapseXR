# SynapseXR: AI Launch Privacy Gate

SynapseXR is a spatial command room for reviewing AI-generated work before it is
published. Four specialist agents pass a launch task through planning, research,
drafting, and review. The operator can inspect the review and approve or reject
the proposed action in the room.

## Demo scenario

The sample launch brief includes a claim that customer prompts are deleted after
30 days, but supplies no approved retention policy. The workflow makes that gap
visible, removes the unsupported claim from its draft, and waits for operator
sign-off. Approval and rejection both produce a visible outcome.

The default experience uses scripted demo output. It does not browse the web or
verify external sources. The inspector labels this mode, and exported reports
distinguish scripted output from live model output. Live model responses also
need independent source review before they are treated as evidence.

## Try the demo

```sh
npm install
npm run dev
```

In the managed browser, enter the immersive session, start the workflow, and
follow the four agent stages. When the reviewer pauses, read the finding and
proposed action before using the green approve or red reject control. The result
panel keeps the review visible after the decision.

## What to show

- The four connected agent roles and the spatial workflow they form.
- The researcher surfacing the missing retention-policy evidence.
- The executor removing the unsupported claim from the launch draft.
- The reviewer presenting its finding before asking for human sign-off.
- The operator's decision appearing as approved or rejected.

## Development checks

```sh
npm run --if-present typecheck
npm run build
```

The app uses `iwsdk.config.json` as the source of truth for its scene, assets,
components, and XR features. See [AGENTS.md](AGENTS.md) for project-specific
development guidance.
