# Phase 10 ALICE Behavior Test

This document gives Paul a way to test the actual current Lighthouse app after Phase 10 without using a parallel prototype or simulated ALICE.

Phase 10 interpretation code is isolated under `discovery-engine/`. It must not be imported into ALICE live conversation flow, prompt construction, response handling, realtime/voice behavior, or production API behavior.

## Current App Test

From the repository root, run the real current app:

```powershell
npm run dev
```

If realtime voice behavior is part of the test, run the existing backend token endpoint in a second terminal:

```powershell
npm run backend:start
```

Open the local Vite URL printed by the app, usually:

```text
http://localhost:5173/
```

Interact with ALICE directly in the current app. Do not use the isolated Discovery Engine web demo for this behavior approval.

## What Paul Should Judge

- natural conversation flow
- warmth
- curiosity
- pacing
- flexibility
- reflection quality
- ability to follow nonlinear input
- whether ALICE avoids sounding scripted, flattened, cautious, or form-like
- whether Phase 10 affected API path, prompt construction, response handling, realtime/voice flow, or runtime behavior

## Restore Point Comparison

The restore point before the mechanic test is:

```text
commit: 5391d53
tag: alice-restore-before-mechanic-test
```

To compare the current app with the restore point, first ensure any uncommitted work is saved or intentionally discarded. Then use a temporary worktree:

```powershell
git worktree add ..\alice-restore-before-mechanic-test alice-restore-before-mechanic-test
```

Run the restore-point app from that worktree:

```powershell
cd ..\alice-restore-before-mechanic-test
npm install
npm run dev
```

If needed, run the restore-point backend token endpoint in a second terminal from that worktree:

```powershell
npm run backend:start
```

After testing, remove the temporary worktree from the original repository:

```powershell
git worktree remove ..\alice-restore-before-mechanic-test
```

## Revert Path

If ALICE feels changed in an unacceptable way, do not approve Phase 10 behavior. To return the repository to the restore point:

```powershell
git reset --hard alice-restore-before-mechanic-test
```

Use that command only after intentionally preserving or discarding any newer work.
