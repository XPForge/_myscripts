# Runtime Slice Demo

This local developer-facing demo runs the Phase 5 deterministic runtime slice.

It creates a tiny verification cycle:

- workspace
- session
- text turn
- evidence reference
- demo observation
- alignment observation
- in-memory storage roundtrip
- export bundle
- metadata-only alignment proof signals

This demo does not touch the ALICE app. It does not use UI, API endpoints, realtime, LLM interpretation, or protected prompts.

It does not generate real profiles or real artifacts. The observation is deterministic demo behavior for plumbing verification only.

Alignment signals are metadata-only signals, not conclusions. They are not scoring, matching, ranking, recommendations, percentages, qualification judgments, or fit conclusions.

## Type Check

From the repository root:

```powershell
npx tsc --noEmit --ignoreConfig --target ES2023 --module esnext --moduleResolution bundler --types node --skipLibCheck discovery-engine\demo\runRuntimeSliceDemo.ts
```

## Running

This repository does not currently define a dedicated TypeScript runtime command for `discovery-engine/demo/`. The demo file is written as a runnable TypeScript module for a future local runner, but Phase 6 does not add dependencies or package scripts.
