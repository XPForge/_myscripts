param(
    [string]$StatusPath = "",
    [ValidateRange(250, 60000)]
    [int]$RefreshIntervalMs = 1000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

if (-not $StatusPath) {
    $repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
    $StatusPath = Join-Path $repoRoot ".codex-bridge\status.json"
}
elseif (-not [System.IO.Path]::IsPathRooted($StatusPath)) {
    $StatusPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $StatusPath))
}

$ControlPath = Join-Path $PSScriptRoot "bridge-control.ps1"
$script:CurrentState = "stopped"

$form = New-Object System.Windows.Forms.Form
$form.Text = "Lighthouse Bridge Status"
$form.Size = New-Object System.Drawing.Size(330, 285)
$form.MinimumSize = $form.Size
$form.MaximumSize = $form.Size
$form.StartPosition = "Manual"
$form.Location = New-Object System.Drawing.Point(([System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea.Right - $form.Width - 16), 16)
$form.TopMost = $true
$form.FormBorderStyle = "FixedToolWindow"
$form.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 30)
$form.ForeColor = [System.Drawing.Color]::White

$light = New-Object System.Windows.Forms.Panel
$light.Location = New-Object System.Drawing.Point(16, 18)
$light.Size = New-Object System.Drawing.Size(30, 30)
$light.BackColor = [System.Drawing.Color]::DimGray
$form.Controls.Add($light)

$stateLabel = New-Object System.Windows.Forms.Label
$stateLabel.Location = New-Object System.Drawing.Point(58, 15)
$stateLabel.Size = New-Object System.Drawing.Size(245, 36)
$stateLabel.Font = New-Object System.Drawing.Font("Segoe UI", 13, [System.Drawing.FontStyle]::Bold)
$stateLabel.Text = "Stopped / no status"
$form.Controls.Add($stateLabel)

$detailsLabel = New-Object System.Windows.Forms.Label
$detailsLabel.Location = New-Object System.Drawing.Point(16, 64)
$detailsLabel.Size = New-Object System.Drawing.Size(290, 130)
$detailsLabel.Font = New-Object System.Drawing.Font("Consolas", 9)
$detailsLabel.Text = "Mode: unknown"
$form.Controls.Add($detailsLabel)

$powerButton = New-Object System.Windows.Forms.Button
$powerButton.Location = New-Object System.Drawing.Point(16, 205)
$powerButton.Size = New-Object System.Drawing.Size(290, 30)
$powerButton.Text = "Power On"
$powerButton.FlatStyle = [System.Windows.Forms.FlatStyle]::System
$form.Controls.Add($powerButton)

function Format-StatusTime {
    param($Value)
    if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value)) { return "-" }
    try { return ([datetimeoffset]::Parse([string]$Value)).ToLocalTime().ToString("yyyy-MM-dd HH:mm:ss") } catch { return "invalid" }
}

function Test-StatusTime {
    param($Value)
    if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value)) { return $true }
    try { [void][datetimeoffset]::Parse([string]$Value); return $true } catch { return $false }
}

