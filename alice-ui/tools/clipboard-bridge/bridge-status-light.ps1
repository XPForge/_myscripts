param(
    [string]$StatusPath = "",
    [string]$ControlConfigPath = "",
    [string]$LogPath = "",
    [string]$PidPath = "",
    [ValidateRange(250, 60000)]
    [int]$RefreshIntervalMs = 1000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

trap {
    if ($LogPath) {
        try {
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            Add-Content -LiteralPath $LogPath -Value "[$timestamp] $($_.Exception.ToString())"
        }
        catch {
        }
    }
    throw
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class NativeWindowDrag {
    [DllImport("user32.dll")]
    public static extern bool ReleaseCapture();
    [DllImport("user32.dll")]
    public static extern IntPtr SendMessage(IntPtr hWnd, int msg, int wParam, int lParam);
}

public static class NativeConsoleWindow {
    [DllImport("kernel32.dll")]
    public static extern IntPtr GetConsoleWindow();
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

if (-not $StatusPath) {
    $repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\..\.."))
    $StatusPath = Join-Path $repoRoot ".codex-bridge\status.json"
}
elseif (-not [System.IO.Path]::IsPathRooted($StatusPath)) {
    $StatusPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $StatusPath))
}
if ($ControlConfigPath -and -not [System.IO.Path]::IsPathRooted($ControlConfigPath)) {
    $ControlConfigPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $ControlConfigPath))
}
if ($LogPath -and -not [System.IO.Path]::IsPathRooted($LogPath)) {
    $LogPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $LogPath))
}
if ($PidPath -and -not [System.IO.Path]::IsPathRooted($PidPath)) {
    $PidPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $PidPath))
}
if ($PidPath) {
    Set-Content -LiteralPath $PidPath -Value ([string]$PID)
}

function Write-StatusLightLog {
    param([Parameter(Mandatory = $true)][string]$Message)

    if (-not $LogPath) {
        return
    }

    try {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Add-Content -LiteralPath $LogPath -Value "[$timestamp] $Message"
    }
    catch {
    }
}

try {
    $consoleWindow = [NativeConsoleWindow]::GetConsoleWindow()
    if ($consoleWindow -ne [IntPtr]::Zero) {
        [void][NativeConsoleWindow]::ShowWindow($consoleWindow, 0)
    }
}
catch {
}

$ControlPath = Join-Path $PSScriptRoot "bridge-control.ps1"
$script:CurrentState = "stopped"
$script:LastSoundState = $null
$script:StatusInitialized = $false
$script:IsExpanded = $false

$collapsedSize = New-Object System.Drawing.Size(156, 44)
$expandedSize = New-Object System.Drawing.Size(316, 174)
$background = [System.Drawing.Color]::FromArgb(34, 36, 40)
$outline = [System.Drawing.Color]::FromArgb(78, 84, 96)
$textColor = [System.Drawing.Color]::FromArgb(235, 238, 245)
$mutedTextColor = [System.Drawing.Color]::FromArgb(166, 174, 188)
$inactiveColor = [System.Drawing.Color]::FromArgb(69, 74, 84)
$greenColor = [System.Drawing.Color]::FromArgb(57, 217, 138)
$yellowColor = [System.Drawing.Color]::FromArgb(245, 190, 72)
$redColor = [System.Drawing.Color]::FromArgb(239, 93, 93)

$form = New-Object System.Windows.Forms.Form
$form.Text = "Lighthouse Bridge"
$form.Size = $collapsedSize
$form.MinimumSize = $collapsedSize
$form.MaximumSize = $expandedSize
$form.StartPosition = "Manual"
$form.Location = New-Object System.Drawing.Point(([System.Windows.Forms.Screen]::PrimaryScreen.WorkingArea.Right - $form.Width - 16), 16)
$form.TopMost = $true
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$form.ShowInTaskbar = $false
$form.BackColor = $background
$form.ForeColor = $textColor
$form.Opacity = 0.97

$trayMenu = New-Object System.Windows.Forms.ContextMenuStrip
$trayShowItem = New-Object System.Windows.Forms.ToolStripMenuItem("Show Applet")
$trayPowerItem = New-Object System.Windows.Forms.ToolStripMenuItem("Power")
$trayExitItem = New-Object System.Windows.Forms.ToolStripMenuItem("Exit Applet")
[void]$trayMenu.Items.Add($trayShowItem)
[void]$trayMenu.Items.Add($trayPowerItem)
[void]$trayMenu.Items.Add("-")
[void]$trayMenu.Items.Add($trayExitItem)

