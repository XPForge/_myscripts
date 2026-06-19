# Lighthouse Clipboard Bridge

The Lighthouse Clipboard Bridge is a local, capture-only handoff tool for Alice-to-Codex tasks.

Copy is consent: the watcher only reacts when the current clipboard text contains an explicit task block that begins with a line starting with `@codex` and has a later line containing `@endcodex`.

## What It Does

* watches the clipboard at a conservative polling interval;
* accepts copied content only when it contains a complete `@codex ... @endcodex` block;
* extracts only the first complete task block;
* writes the extracted task to `ALICE_TO_CODEX_TASK.md`;
* archives accepted tasks under `.codex-bridge/tasks/`;
* logs accepted captures and duplicate skips under `.codex-bridge/logs/`;
* hashes extracted blocks so the same task does not repeatedly trigger;
* optionally copies a simple confirmation message to the clipboard after capture;
* optionally invokes Codex CLI when execution mode is enabled in local config;
* writes Codex final reports under `.codex-bridge/reports/`;
* optionally copies Codex's final report back to the clipboard;
* shows brief local status notifications when tasks are captured and execution changes state.

## What It Does Not Do

* no keylogging;
* no typing surveillance;
* no browser DOM scraping;
* no logging of rejected clipboard content;
* no Codex CLI invocation unless execution mode is explicitly enabled;
* no GitHub issue creation;
* no auto-commit, auto-push, auto-merge, or auto-tag;
* no delete, discard, stash, deploy, or secret handling;
* no protected canon modification;
* no task body or clipboard contents in notifications.

Execution mode is off by default.

## Task Format

The copied clipboard text must contain a complete block that begins with a line starting with `@codex` and ends at the next `@endcodex`.

```text
@codex
task_id: EXAMPLE_TASK
mode: implementation
repo: lighthouse

Write the task instructions here.
@endcodex
```

Ordinary text and partial task blocks are ignored.

## Extra Copied Text

The bridge tolerates extra copied text around a valid task block. If copied content includes assistant commentary, markdown, or UI text before or after the block, the watcher ignores that surrounding text and writes only the extracted `@codex ... @endcodex` block.

Example:

```text
Here is the task:

@codex
task_id: EXAMPLE_WITH_EXTRA_TEXT
mode: implementation
repo: lighthouse

Do the requested work.
@endcodex

Extra copied text here is ignored.
```

Only the block from `@codex` through `@endcodex` is written and archived.

## How To Run

From the repo root:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\clipboard-bridge\watch-clipboard.ps1
```

Optional config path:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\clipboard-bridge\watch-clipboard.ps1 -ConfigPath .\tools\clipboard-bridge\config.example.json
```

