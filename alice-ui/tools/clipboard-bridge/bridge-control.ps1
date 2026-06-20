param(
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateSet("start", "stop", "restart", "status")]
    [string]$Command,

    [string]$ConfigPath = "",

    [switch]$CaptureOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$RuntimePath = Join-Path $RepoRoot ".codex-bridge"
$LogsPath = Join-Path $RuntimePath "logs"
$PidPath = Join-Path $RuntimePath "bridge.pid"
$StatusPath = Join-Path $RuntimePath "bridge-status.json"
$DisplayStatusPath = Join-Path $RuntimePath "status.json"
$WatcherPath = Join-Path $PSScriptRoot "watch-clipboard.ps1"
$DefaultExecutionConfigPath = Join-Path $PSScriptRoot "config.local.json"
$LaunchVerifyDelayMs = 1500

function Initialize-ControlPaths {
    New-Item -ItemType Directory -Force -Path $RuntimePath, $LogsPath | Out-Null
}

function Write-ControlLog {
    param([Parameter(Mandatory = $true)][string]$Message)

    Initialize-ControlPaths
    $date = Get-Date -Format "yyyyMMdd"
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logPath = Join-Path $LogsPath "$date-control.log"
    Add-Content -LiteralPath $logPath -Value "[$timestamp] $Message"
}

function ConvertTo-SafeDisplayTimestamp {
    param($Value)

    if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value)) { return $null }
    try { return ([datetimeoffset]::Parse([string]$Value)).ToUniversalTime().ToString("o") } catch { return $null }
}

function ConvertTo-SafeDisplayErrorKind {
    param($Value)

    $label = [string]$Value
    if ($label -match '^[a-z0-9-]{1,48}$') { return $label }
    return $null
}

function Write-DisplayStoppedStatus {
    param([string]$Reason)

    $existing = $null
    if (Test-Path -LiteralPath $DisplayStatusPath) {
        try { $existing = Get-Content -LiteralPath $DisplayStatusPath -Raw | ConvertFrom-Json } catch { $existing = $null }
    }

    $controlStatus = Read-BridgeStatusFile
    $displayMode = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "mode" -and $existing.mode -in @("capture-only", "execution-enabled", "unknown")) {
        [string]$existing.mode
    }
    elseif ($null -ne $controlStatus -and $controlStatus.PSObject.Properties.Name -contains "executionMode" -and $controlStatus.executionMode -in @("capture-only", "execution-enabled", "unknown")) {
        [string]$controlStatus.executionMode
    }
    else {
        "unknown"
    }

    $status = [ordered]@{
        schemaVersion = 1
        state = "stopped"
        mode = $displayMode
        updatedAt = (Get-Date).ToUniversalTime().ToString("o")
        lastTaskAt = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "lastTaskAt") { ConvertTo-SafeDisplayTimestamp $existing.lastTaskAt } else { $null }
        lastReportAt = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "lastReportAt") { ConvertTo-SafeDisplayTimestamp $existing.lastReportAt } else { $null }
        lastErrorAt = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "lastErrorAt") { ConvertTo-SafeDisplayTimestamp $existing.lastErrorAt } else { $null }
        lastErrorKind = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "lastErrorKind") { ConvertTo-SafeDisplayErrorKind $existing.lastErrorKind } else { $null }
    }
    $temporaryPath = "$DisplayStatusPath.tmp"
    $encoding = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($temporaryPath, ($status | ConvertTo-Json), $encoding)
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        try {
            Move-Item -LiteralPath $temporaryPath -Destination $DisplayStatusPath -Force
            return
        }
        catch {
            if ($attempt -eq 5) { throw }
            Start-Sleep -Milliseconds 50
        }
    }
}

function Read-BridgePid {
    if (-not (Test-Path -LiteralPath $PidPath)) {
        return $null
    }

    $rawPid = (Get-Content -LiteralPath $PidPath -Raw).Trim()
    if ($rawPid -notmatch '^\d+$') {
        return $null
    }

    return [int]$rawPid
}

