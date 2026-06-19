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
* shows brief local status notifications when tasks are captured and execution changes state;
* ignores clipboard content written by the bridge itself, including confirmations, failure messages, and copied Codex reports.

## What It Does Not Do

* no keylogging;
* no typing surveillance;
* no browser DOM scraping;
* no logging of rejected clipboard content;
* no re-triggering from bridge-written clipboard output;
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

Status shows whether the bridge is running, the PID, the config path if known, and the active execution mode:

* `capture-only`
* `execution-enabled`
* `unknown`

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

The watcher runs in the background after `start`. `stop` turns it off. `status` checks whether the PID file points to a live watcher process and shows the PID when available. Stale PID/status files are cleaned up instead of being reported as a running bridge.

No Codex execution occurs unless `executionEnabled` is set to `true` in the config used to start the bridge. The start and toggle commands print the mode they started, for example `Lighthouse Clipboard Bridge started in capture-only mode`.

## Bridge Modes

Capture-only mode is the default. In this mode, the bridge watches for copied `@codex ... @endcodex` blocks, writes `ALICE_TO_CODEX_TASK.md`, archives the task, logs the capture, and copies a confirmation message. It does not invoke Codex.

Execution-enabled mode is opt-in. In this mode, the bridge does the same capture work, then invokes Codex CLI for the copied task and saves the final report under `.codex-bridge/reports/`.

To create a local execution-enabled config without changing the committed default config:

```powershell
Copy-Item .\tools\clipboard-bridge\config.local.example.json .\tools\clipboard-bridge\config.local.json
```

`tools/clipboard-bridge/config.local.json` is ignored by git. Check the active mode at any time:

```powershell
.\tools\clipboard-bridge\bridge-control.ps1 status
```

## Recommended Desktop Shortcuts

Use the recommended desktop shortcuts when you want explicit start, stop, and status controls without guessing which mode will run.

Create or update the desktop shortcuts:

```powershell
.\tools\clipboard-bridge\Create-Bridge-Toggle-Shortcut.ps1
```

This creates:

* `START Lighthouse Bridge - Capture Only`
* `START Lighthouse Bridge - Execute Codex`
* `STOP Lighthouse Bridge`
* `STATUS Lighthouse Bridge`

Use `START Lighthouse Bridge - Capture Only` when you only want task capture. This starts the bridge in capture-only mode and does not invoke Codex.

Use `START Lighthouse Bridge - Execute Codex` when you want copied tasks to run through Codex. This shortcut uses the stable local config file `tools/clipboard-bridge/config.local.json`.

If `config.local.json` does not exist, create it first:

```powershell
Copy-Item .\tools\clipboard-bridge\config.local.example.json .\tools\clipboard-bridge\config.local.json
```

Use `STOP Lighthouse Bridge` to turn the watcher off.

Use `STATUS Lighthouse Bridge` or the command line to check whether the bridge is running and which mode is active:

```powershell
.\tools\clipboard-bridge\bridge-control.ps1 status
```

The shortcut creator also removes old vague bridge shortcuts such as `Lighthouse Bridge Toggle` and `Lighthouse Bridge Execute Toggle`, but only when their target/arguments prove they were created by this bridge tool. It leaves unrelated desktop shortcuts alone.

Shortcut behavior:

* capture-only shortcut starts capture-only mode;
* execute shortcut starts execution-enabled mode using `config.local.json`;
* stop shortcut stops the bridge and handles already-stopped state gracefully;
* status shortcut shows running/not running plus capture-only, execution-enabled, or unknown mode;
* shortcut logs are written under `.codex-bridge/logs/`;
* shortcut/control logs do not include clipboard text, task bodies, or secrets.

The older `toggle-bridge.ps1` script is still available for direct advanced use:

```powershell
.\tools\clipboard-bridge\toggle-bridge.ps1
```

To remove shortcuts manually, delete the relevant `.lnk` files from the Windows Desktop.

Warning: execution-enabled mode can allow Codex to modify workspace files for copied tasks. Shortcuts and controls do not commit, push, merge, tag, deploy, delete, discard, stash, create GitHub issues, or handle secrets. The shortcut creator does not invoke Codex directly; Codex execution still depends on the bridge config used by the watcher.

The shortcut creator refuses missing config paths and temp config paths. For daily execution-enabled use, point the shortcut at the stable ignored local file `tools/clipboard-bridge/config.local.json`.

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
* Shortcut logs: `.codex-bridge/logs/YYYYMMDD-shortcuts.log`
* Duplicate hash state: `.codex-bridge/seen-hashes.txt`
* Background watcher PID: `.codex-bridge/bridge.pid`
* Background watcher status: `.codex-bridge/bridge-status.json`

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

## Self-Trigger Protection

The bridge tracks hashes of clipboard content it writes itself. If a confirmation message, failure message, or copied Codex report appears on the clipboard, the watcher ignores that content instead of treating it as a new user task.

This matters because Codex reports can include the original `@codex ... @endcodex` prompt. A report copied by the bridge must not trigger a second run. User-copied task blocks still work normally, and duplicate task protection still applies.

While Codex is running, the bridge does not start another Codex run. If task-like clipboard content is detected as having appeared during execution, it is suppressed and logged by hash only. The bridge does not queue tasks.
