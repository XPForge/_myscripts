param(
    [string]$ConfigPath = "",
    [switch]$NoPopup
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$RuntimePath = Join-Path $RepoRoot ".codex-bridge"
$LogsPath = Join-Path $RuntimePath "logs"
$PidPath = Join-Path $RuntimePath "bridge.pid"
$WatcherPath = Join-Path $PSScriptRoot "watch-clipboard.ps1"
$ControlPath = Join-Path $PSScriptRoot "bridge-control.ps1"

function Initialize-TogglePaths {
    New-Item -ItemType Directory -Force -Path $RuntimePath, $LogsPath | Out-Null
}

function Write-ToggleLog {
    param([Parameter(Mandatory = $true)][string]$Message)

    Initialize-TogglePaths
    $date = Get-Date -Format "yyyyMMdd"
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logPath = Join-Path $LogsPath "$date-toggle.log"
    Add-Content -LiteralPath $logPath -Value "[$timestamp] $Message"
}

function Show-ToggleMessage {
    param([Parameter(Mandatory = $true)][string]$Message)

    Write-Host $Message

    if ($NoPopup) {
        return
    }

    try {
        Add-Type -AssemblyName System.Windows.Forms -ErrorAction Stop
        [System.Windows.Forms.MessageBox]::Show($Message, "Lighthouse Bridge Toggle", [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information) | Out-Null
    }
    catch {
        Write-Host "Popup unavailable; console status shown."
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

function Test-BridgeRunning {
    $pidValue = Read-BridgePid
    if ($null -eq $pidValue) {
        return $false
    }

    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $pidValue" -ErrorAction SilentlyContinue
    if ($null -eq $process) {
        return $false
    }

    $commandLine = if ($process.CommandLine) { $process.CommandLine.ToLowerInvariant() } else { "" }
    return $commandLine.Contains($WatcherPath.ToLowerInvariant())
}

function Invoke-Control {
    param([Parameter(Mandatory = $true)][string]$ControlCommand)

    $arguments = @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", $ControlPath,
        $ControlCommand
    )

    if ($ConfigPath -and $ControlCommand -eq "start") {
        $arguments += @("-ConfigPath", $ConfigPath)
    }

    $output = & powershell.exe @arguments 2>&1
    return [pscustomobject]@{
        Output = ($output -join "`n")
        ExitCode = $LASTEXITCODE
    }
}

Initialize-TogglePaths

if (Test-BridgeRunning) {
    $result = Invoke-Control -ControlCommand "stop"
    if ($result.Output) {
        Write-Host $result.Output
    }

    if ($result.ExitCode -eq 0 -and -not (Test-BridgeRunning)) {
        Write-ToggleLog "toggle stopped bridge verified=true"
        Show-ToggleMessage "Lighthouse Clipboard Bridge stopped"
    }
    else {
        Write-ToggleLog "toggle stop failed verified=false exitCode=$($result.ExitCode)"
        Show-ToggleMessage "Lighthouse Clipboard Bridge stop failed"
        exit 1
    }
}
else {
    $resolvedConfigPath = Resolve-ConfigPath -Path $ConfigPath
    $executionMode = Get-ExecutionMode -ResolvedConfigPath $resolvedConfigPath
    $result = Invoke-Control -ControlCommand "start"
    if ($result.Output) {
        Write-Host $result.Output
    }

    if ($result.ExitCode -eq 0 -and (Test-BridgeRunning)) {
        Write-ToggleLog "toggle started bridge mode=$executionMode configProvided=$([bool]$resolvedConfigPath) verified=true"
        Show-ToggleMessage "Lighthouse Clipboard Bridge started in $executionMode mode"
    }
    else {
        Write-ToggleLog "toggle start failed mode=$executionMode configProvided=$([bool]$resolvedConfigPath) verified=false exitCode=$($result.ExitCode)"
        Show-ToggleMessage "Lighthouse Clipboard Bridge start failed"
        exit 1
    }
}