function Update-StatusDisplay {
    $state = "stopped"
    $mode = "unknown"
    $lastTaskAt = $null
    $lastReportAt = $null
    $lastErrorAt = $null
    $lastErrorKind = $null
    $displayState = "Stopped / no status"
    $color = [System.Drawing.Color]::DimGray

    if (Test-Path -LiteralPath $StatusPath) {
        try {
            $status = Get-Content -LiteralPath $StatusPath -Raw | ConvertFrom-Json
            if ($status.PSObject.Properties.Name -contains "state") { $state = [string]$status.state }
            if ($status.PSObject.Properties.Name -contains "mode") { $mode = [string]$status.mode }
            if ($status.PSObject.Properties.Name -contains "lastTaskAt") { $lastTaskAt = $status.lastTaskAt }
            if ($status.PSObject.Properties.Name -contains "lastReportAt") { $lastReportAt = $status.lastReportAt }
            if ($status.PSObject.Properties.Name -contains "lastErrorAt") { $lastErrorAt = $status.lastErrorAt }
            if ($status.PSObject.Properties.Name -contains "lastErrorKind") { $lastErrorKind = $status.lastErrorKind }

            $validStates = @("stopped", "capture-only-idle", "execution-idle", "task-captured", "codex-running", "codex-finished", "codex-failed", "unknown")
            $validModes = @("capture-only", "execution-enabled", "unknown")
            if ($state -notin $validStates -or $mode -notin $validModes) { throw "Invalid status state or mode." }
            if (-not (Test-StatusTime $lastTaskAt) -or -not (Test-StatusTime $lastReportAt) -or -not (Test-StatusTime $lastErrorAt)) { throw "Invalid status timestamp." }
            if ($null -ne $lastErrorKind -and -not [string]::IsNullOrWhiteSpace([string]$lastErrorKind) -and [string]$lastErrorKind -notmatch '^[a-z0-9-]{1,48}$') { throw "Invalid status error kind." }

            switch ($state) {
                "capture-only-idle" { $color = [System.Drawing.Color]::DimGray; $displayState = "Stopped" }
                "execution-idle" { $color = [System.Drawing.Color]::LimeGreen; $displayState = "Ready" }
                "task-captured" { $color = [System.Drawing.Color]::Gold; $displayState = "Task captured" }
                "codex-running" { $color = [System.Drawing.Color]::Gold; $displayState = "Codex running" }
                "codex-finished" { $color = [System.Drawing.Color]::LimeGreen; $displayState = "Codex finished" }
                "codex-failed" { $color = [System.Drawing.Color]::Red; $displayState = "Codex failed" }
                "stopped" { $color = [System.Drawing.Color]::DimGray; $displayState = "Stopped" }
                default { $color = [System.Drawing.Color]::DimGray; $displayState = "Unknown status" }
            }
        }
        catch {
            $state = "unknown"
            $displayState = "Malformed status file"
            $color = [System.Drawing.Color]::Red
        }
    }

    $errorText = if ($lastErrorKind) { "$(Format-StatusTime $lastErrorAt) ($lastErrorKind)" } else { "-" }
    $light.BackColor = $color
    $stateLabel.Text = $displayState
    $detailsLabel.Text = "State:  $state`r`nMode:   $mode`r`nTask:   $(Format-StatusTime $lastTaskAt)`r`nReport: $(Format-StatusTime $lastReportAt)`r`nError:  $errorText"
    $script:CurrentState = $state
    if ($state -in @("execution-idle", "task-captured", "codex-running", "codex-finished", "codex-failed")) {
        $powerButton.Text = "Power Off"
    }
    else {
        $powerButton.Text = "Power On"
    }
}

function Invoke-BridgePowerToggle {
    $powerButton.Enabled = $false
    try {
        $command = if ($script:CurrentState -in @("execution-idle", "task-captured", "codex-running", "codex-finished", "codex-failed")) { "stop" } else { "start" }
        $processInfo = New-Object System.Diagnostics.ProcessStartInfo
        $processInfo.FileName = "powershell.exe"
        $processInfo.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$ControlPath`" $command"
        $processInfo.WorkingDirectory = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
        $processInfo.UseShellExecute = $false
        $processInfo.CreateNoWindow = $true
        $process = [System.Diagnostics.Process]::Start($processInfo)
        $process.WaitForExit()
        $process.Dispose()
    }
    finally {
        $powerButton.Enabled = $true
        Update-StatusDisplay
    }
}

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = $RefreshIntervalMs
$timer.Add_Tick({ Update-StatusDisplay })
$powerButton.Add_Click({ Invoke-BridgePowerToggle })
$form.Add_FormClosed({ $timer.Stop(); $timer.Dispose() })

Update-StatusDisplay
$timer.Start()
[void]$form.ShowDialog()
