param(
    [Parameter(Position = 0, Mandatory = $true)]
    [ValidateSet("start", "stop", "restart", "status")]
    [string]$Command,

    [string]$ConfigPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$RuntimePath = Join-Path $RepoRoot ".codex-bridge"
$LogsPath = Join-Path $RuntimePath "logs"
$PidPath = Join-Path $RuntimePath "bridge.pid"
$StatusPath = Join-Path $RuntimePath "bridge-status.json"
$WatcherPath = Join-Path $PSScriptRoot "watch-clipboard.ps1"
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

function Get-ExecutionMode {
    param([string]$ResolvedConfigPath)

    if (-not $ResolvedConfigPath) {
        return "capture-only"
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
        return "capture-only"
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
        "-File", $WatcherPath
    )

    $resolvedConfigPath = Resolve-ConfigPath -Path $ConfigPath
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

    $argumentLine = ($arguments | ForEach-Object { Quote-Argument -Value ([string]$_) }) -join " "
    Write-ControlLog "start attempted mode=$executionMode configProvided=$([bool]$resolvedConfigPath)"
    $process = Start-Process -FilePath "powershell.exe" -ArgumentList $argumentLine -WorkingDirectory $RepoRoot -WindowStyle Hidden -PassThru
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