$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
$notifyIcon.Text = "Lighthouse Bridge"
$notifyIcon.ContextMenuStrip = $trayMenu
$notifyIcon.Visible = $true

function Show-Applet {
    $form.Show()
    $form.WindowState = [System.Windows.Forms.FormWindowState]::Normal
    $form.Activate()
}

function Hide-Applet {
    $form.Hide()
}

function Toggle-AppletVisibility {
    if ($form.Visible) {
        Hide-Applet
    }
    else {
        Show-Applet
    }
}

function New-IconButton {
    param(
        [Parameter(Mandatory = $true)][int]$X,
        [Parameter(Mandatory = $true)][int]$Y,
        [Parameter(Mandatory = $true)][int]$Width,
        [Parameter(Mandatory = $true)][int]$Height
    )

    $button = New-Object System.Windows.Forms.Panel
    $button.Location = New-Object System.Drawing.Point($X, $Y)
    $button.Size = New-Object System.Drawing.Size($Width, $Height)
    $button.BackColor = $background
    $button.Cursor = [System.Windows.Forms.Cursors]::Hand
    return $button
}

function Add-PowerIcon {
    param([Parameter(Mandatory = $true)]$Button)

    $Button.Tag = $textColor
    $Button.Add_Paint({
        param($sender, $event)
        $event.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $pen = New-Object System.Drawing.Pen([System.Drawing.Color]$sender.Tag, 2)
        try {
            $event.Graphics.DrawEllipse($pen, 8, 9, 14, 14)
            $event.Graphics.DrawLine($pen, 15, 5, 15, 14)
        }
        finally {
            $pen.Dispose()
        }
    })
}

function Add-TriangleIcon {
    param([Parameter(Mandatory = $true)]$Button)

    $Button.Tag = "right"
    $Button.Add_Paint({
        param($sender, $event)
        $event.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $brush = New-Object System.Drawing.SolidBrush($textColor)
        try {
            if ([string]$sender.Tag -eq "down") {
                $points = @(
                    (New-Object System.Drawing.Point(8, 11)),
                    (New-Object System.Drawing.Point(18, 11)),
                    (New-Object System.Drawing.Point(13, 18))
                )
            }
            else {
                $points = @(
                    (New-Object System.Drawing.Point(10, 8)),
                    (New-Object System.Drawing.Point(10, 20)),
                    (New-Object System.Drawing.Point(18, 14))
                )
            }
            $event.Graphics.FillPolygon($brush, [System.Drawing.Point[]]$points)
        }
        finally {
            $brush.Dispose()
        }
    })
}

function New-LightPanel {
    param([int]$X)

    $panel = New-Object System.Windows.Forms.Panel
    $panel.Location = New-Object System.Drawing.Point($X, 14)
    $panel.Size = New-Object System.Drawing.Size(17, 17)
    $panel.BackColor = $background
    $panel.Tag = $inactiveColor
    $panel.Add_Paint({
        param($sender, $event)
        $event.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]$sender.Tag)
        $pen = New-Object System.Drawing.Pen($outline, 1)
        try {
            $event.Graphics.FillEllipse($brush, 1, 1, 14, 14)
            $event.Graphics.DrawEllipse($pen, 1, 1, 14, 14)
        }
        finally {
            $brush.Dispose()
            $pen.Dispose()
        }
    })
    return $panel
}

function New-AppletButton {
    param(
        [Parameter(Mandatory = $true)][string]$Text,
        [Parameter(Mandatory = $true)][int]$X,
        [Parameter(Mandatory = $true)][int]$Y,
        [Parameter(Mandatory = $true)][int]$Width,
        [Parameter(Mandatory = $true)][int]$Height
    )

    $button = New-Object System.Windows.Forms.Button
    $button.Location = New-Object System.Drawing.Point($X, $Y)
    $button.Size = New-Object System.Drawing.Size($Width, $Height)
    $button.Text = $Text
    $button.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $button.FlatAppearance.BorderSize = 0
    $button.BackColor = $background
    $button.ForeColor = $textColor
    $button.Font = New-Object System.Drawing.Font("Segoe UI", 8, [System.Drawing.FontStyle]::Bold)
    $button.TabStop = $false
    return $button
}

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

