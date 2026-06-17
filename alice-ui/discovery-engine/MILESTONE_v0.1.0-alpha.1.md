# Lighthouse Discovery Engine v0.1.0-alpha.1

Version: `v0.1.0-alpha.1`

Date: 2026-06-17

## Summary

This milestone closes the first isolated runnable Lighthouse Discovery Engine prototype.

The Discovery Engine foundation exists under `discovery-engine/`, runs locally, preserves neutral core boundaries, supports removable modules, includes deterministic runtime verification, and includes the first visible isolated web demo.

This version does not perform real AI interpretation and does not generate real Discovery artifacts.

## Included Areas

- `core/`: neutral discovery mechanics for workspaces, sessions, turns, evidence, observations, resolution, artifacts, events, and export bundles.
- `alignment/`: replaceable alignment grammar, alignment observations, and metadata-only proof utilities.
- `runtime/`: module registry, runtime helpers, and re-instantiation placeholder.
- `storage/`: storage adapter contract and in-memory storage implementation.
- `modules/human-discovery/`: removable Human Discovery module skeleton.
- `modules/opportunity-discovery-stub/`: removable Opportunity Discovery stub module.
- `harness/`: module verification, fixture loading, native alignment proof, and deterministic runtime slice.
- `demo/`: local developer console demo for the runtime slice.
- `web-demo/`: isolated local web prototype around the deterministic runtime slice.

## What This Version Proves

- The Discovery Engine can exist independently from the current ALICE app.
- Core vocabulary stays domain-neutral.
- Domain vocabulary can live in removable modules.
- Modules can register through `ModuleRegistry`.
- Human and Opportunity module fixtures can emit compatible alignment metadata through shared registry id strings.
- Native alignment proof utilities can compare metadata without inspecting module schemas.
- A deterministic runtime slice can create and verify a workspace, session, turn, evidence reference, demo observation, alignment observation, in-memory storage roundtrip, and export bundle.
- The isolated web demo can run locally through its own Vite config without using the ALICE app entrypoint.

## Explicit Non-Goals

This milestone does not:

- integrate into the current ALICE app
- add API endpoints
- add realtime behavior
- call an LLM
- load protected prompts
- implement real Discovery interpretation
- generate real profiles
- generate real artifacts
- implement scoring, matching, ranking, recommendations, percentages, qualification judgments, or fit conclusions
- make any alignment signal a product conclusion

## Boundary Guarantees

- Discovery Engine work remains isolated under `discovery-engine/`.
- The web demo is not exported from `discovery-engine/index.ts`.
- The web demo does not import `src/App.tsx`, AppShell, the current container API, realtime runtime, backend realtime token endpoint, or existing prototype folders.
- Core does not import Human Discovery or Opportunity Discovery module types.
- Core stores `moduleData` but does not interpret it.
- Alignment proof utilities operate on alignment observation metadata.

## Local Demo Commands

Type-check the web demo:

```powershell
npx tsc --noEmit --ignoreConfig --target ES2023 --module esnext --moduleResolution bundler --lib DOM,DOM.Iterable,ES2023 --skipLibCheck discovery-engine\web-demo\app.ts
```

Build the isolated web demo:

```powershell
npx vite build --config discovery-engine\web-demo\vite.config.ts
```

Run the isolated web demo locally:

```powershell
npx vite --config discovery-engine\web-demo\vite.config.ts
```

Then open the local URL printed by Vite, usually:

```text
http://127.0.0.1:5173/
```

Preview the compiled web demo:

```powershell
npx vite preview --config discovery-engine\web-demo\vite.config.ts
```

## Known Limitations

- The runtime slice is deterministic demo/verification behavior only.
- The web demo is a developer-facing local prototype.
- There is no production runtime integration.
- There is no persistence beyond the in-memory storage adapter.
- There is no real artifact/profile generation.
- There is no prompt orchestration or protected prompt loading.
- There is no API, realtime, or ALICE app integration.
- Generated web-demo build output is written to `discovery-engine/web-demo/dist/`.

## Recommended Commit

```text
feat(discovery-engine): add isolated runnable Lighthouse Discovery web demo
```

## Recommended Tag

```text
v0.1.0-alpha.1
```