For a single polling pass, useful for manual tests:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\clipboard-bridge\watch-clipboard.ps1 -Once
```

## Start / Stop / Status

Use `bridge-control.ps1` when you want the watcher to run in the background without keeping a manual PowerShell window open.

Start the bridge:

```powershell
.\tools\clipboard-bridge\bridge-control.ps1 start
```

Check whether it is running:

```powershell
.\tools\clipboard-bridge\bridge-control.ps1 status
```

Stop the bridge:

```powershell
.\tools\clipboard-bridge\bridge-control.ps1 stop
```

Restart the bridge:

```powershell
.\tools\clipboard-bridge\bridge-control.ps1 restart
```

Start with a local config file:

```powershell
.\tools\clipboard-bridge\bridge-control.ps1 start -ConfigPath .\.codex-bridge\config.local.json
```

The watcher runs in the background after `start`. `stop` turns it off. `status` checks whether the PID file points to a running watcher process and shows the PID when available.

No Codex execution occurs unless `executionEnabled` is set to `true` in the config used to start the bridge.

## Windows Toggle

Use `toggle-bridge.ps1` when you want one command or shortcut to turn the bridge on if it is stopped, or turn it off if it is already running.

Run the toggle directly:

```powershell
.\tools\clipboard-bridge\toggle-bridge.ps1
```

Run the toggle with a local config file:

```powershell
.\tools\clipboard-bridge\toggle-bridge.ps1 -ConfigPath .\.codex-bridge\config.local.json
```

Create or update the desktop shortcut:

```powershell
.\tools\clipboard-bridge\Create-Bridge-Toggle-Shortcut.ps1
```

The shortcut is named `Lighthouse Bridge Toggle`. Double-clicking it runs `toggle-bridge.ps1` from the repo root:

* if the bridge is stopped, it starts the background watcher;
* if the bridge is running, it stops the watcher;
* it shows a short local popup or console message;
* it writes toggle logs under `.codex-bridge/logs/`;
* it does not include clipboard text, task bodies, or secrets in logs.

Check status from the command line:

```powershell
.\tools\clipboard-bridge\bridge-control.ps1 status
```

To remove the shortcut manually, delete `Lighthouse Bridge Toggle.lnk` from the Windows Desktop.

The toggle does not commit, push, merge, tag, deploy, delete, discard, stash, create GitHub issues, or handle secrets. It also does not invoke Codex directly; Codex execution still depends on the bridge config used by the watcher.

## How To Stop

Press `Ctrl+C` in the PowerShell window running the watcher.

If the watcher was started with `bridge-control.ps1`, stop it with:

```powershell
.\tools\clipboard-bridge\bridge-control.ps1 stop
```

## Output Locations

* Latest task: `ALICE_TO_CODEX_TASK.md`
* Archived tasks: `.codex-bridge/tasks/YYYYMMDD-HHMMSS-task.md`
* Codex reports: `.codex-bridge/reports/YYYYMMDD-HHMMSS-report.md`
* Logs: `.codex-bridge/logs/YYYYMMDD.log`
* Control logs: `.codex-bridge/logs/YYYYMMDD-control.log`
* Toggle logs: `.codex-bridge/logs/YYYYMMDD-toggle.log`
* Duplicate hash state: `.codex-bridge/seen-hashes.txt`
* Background watcher PID: `.codex-bridge/bridge.pid`

## Configuration

Copy `config.example.json` if you want a local config file, then pass it with `-ConfigPath`.

The default config keeps execution disabled:

```json
{
  "repoPath": ".",
  "pollIntervalMs": 1000,
  "taskOutputFile": "ALICE_TO_CODEX_TASK.md",
  "runtimeFolder": ".codex-bridge",
  "copyConfirmationToClipboard": true,
  "executionEnabled": false,
  "codexExecutable": "codex",
  "codexSandbox": "workspace-write",
  "codexAskForApproval": "never",
  "copyReportToClipboard": true,
  "reportTimeoutSeconds": 900,
  "showNotifications": true,
  "notificationDurationMs": 3000
}
```

## Status Notifications

The bridge shows brief local status notifications by default. On Windows, it tries to use a dependency-free tray balloon notification. If that is unavailable, it falls back to console status output.

Notifications are short status messages only. They never include task contents, clipboard text, secrets, or report contents.

Notification messages:

* `Lighthouse Bridge: task captured`
* `Lighthouse Bridge: Codex executing...`
* `Lighthouse Bridge: Codex finished. Report copied to clipboard.`
* `Lighthouse Bridge: Codex failed. See log.`

To disable GUI notifications, set `showNotifications` to `false` in your local config:

```json
{
  "showNotifications": false,
  "notificationDurationMs": 3000
}
```

Console status output is still shown so the watcher remains observable from the terminal.

## Phase 2 Codex CLI Invocation

Phase 2 adds optional Codex CLI invocation. It is off by default.

To enable it, create a local config file outside source control or under an ignored runtime location, set `executionEnabled` to `true`, and run the watcher with `-ConfigPath`.

Example:

```powershell
Copy-Item .\tools\clipboard-bridge\config.example.json .\.codex-bridge\config.local.json
# Edit .\.codex-bridge\config.local.json and set "executionEnabled": true
powershell -ExecutionPolicy Bypass -File .\tools\clipboard-bridge\watch-clipboard.ps1 -ConfigPath .\.codex-bridge\config.local.json
```

When execution is enabled, the bridge:

* captures and archives the extracted task block;
* invokes `codex exec`;
* passes the extracted task to Codex on stdin;
* runs Codex with the configured repo path as `--cd`;
* uses configured `--sandbox` and `--ask-for-approval` values;
* saves Codex's final message to `.codex-bridge/reports/YYYYMMDD-HHMMSS-report.md`;
* copies the report back to the clipboard when `copyReportToClipboard` is `true`;
* copies a concise failure message if Codex fails or times out.

Warning: only enable execution mode when you are comfortable with Codex modifying the working tree for the copied task. The bridge still must not commit, push, merge, tag, deploy, delete, discard, stash, or handle secrets automatically.