function Play-StatusSound {
    param([Parameter(Mandatory = $true)][string]$State)

    try {
        switch ($State) {
            "codex-failed" { [System.Media.SystemSounds]::Hand.Play(); return }
            "codex-running" { [System.Media.SystemSounds]::Asterisk.Play(); return }
            "task-captured" { [System.Media.SystemSounds]::Asterisk.Play(); return }
            "codex-finished" { [System.Media.SystemSounds]::Exclamation.Play(); return }
            default { [System.Media.SystemSounds]::Beep.Play(); return }
        }
    }
    catch {
        # Keep status display alive if system sounds are unavailable.
    }
}

function Set-LightColors {
    param([Parameter(Mandatory = $true)][string]$State)

    $readyLight.Tag = $inactiveColor
    $workingLight.Tag = $inactiveColor
    $failedLight.Tag = $inactiveColor

    switch ($State) {
        "execution-idle" { $readyLight.Tag = $greenColor }
        "codex-finished" { $readyLight.Tag = $greenColor }
        "task-captured" { $workingLight.Tag = $yellowColor }
        "codex-running" { $workingLight.Tag = $yellowColor }
        "codex-failed" { $failedLight.Tag = $redColor }
        "unknown" { $failedLight.Tag = $redColor }
        default { }
    }

    $readyLight.Invalidate()
    $workingLight.Invalidate()
    $failedLight.Invalidate()
}

function Update-ExpandedLayout {
    if ($script:IsExpanded) {
        $form.MaximumSize = $expandedSize
        $form.Size = $expandedSize
        $menuButton.Tag = "down"
        $closeButton.Visible = $true
        $detailsPanel.Visible = $true
    }
    else {
        $form.MaximumSize = $collapsedSize
        $form.Size = $collapsedSize
        $menuButton.Tag = "right"
        $closeButton.Visible = $false
        $detailsPanel.Visible = $false
    }
    $menuButton.Invalidate()
}

function Update-StatusDisplay {
    $state = "stopped"
    $mode = "unknown"
    $lastTaskAt = $null
    $lastReportAt = $null
    $lastErrorAt = $null
    $lastErrorKind = $null
    $displayState = "Stopped"

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
                "capture-only-idle" { $displayState = "Capture only" }
                "execution-idle" { $displayState = "Ready" }
                "task-captured" { $displayState = "Captured" }
                "codex-running" { $displayState = "Running" }
                "codex-finished" { $displayState = "Finished" }
                "codex-failed" { $displayState = "Failed" }
                "stopped" { $displayState = "Stopped" }
                default { $displayState = "Unknown" }
            }
        }
        catch {
            $state = "unknown"
            $displayState = "Malformed"
        }
    }

    Set-LightColors -State $state
    $stateText.Text = $displayState
    $stateText.ForeColor = if ($state -eq "codex-failed" -or $state -eq "unknown") { $redColor } elseif ($state -in @("codex-running", "task-captured")) { $yellowColor } elseif ($state -in @("execution-idle", "codex-finished")) { $greenColor } else { $mutedTextColor }
    $powerButton.Tag = if ($state -in @("execution-idle", "task-captured", "codex-running", "codex-finished", "codex-failed")) { $greenColor } else { $mutedTextColor }
    $powerButton.Invalidate()
    $trayPowerItem.Text = if ($state -in @("execution-idle", "task-captured", "codex-running", "codex-finished", "codex-failed")) { "Power Off" } else { "Power On" }
    $trayShowItem.Text = if ($form.Visible) { "Hide Applet" } else { "Show Applet" }
    $notifyIcon.Text = "Lighthouse Bridge: $displayState"

    $errorText = if ($lastErrorKind) { "$(Format-StatusTime $lastErrorAt) ($lastErrorKind)" } else { "-" }
    $detailsLabel.Text = "State:  $state`r`nMode:   $mode`r`nTask:   $(Format-StatusTime $lastTaskAt)`r`nReport: $(Format-StatusTime $lastReportAt)`r`nError:  $errorText"

    if ($script:StatusInitialized -and $script:LastSoundState -ne $state) {
        Play-StatusSound -State $state
    }
    $script:StatusInitialized = $true
    $script:LastSoundState = $state
    $script:CurrentState = $state
}

