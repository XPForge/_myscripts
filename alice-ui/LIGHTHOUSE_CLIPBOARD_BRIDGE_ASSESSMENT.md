# Lighthouse Clipboard Bridge Assessment

## Goal

Create a small local bridge that turns an explicitly copied Alice task block into a Codex handoff with less manual copy/paste, while keeping Paul as approval authority for commits, tags, pushes, merges, deletes, deploys, secrets, and protected canon changes.

The bridge should treat Copy as consent: it should react only when clipboard text begins with `@codex` and ends with `@endcodex`.

## Current Manual Workflow

1. Alice or ChatGPT writes a Codex task.
2. Paul selects the task text.
3. Paul copies the task.
4. Paul switches to Codex.
5. Paul pastes the task.
6. Codex performs the work.
7. Codex writes a report.
8. Paul copies the report back to Alice.

## Desired Workflow

1. Alice writes a clearly marked `@codex ... @endcodex` task block.
2. Paul presses Copy on that block.
3. A small local clipboard bridge detects the copied block.
4. The bridge sends the task to the best available Codex, GitHub, or local automation path.
5. Codex performs the work.
6. Codex writes a structured report.
7. The bridge copies or surfaces the report so it can be returned to Alice.
8. Paul remains approval authority for protected actions.

## Available Automation Surfaces

* Codex CLI: available. `codex.exe` is present from the OpenAI ChatGPT/Codex extension at `c:\Users\paulz\.vscode\extensions\openai.chatgpt-26.609.30741-win32-x64\bin\windows-x86_64\codex.exe`. It supports `codex exec`, stdin prompts, `--cd`, `--sandbox`, `--ask-for-approval`, `--json`, and `--output-last-message`.
* GitHub CLI: unavailable in the current shell. `gh` is not recognized as a command.
* GitHub issue/PR workflow: likely possible later because the repo has a GitHub remote, `https://github.com/XPForge/_myscripts.git`, but local issue creation is blocked until GitHub CLI or another authenticated GitHub client is installed and configured.
* Local scripts: no existing bridge scripts were found. The repo is a React + TypeScript + Vite app with npm scripts for `dev`, `backend:start`, `build`, `lint`, and `preview`.
* Python clipboard watcher: likely usable. Python 3.14 is installed at `C:\Python314\python.exe`, and the Windows `py` launcher is present. A Python watcher can be built later, but package availability should not be assumed until implementation. On Windows, a PowerShell/.NET clipboard path may be simpler than adding a Python clipboard dependency.
* Browser extension: possible but not recommended for the MVP. It adds browser permissions, extension packaging, native messaging setup, and a larger security surface.
* Codex desktop app: the CLI exposes `codex app`, which can launch or install Codex Desktop, but this does not appear to be the simplest automation surface for task handoff.
* Codex web GitHub integration: not locally verifiable from this repo. It may be useful later for cloud or issue-based workflows, but the local CLI is available now.
* Existing package manager: npm is available, with Node installed. This supports a Node-based bridge if preferred.
* Safe local storage for config/logs: use repo-local ignored bridge state, such as `.codex-bridge/`, for task inbox files, reports, run logs, and duplicate-detection state. Do not store secrets in task files or logs.

## Recommended Path

Build a phased local clipboard bridge:

1. Phase 0: clipboard capture only.
2. Phase 1: repo task handoff by writing `ALICE_TO_CODEX_TASK.md`.
3. Phase 2: optional Codex CLI invocation with `codex exec`.
4. Phase 3: report return by writing and optionally copying the final report.

The best MVP is option 1, but gated through option 3 first: a clipboard watcher writes `ALICE_TO_CODEX_TASK.md`, stores a timestamped copy under `.codex-bridge/`, and only after that invokes Codex CLI when Paul enables execution mode.

## Why This Path

This path removes the most repetitive work while keeping the trust boundary clear. Paul only has to copy an explicit `@codex` block. The bridge can preserve the task exactly, create a durable local audit trail, and either stop for manual Codex review or invoke `codex exec` with a controlled command.

