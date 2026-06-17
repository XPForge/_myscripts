# Lighthouse Discovery Web Demo

This is an isolated local web demo for the deterministic Phase 5 runtime slice.

It lets a developer enter local text, run `runMinimalDiscoveryRuntimeSlice`, and inspect the resulting workspace, session, evidence reference, demo observation, alignment signals, export bundle, and verification checks.

This is the first visible prototype around the deterministic runtime slice. It is not integrated into the current ALICE app and does not touch ALICE app files, routing, runtime, realtime code, backend token endpoints, or existing prototype folders.

## Boundaries

- No API endpoints
- No realtime
- No LLM calls
- No protected prompt loading
- No real Discovery interpretation
- No real profile generation
- No real artifact generation
- No scoring, matching, ranking, recommendations, percentages, qualification judgments, or fit conclusions

Alignment signals are metadata-only signals from the isolated proof utilities. They are not conclusions.

## Type Check

From the repository root, use the DOM library form of the TypeScript check:

```powershell
npx tsc --noEmit --ignoreConfig --target ES2023 --module esnext --moduleResolution bundler --lib DOM,DOM.Iterable,ES2023 --skipLibCheck discovery-engine\web-demo\app.ts
```

Note: The prompt-provided `--types dom,dom.iterable,es2023` form is not the TypeScript flag shape for DOM libraries; `--lib` is the working equivalent.

## Compile

From the repository root, use the repo's existing Vite dependency through the isolated config in this folder:

```powershell
npx vite build --config discovery-engine\web-demo\vite.config.ts
```

The compiled browser files are written to:

```text
discovery-engine/web-demo/dist/
```

## Running

For local development, run the isolated Vite dev server from the repository root:

```powershell
npx vite --config discovery-engine\web-demo\vite.config.ts
```

Then open the local URL printed by Vite, usually:

```text
http://127.0.0.1:5173/
```

To serve the compiled output after running the compile command, run:

```powershell
npx vite preview --config discovery-engine\web-demo\vite.config.ts
```

Then open the local preview URL printed by Vite.

## Limitations

This folder remains dependency-free and does not add package scripts. The local server commands use the repo's existing Vite dependency only to serve or build this isolated demo folder.

This does not touch ALICE app files. It does not use API endpoints, realtime, LLM calls, protected prompts, real profile generation, real artifact generation, scoring, matching, ranking, recommendations, percentages, qualification judgments, or fit conclusions.