function Invoke-BridgePowerToggle {
    $powerButton.Enabled = $false
    try {
        $command = if ($script:CurrentState -in @("execution-idle", "task-captured", "codex-running", "codex-finished", "codex-failed")) { "stop" } else { "start" }
        $processInfo = New-Object System.Diagnostics.ProcessStartInfo
        $processInfo.FileName = "powershell.exe"
        $arguments = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$ControlPath`"", $command)
        if ($command -eq "start" -and $ControlConfigPath) {
            $arguments += @("-ConfigPath", "`"$ControlConfigPath`"")
        }
        $processInfo.Arguments = $arguments -join " "
        $processInfo.WorkingDirectory = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\..\.."))
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

function Start-DragMove {
    param($Sender, $Event)
    if ($Event.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        [void][NativeWindowDrag]::ReleaseCapture()
        [void][NativeWindowDrag]::SendMessage($form.Handle, 0xA1, 0x2, 0)
    }
}

$powerButton = New-IconButton -X 5 -Y 6 -Width 34 -Height 30
Add-PowerIcon -Button $powerButton
$form.Controls.Add($powerButton)

$readyLight = New-LightPanel -X 46
$workingLight = New-LightPanel -X 69
$failedLight = New-LightPanel -X 92
$form.Controls.Add($readyLight)
$form.Controls.Add($workingLight)
$form.Controls.Add($failedLight)

$menuButton = New-IconButton -X 122 -Y 6 -Width 26 -Height 30
Add-TriangleIcon -Button $menuButton
$form.Controls.Add($menuButton)

$stateText = New-Object System.Windows.Forms.Label
$stateText.Location = New-Object System.Drawing.Point(14, 47)
$stateText.Size = New-Object System.Drawing.Size(210, 20)
$stateText.Font = New-Object System.Drawing.Font("Segoe UI", 9, [System.Drawing.FontStyle]::Bold)
$stateText.ForeColor = $mutedTextColor
$stateText.BackColor = $background
$stateText.Text = "Stopped"
$form.Controls.Add($stateText)

$closeButton = New-AppletButton -Text "Close" -X 240 -Y 6 -Width 66 -Height 28
$closeButton.Visible = $false
$form.Controls.Add($closeButton)

$detailsPanel = New-Object System.Windows.Forms.Panel
$detailsPanel.Location = New-Object System.Drawing.Point(10, 72)
$detailsPanel.Size = New-Object System.Drawing.Size(296, 92)
$detailsPanel.BackColor = [System.Drawing.Color]::FromArgb(27, 29, 34)
$detailsPanel.Visible = $false
$form.Controls.Add($detailsPanel)

$detailsLabel = New-Object System.Windows.Forms.Label
$detailsLabel.Location = New-Object System.Drawing.Point(10, 8)
$detailsLabel.Size = New-Object System.Drawing.Size(274, 76)
$detailsLabel.Font = New-Object System.Drawing.Font("Consolas", 8)
$detailsLabel.ForeColor = $textColor
$detailsLabel.BackColor = $detailsPanel.BackColor
$detailsLabel.Text = "State:  stopped`r`nMode:   unknown`r`nTask:   -`r`nReport: -`r`nError:  -"
$detailsPanel.Controls.Add($detailsLabel)

$dragTargets = @($form, $readyLight, $workingLight, $failedLight, $stateText, $detailsPanel, $detailsLabel)
foreach ($target in $dragTargets) {
    $target.Add_MouseDown({ Start-DragMove $this $_ })
}

$menuButton.Add_Click({
    $script:IsExpanded = -not $script:IsExpanded
    Update-ExpandedLayout
    Update-StatusDisplay
})
$powerButton.Add_Click({ Invoke-BridgePowerToggle })
$trayShowItem.Add_Click({
    Toggle-AppletVisibility
    Update-StatusDisplay
})
$trayPowerItem.Add_Click({ Invoke-BridgePowerToggle })
$trayExitItem.Add_Click({ $form.Close() })
$notifyIcon.Add_MouseClick({
    param($sender, $event)
    if ($event.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
        Toggle-AppletVisibility
        Update-StatusDisplay
    }
})
$closeButton.Add_Click({
    $script:IsExpanded = $false
    Update-ExpandedLayout
    Update-StatusDisplay
})
$form.Add_Paint({
    param($sender, $event)
    $pen = New-Object System.Drawing.Pen($outline, 1)
    try {
        $event.Graphics.DrawRectangle($pen, 0, 0, $form.Width - 1, $form.Height - 1)
    }
    finally {
        $pen.Dispose()
    }
})

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = $RefreshIntervalMs
$timer.Add_Tick({ Update-StatusDisplay })
$form.Add_FormClosed({
    Write-StatusLightLog -Message "form closed reason=$($_.CloseReason)"
    $timer.Stop()
    $timer.Dispose()
    $notifyIcon.Visible = $false
    $notifyIcon.Dispose()
    $trayMenu.Dispose()
})

Update-ExpandedLayout
Update-StatusDisplay
$timer.Start()
[System.Windows.Forms.Application]::Run($form)
Write-StatusLightLog -Message "application run returned"