function Get-BridgeProcess {
    param([Parameter(Mandatory = $true)][int]$ProcessIdValue)

    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessIdValue" -ErrorAction SilentlyContinue
    if ($null -eq $process) {
        $fallbackProcess = Get-Process -Id $ProcessIdValue -ErrorAction SilentlyContinue
        if ($null -ne $fallbackProcess -and $fallbackProcess.ProcessName -in @("powershell", "pwsh")) {
            return $fallbackProcess
        }
        return $null
    }

    $normalizedWatcherPath = $WatcherPath.ToLowerInvariant()
    $commandLine = if ($process.CommandLine) { $process.CommandLine.ToLowerInvariant() } else { "" }

    if ($commandLine.Contains($normalizedWatcherPath)) {
        return $process
    }

    return $null
}

function Get-BridgeStatus {
    $pidValue = Read-BridgePid
    if ($null -eq $pidValue) {
        return [pscustomobject]@{
            PidFileExists = (Test-Path -LiteralPath $PidPath)
            Pid = $null
            IsRunning = $false
            Process = $null
        }
    }

    $process = Get-BridgeProcess -ProcessIdValue $pidValue
    return [pscustomobject]@{
        PidFileExists = $true
        Pid = $pidValue
        IsRunning = ($null -ne $process)
        Process = $process
    }
}

function Clear-StaleBridgeState {
    param([string]$Reason)

    $hadPid = Test-Path -LiteralPath $PidPath
    if ($hadPid) {
        Remove-Item -LiteralPath $PidPath -Force
    }

    Update-BridgeStoppedStatus -Reason $Reason
    Write-ControlLog "stale state cleaned reason=$Reason hadPidFile=$hadPid"
}

function Resolve-ConfigPath {
    param([string]$Path)

    if (-not $Path) {
        return ""
    }

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return [System.IO.Path]::GetFullPath($Path)
    }

    return [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $Path))
}

function Resolve-StartConfigPath {
    if ($CaptureOnly) {
        return Resolve-ConfigPath -Path $ConfigPath
    }

    if ($ConfigPath) {
        return Resolve-ConfigPath -Path $ConfigPath
    }

    return [System.IO.Path]::GetFullPath($DefaultExecutionConfigPath)
}

function Get-ExecutionMode {
    param([string]$ResolvedConfigPath)

    if (-not $ResolvedConfigPath) {
        if ($CaptureOnly) {
            return "capture-only"
        }
        return "execution-enabled"
    }

    if (-not (Test-Path -LiteralPath $ResolvedConfigPath)) {
        return "unknown"
    }

    try {
        $rawConfig = Get-Content -LiteralPath $ResolvedConfigPath -Raw | ConvertFrom-Json
        if ($rawConfig.PSObject.Properties.Name -contains "executionEnabled") {
            if ($rawConfig.executionEnabled) {
                return "execution-enabled"
            }
            return "capture-only"
        }
        if ($CaptureOnly) {
            return "capture-only"
        }
        return "execution-enabled"
    }
    catch {
        return "unknown"
    }
}

function Read-BridgeStatusFile {
    if (-not (Test-Path -LiteralPath $StatusPath)) {
        return $null
    }

    try {
        return Get-Content -LiteralPath $StatusPath -Raw | ConvertFrom-Json
    }
    catch {
        return $null
    }
}

function Write-BridgeStatusFile {
    param(
        [Parameter(Mandatory = $true)]
        [int]$ProcessIdValue,
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$ResolvedConfigPath,
        [Parameter(Mandatory = $true)]
        [string]$ExecutionMode
    )

    $status = [ordered]@{
        pid = $ProcessIdValue
        startedAt = (Get-Date).ToString("o")
        configPath = $ResolvedConfigPath
        executionEnabled = ($ExecutionMode -eq "execution-enabled")
        executionMode = $ExecutionMode
    }

    $status | ConvertTo-Json | Set-Content -LiteralPath $StatusPath
}

