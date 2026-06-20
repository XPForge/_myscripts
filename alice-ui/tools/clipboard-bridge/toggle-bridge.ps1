param(
    [string]$ConfigPath = "",
    [switch]$NoPopup,
    [switch]$CaptureOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$RuntimePath = Join-Path $RepoRoot ".codex-bridge"
$LogsPath = Join-Path $RuntimePath "logs"
$PidPath = Join-Path $RuntimePath "bridge.pid"
$WatcherPath = Join-Path $PSScriptRoot "watch-clipboard.ps1"
$ControlPath = Join-Path $PSScriptRoot "bridge-control.ps1"
$DefaultExecutionConfigPath = Join-Path $PSScriptRoot "config.local.json"

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

function Test-BridgeRunning {
    $pidValue = Read-BridgePid
    if ($null -eq $pidValue) {
        return $false
    }

    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $pidValue" -ErrorAction SilentlyContinue
    if ($null -eq $process) {
        $fallbackProcess = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
        if ($null -ne $fallbackProcess -and $fallbackProcess.ProcessName -in @("powershell", "pwsh")) {
            return $true
        }
        return $false
    }

    $commandLine = if ($process.CommandLine) { $process.CommandLine.ToLowerInvariant() } else { "" }
    if ($commandLine.Contains($WatcherPath.ToLowerInvariant())) {
        return $true
    }

    $fallbackProcess = Get-Process -Id $pidValue -ErrorAction SilentlyContinue
    return ($null -ne $fallbackProcess -and $fallbackProcess.ProcessName -in @("powershell", "pwsh"))
}

function Invoke-Control {
    param([Parameter(Mandatory = $true)][string]$ControlCommand)

    $arguments = @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-File", $ControlPath,
        $ControlCommand
    )

    if ($ControlCommand -eq "start") {
        if ($CaptureOnly) {
            $arguments += "-CaptureOnly"
        }
        if ($ConfigPath) {
            $arguments += @("-ConfigPath", $ConfigPath)
        }
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
    $resolvedConfigPath = Resolve-StartConfigPath
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
