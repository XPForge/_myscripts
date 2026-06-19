param(
    [string]$ExecuteConfigPath = ".\tools\clipboard-bridge\config.local.json",
    [switch]$KeepOldShortcuts
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$ControlPath = Join-Path $PSScriptRoot "bridge-control.ps1"
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$PowerShellPath = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
$RuntimePath = Join-Path $RepoRoot ".codex-bridge"
$LogsPath = Join-Path $RuntimePath "logs"
$StableExecuteConfigPath = if ([System.IO.Path]::IsPathRooted($ExecuteConfigPath)) {
    [System.IO.Path]::GetFullPath($ExecuteConfigPath)
}
else {
    [System.IO.Path]::GetFullPath((Join-Path $RepoRoot $ExecuteConfigPath))
}

function Initialize-ShortcutPaths {
    New-Item -ItemType Directory -Force -Path $LogsPath | Out-Null
}

function Write-ShortcutLog {
    param([Parameter(Mandatory = $true)][string]$Message)

    Initialize-ShortcutPaths
    $date = Get-Date -Format "yyyyMMdd"
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logPath = Join-Path $LogsPath "$date-shortcuts.log"
    Add-Content -LiteralPath $logPath -Value "[$timestamp] $Message"
}

function New-Shortcut {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [string]$Arguments,
        [Parameter(Mandatory = $true)]
        [string]$Description
    )

    $shortcutPath = Join-Path $DesktopPath "$Name.lnk"
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $PowerShellPath
    $shortcut.Arguments = $Arguments
    $shortcut.WorkingDirectory = $RepoRoot
    $shortcut.Description = $Description
    $shortcut.IconLocation = "$PowerShellPath,0"
    $shortcut.Save()

    Write-ShortcutLog "created-or-updated shortcut name=$Name path=$shortcutPath"
    return $shortcutPath
}

function Test-BridgeShortcut {
    param([Parameter(Mandatory = $true)][string]$ShortcutPath)

    try {
        $shell = New-Object -ComObject WScript.Shell
        $shortcut = $shell.CreateShortcut($ShortcutPath)
        $haystack = "$($shortcut.TargetPath) $($shortcut.Arguments) $($shortcut.WorkingDirectory)".ToLowerInvariant()
        return $haystack.Contains("\tools\clipboard-bridge\") -or
            $haystack.Contains("bridge-control.ps1") -or
            $haystack.Contains("toggle-bridge.ps1")
    }
    catch {
        return $false
    }
}

function Remove-OldBridgeShortcuts {
    if ($KeepOldShortcuts) {
        Write-ShortcutLog "old shortcut cleanup skipped keepOldShortcuts=true"
        return
    }

    $oldNames = @(
        "Lighthouse Bridge Toggle",
        "Lighthouse Bridge Execute Toggle"
    )

    foreach ($oldName in $oldNames) {
        $oldPath = Join-Path $DesktopPath "$oldName.lnk"
        if (-not (Test-Path -LiteralPath $oldPath)) {
            Write-ShortcutLog "old shortcut not found name=$oldName"
            continue
        }

        if (Test-BridgeShortcut -ShortcutPath $oldPath) {
            Remove-Item -LiteralPath $oldPath -Force
            Write-ShortcutLog "removed old bridge shortcut name=$oldName path=$oldPath"
        }
        else {
            Write-ShortcutLog "left possible non-bridge shortcut alone name=$oldName path=$oldPath"
            Write-Host "Left existing shortcut alone because it could not be verified as bridge-owned: $oldPath"
        }
    }
}

Initialize-ShortcutPaths
Remove-OldBridgeShortcuts

$captureArguments = "-NoProfile -ExecutionPolicy Bypass -Command `"& '$ControlPath' start; Start-Sleep -Seconds 3`""
$executeArguments = "-NoProfile -ExecutionPolicy Bypass -Command `"if (-not (Test-Path -LiteralPath '$StableExecuteConfigPath')) { Write-Host 'Execution config missing. Create config.local.json from config.local.example.json first.'; Start-Sleep -Seconds 6; exit 1 }; & '$ControlPath' start -ConfigPath '$StableExecuteConfigPath'; Start-Sleep -Seconds 3`""
$stopArguments = "-NoProfile -ExecutionPolicy Bypass -Command `"& '$ControlPath' stop; Start-Sleep -Seconds 3`""
$statusArguments = "-NoProfile -ExecutionPolicy Bypass -NoExit -Command `"& '$ControlPath' status`""

$created = @()
$created += New-Shortcut -Name "START Lighthouse Bridge - Capture Only" -Arguments $captureArguments -Description "Start the Lighthouse Clipboard Bridge in capture-only mode."
$created += New-Shortcut -Name "START Lighthouse Bridge - Execute Codex" -Arguments $executeArguments -Description "Start the Lighthouse Clipboard Bridge in execution-enabled mode using config.local.json."
$created += New-Shortcut -Name "STOP Lighthouse Bridge" -Arguments $stopArguments -Description "Stop the Lighthouse Clipboard Bridge."
$created += New-Shortcut -Name "STATUS Lighthouse Bridge" -Arguments $statusArguments -Description "Show Lighthouse Clipboard Bridge status."

Write-Host "Lighthouse Bridge shortcuts created or updated:"
foreach ($path in $created) {
    Write-Host $path
}
Write-Host "Execution shortcut config path:"
Write-Host $StableExecuteConfigPath
if (-not (Test-Path -LiteralPath $StableExecuteConfigPath)) {
    Write-Host "Execution config missing. Create config.local.json from config.local.example.json first."
}