function Update-BridgeStoppedStatus {
    param([string]$Reason)

    $existing = Read-BridgeStatusFile
    $status = [ordered]@{
        pid = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "pid") { $existing.pid } else { $null }
        startedAt = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "startedAt") { $existing.startedAt } else { $null }
        stoppedAt = (Get-Date).ToString("o")
        configPath = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "configPath") { $existing.configPath } else { "" }
        executionEnabled = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "executionEnabled") { $existing.executionEnabled } else { $null }
        executionMode = if ($null -ne $existing -and $existing.PSObject.Properties.Name -contains "executionMode") { $existing.executionMode } else { "unknown" }
        state = "stopped"
        reason = $Reason
    }

    $status | ConvertTo-Json | Set-Content -LiteralPath $StatusPath
    Write-DisplayStoppedStatus -Reason $Reason
}

function Quote-Argument {
    param([Parameter(Mandatory = $true)][string]$Value)

    if ($Value -notmatch '[\s"]') {
        return $Value
    }

    return '"' + ($Value -replace '"', '\"') + '"'
}

function Start-Bridge {
    Initialize-ControlPaths

    $status = Get-BridgeStatus
    if ($status.IsRunning) {
        $statusFile = Read-BridgeStatusFile
        $runningMode = if ($null -ne $statusFile -and $statusFile.PSObject.Properties.Name -contains "executionMode") { [string]$statusFile.executionMode } else { "unknown" }
        Write-Host "Lighthouse Clipboard Bridge already running in $runningMode mode (PID $($status.Pid))"
        Write-ControlLog "start skipped already-running pid=$($status.Pid) mode=$runningMode"
        return
    }

    if ($status.PidFileExists) {
        Clear-StaleBridgeState -Reason "stale-before-start"
    }

    $arguments = @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-STA",
        "-File", $WatcherPath
    )

    $resolvedConfigPath = Resolve-StartConfigPath
    $executionMode = Get-ExecutionMode -ResolvedConfigPath $resolvedConfigPath

    if ($resolvedConfigPath) {
        if (-not (Test-Path -LiteralPath $resolvedConfigPath)) {
            Write-Host "Lighthouse Clipboard Bridge failed to start: config file not found."
            Write-Host "Config path: $resolvedConfigPath"
            Write-Host "Create it from tools\\clipboard-bridge\\config.local.example.json for execution-enabled shortcuts."
            Write-ControlLog "start failed missing-config configProvided=true"
            exit 1
        }
        $arguments += @("-ConfigPath", $resolvedConfigPath)
    }

    if ($CaptureOnly) {
        $arguments += "-CaptureOnly"
    }
    elseif ($executionMode -ne "execution-enabled") {
        Write-Host "Lighthouse Clipboard Bridge failed to start: normal starts require execution-enabled mode."
        Write-Host "Set executionEnabled to true in config.local.json, or use -CaptureOnly only for explicit developer testing."
        Write-ControlLog "start failed capture-only-config-without-dev-flag mode=$executionMode"
        exit 1
    }

    $argumentLine = ($arguments | ForEach-Object { Quote-Argument -Value ([string]$_) }) -join " "
    Write-ControlLog "start attempted mode=$executionMode configProvided=$([bool]$resolvedConfigPath)"
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = "powershell.exe"
    $processInfo.Arguments = $argumentLine
    $processInfo.WorkingDirectory = $RepoRoot
    $processInfo.UseShellExecute = $false
    $processInfo.CreateNoWindow = $true
    $process = [System.Diagnostics.Process]::Start($processInfo)
    Write-ControlLog "start launched pid=$($process.Id)"

    Start-Sleep -Milliseconds $LaunchVerifyDelayMs
    $verifiedProcess = Get-BridgeProcess -ProcessIdValue $process.Id
    if ($null -eq $verifiedProcess) {
        Write-Host "Lighthouse Clipboard Bridge failed to start: watcher process exited or was not verified."
        Write-ControlLog "start failed pid=$($process.Id) aliveAfterLaunch=false"
        Update-BridgeStoppedStatus -Reason "start-failed"
        exit 1
    }

    Set-Content -LiteralPath $PidPath -Value ([string]$process.Id)
    Write-BridgeStatusFile -ProcessIdValue $process.Id -ResolvedConfigPath $resolvedConfigPath -ExecutionMode $executionMode
    Write-ControlLog "start verified pid=$($process.Id) aliveAfterLaunch=true mode=$executionMode"
    Write-Host "Lighthouse Clipboard Bridge started in $executionMode mode (PID $($process.Id))"
}

