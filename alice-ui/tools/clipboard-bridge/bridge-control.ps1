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
$WatcherPath = Join-Path $PSScriptRoot "watch-clipboard.ps1"

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
        Write-Host "Lighthouse Clipboard Bridge already running (PID $($status.Pid))"
        Write-ControlLog "start skipped already-running pid=$($status.Pid)"
        return
    }

    if ($status.PidFileExists) {
        Remove-Item -LiteralPath $PidPath -Force
        Write-ControlLog "removed stale pid file"
    }

    $arguments = @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", $WatcherPath
    )

    if ($ConfigPath) {
        if ([System.IO.Path]::IsPathRooted($ConfigPath)) {
            $resolvedConfigPath = [System.IO.Path]::GetFullPath($ConfigPath)
        }
        else {
            $resolvedConfigPath = [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $ConfigPath))
        }
        $arguments += @("-ConfigPath", $resolvedConfigPath)
    }

    $argumentLine = ($arguments | ForEach-Object { Quote-Argument -Value ([string]$_) }) -join " "
    $process = Start-Process -FilePath "powershell.exe" -ArgumentList $argumentLine -WorkingDirectory $RepoRoot -WindowStyle Hidden -PassThru
    Set-Content -LiteralPath $PidPath -Value ([string]$process.Id)

    Write-Host "Lighthouse Clipboard Bridge started (PID $($process.Id))"
    Write-ControlLog "started pid=$($process.Id) configProvided=$([bool]$ConfigPath)"
}

function Stop-Bridge {
    Initialize-ControlPaths

    $status = Get-BridgeStatus
    if (-not $status.IsRunning) {
        if ($status.PidFileExists) {
            Remove-Item -LiteralPath $PidPath -Force
            Write-ControlLog "removed stale pid file during stop"
        }
        Write-Host "Lighthouse Clipboard Bridge is not running"
        Write-ControlLog "stop skipped not-running"
        return
    }

    Stop-Process -Id $status.Pid -Force
    Remove-Item -LiteralPath $PidPath -Force -ErrorAction SilentlyContinue

    Write-Host "Lighthouse Clipboard Bridge stopped"
    Write-ControlLog "stopped pid=$($status.Pid)"
}

function Show-BridgeStatus {
    Initialize-ControlPaths

    $status = Get-BridgeStatus
    if ($status.IsRunning) {
        Write-Host "Lighthouse Clipboard Bridge running"
        Write-Host "PID: $($status.Pid)"
        Write-Host "PID file exists: $($status.PidFileExists)"
        Write-ControlLog "status running pid=$($status.Pid) pidFileExists=$($status.PidFileExists)"
        return
    }

    Write-Host "Lighthouse Clipboard Bridge not running"
    if ($null -ne $status.Pid) {
        Write-Host "PID file exists: $($status.PidFileExists)"
        Write-Host "Stale PID: $($status.Pid)"
    }
    else {
        Write-Host "PID file exists: $($status.PidFileExists)"
    }
    Write-ControlLog "status not-running pidFileExists=$($status.PidFileExists)"
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