It is simpler than a browser extension because it does not need browser permissions or native messaging. It is simpler than GitHub issues because `gh` is not installed. It is more useful than file-only forever because the installed Codex CLI already supports non-interactive execution and report capture.

## MVP Bridge Design

The smallest useful bridge should:

* poll the clipboard at a conservative interval;
* ignore clipboard content unless it starts with `@codex` and ends with `@endcodex`;
* hash the accepted block to avoid duplicate runs from the same copied content;
* write the raw accepted task to `ALICE_TO_CODEX_TASK.md`;
* write an archived copy to `.codex-bridge/tasks/YYYYMMDD-HHMMSS-task.md`;
* write bridge logs to `.codex-bridge/logs/`;
* never read keystrokes or browser DOM content;
* never scrape unrelated clipboard content into logs;
* default to capture-only mode;
* require an explicit config flag before invoking Codex CLI;
* if execution is enabled, run Codex with the repo root as `--cd`;
* write Codex's final message to `.codex-bridge/reports/YYYYMMDD-HHMMSS-report.md`;
* optionally copy only the final report back to the clipboard.

## Command Flow

Likely capture-only flow:

```powershell
Copy @codex block
bridge detects exact @codex ... @endcodex clipboard text
bridge writes .\ALICE_TO_CODEX_TASK.md
bridge writes .\.codex-bridge\tasks\<timestamp>-task.md
bridge surfaces "task captured"
```

Likely Codex CLI flow:

```powershell
Copy @codex block
bridge writes .\ALICE_TO_CODEX_TASK.md
bridge invokes:
Get-Content .\ALICE_TO_CODEX_TASK.md -Raw | codex exec --cd . --sandbox workspace-write --ask-for-approval never --output-last-message .\.codex-bridge\reports\<timestamp>-report.md -
bridge copies or opens .\.codex-bridge\reports\<timestamp>-report.md
```

The final command should be reviewed during implementation. For risky tasks, the bridge should prefer capture-only or manual invocation instead of fully automated execution.

## Required Files

Proposed files only:

* `ALICE_TO_CODEX_TASK.md`
* `.codex-bridge/config.json`
* `.codex-bridge/tasks/`
* `.codex-bridge/reports/`
* `.codex-bridge/logs/`
* `tools/clipboard-bridge/README.md`
* `tools/clipboard-bridge/watch-clipboard.ps1` or `tools/clipboard-bridge/watch_clipboard.py`

## Safety Boundaries

* no keylogging
* no constant typing surveillance
* no browser DOM scraping
* no capture of unrelated clipboard content
* only explicit `@codex` blocks
* only blocks beginning with `@codex` and ending with `@endcodex`
* no auto-commit
* no auto-push
* no auto-merge
* no auto-delete
* no deploys
* no secret exposure
* no protected canon modification without approval
* no silent retry loops that repeatedly invoke Codex
* no storage of rejected clipboard content
* no automatic GitHub issue creation until authentication and target repo rules are explicit

## Open Questions for Paul

1. Should the MVP be capture-only first, or should it invoke `codex exec` immediately after capture?
2. Should completed Codex reports be copied back to the clipboard automatically, or only opened/surfaced for review?
3. Should `.codex-bridge/` be committed as an ignored runtime folder pattern, or kept entirely local without repo changes beyond the bridge files?

## Implementation Recommendation

Build Phase 0 and Phase 1 first.

* Phase 0 clipboard capture only: yes.
* Phase 1 repo task handoff: yes.
* Phase 2 Codex/GitHub invocation: yes for Codex CLI after the capture loop is proven; no for GitHub issues until GitHub CLI is installed and configured.
* Phase 3 report return: yes after Codex CLI invocation is stable.

## Final Recommendation Summary

Use a local clipboard bridge, not a browser extension or GitHub issue flow, for the first version. The bridge should start in capture-only mode, accept only copied `@codex ... @endcodex` blocks, write `ALICE_TO_CODEX_TASK.md`, and archive the task locally. After that works reliably, add an opt-in Codex CLI mode using `codex exec --output-last-message` so the final report can be saved and returned to Alice with minimal manual copy/paste.