function Stop-Bridge {
    Initialize-ControlPaths

    $status = Get-BridgeStatus
    if (-not $status.IsRunning) {
        if ($status.PidFileExists) {
            Clear-StaleBridgeState -Reason "stale-during-stop"
        }
        Write-Host "Lighthouse Clipboard Bridge is not running"
        Update-BridgeStoppedStatus -Reason "already-stopped"
        Write-ControlLog "stop skipped not-running"
        return
    }

    Stop-Process -Id $status.Pid -Force
    Start-Sleep -Milliseconds 750
    $stillRunning = Get-BridgeProcess -ProcessIdValue $status.Pid
    if ($null -ne $stillRunning) {
        Write-Host "Lighthouse Clipboard Bridge stop failed: watcher still running (PID $($status.Pid))"
        Write-ControlLog "stop failed pid=$($status.Pid) stillRunning=true"
        exit 1
    }

    Remove-Item -LiteralPath $PidPath -Force -ErrorAction SilentlyContinue
    Update-BridgeStoppedStatus -Reason "stopped-by-control"

    Write-Host "Lighthouse Clipboard Bridge stopped"
    Write-ControlLog "stopped pid=$($status.Pid)"
}

function Show-BridgeStatus {
    Initialize-ControlPaths

    $status = Get-BridgeStatus
    $statusFile = Read-BridgeStatusFile
    $statusConfigPath = if ($null -ne $statusFile -and $statusFile.PSObject.Properties.Name -contains "configPath") { [string]$statusFile.configPath } else { "" }
    $statusMode = if ($null -ne $statusFile -and $statusFile.PSObject.Properties.Name -contains "executionMode") { [string]$statusFile.executionMode } else { "unknown" }

    if ($status.IsRunning) {
        Write-Host "Lighthouse Clipboard Bridge running"
        Write-Host "PID: $($status.Pid)"
        Write-Host "PID file exists: $($status.PidFileExists)"
        Write-Host "Config path: $(if ($statusConfigPath) { $statusConfigPath } else { '(default)' })"
        Write-Host "Execution mode: $statusMode"
        Write-ControlLog "status running pid=$($status.Pid) mode=$statusMode pidFileExists=$($status.PidFileExists)"
        return
    }

    Write-Host "Lighthouse Clipboard Bridge not running"
    if ($null -ne $status.Pid) {
        Write-Host "PID file exists: $($status.PidFileExists)"
        Write-Host "Stale PID: $($status.Pid)"
        Clear-StaleBridgeState -Reason "stale-during-status"
    }
    else {
        Write-Host "PID file exists: $($status.PidFileExists)"
    }
    Write-Host "Config path: $(if ($statusConfigPath) { $statusConfigPath } else { '(unknown)' })"
    Write-Host "Execution mode: $statusMode"
    Write-ControlLog "status not-running mode=$statusMode pidFileExists=$($status.PidFileExists)"
}

switch ($Command) {
    "start" {
        Start-Bridge
    }
    "stop" {
        Stop-Bridge
    }
    "restart" {
        Stop-Bridge
        Start-Bridge
    }
    "status" {
        Show-BridgeStatus
    }
}
