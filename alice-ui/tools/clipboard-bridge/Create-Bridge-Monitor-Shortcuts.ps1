param(
    [string]$AppPath = "C:\Users\paulz\_myscripts\alice-ui",
    [string]$DesktopPath = "",
    [switch]$SkipStatusShortcut
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$AppPath = [System.IO.Path]::GetFullPath($AppPath)
$ControlPath = Join-Path $AppPath "tools\clipboard-bridge\bridge-control.ps1"
$RestartAndMonitorPath = Join-Path $AppPath "tools\clipboard-bridge\Restart-Bridge-And-Open-Monitor.ps1"
$PowerShellPath = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"

function Quote-ShortcutArgument {
    param([Parameter(Mandatory = $true)][string]$Value)

    return '"' + ($Value -replace '"', '\"') + '"'
}

function Get-DesktopPath {
    if (-not [string]::IsNullOrWhiteSpace($DesktopPath)) {
        New-Item -ItemType Directory -Force -Path $DesktopPath | Out-Null
        return [System.IO.Path]::GetFullPath($DesktopPath)
    }

    $candidates = New-Object System.Collections.Generic.List[string]

    try {
        $shell = New-Object -ComObject WScript.Shell
        $candidate = [string]$shell.SpecialFolders.Item("Desktop")
        if (-not [string]::IsNullOrWhiteSpace($candidate)) {
            $candidates.Add($candidate)
        }
    }
    catch {
        # Fall through to environment based locations.
    }

    $environmentDesktop = [Environment]::GetFolderPath("Desktop")
    if (-not [string]::IsNullOrWhiteSpace($environmentDesktop)) {
        $candidates.Add($environmentDesktop)
    }

    if (-not [string]::IsNullOrWhiteSpace($env:USERPROFILE)) {
        $candidates.Add((Join-Path $env:USERPROFILE "Desktop"))
    }

    $candidates.Add("C:\Users\paulz\Desktop")

    foreach ($candidate in ($candidates | Select-Object -Unique)) {
        if ([string]::IsNullOrWhiteSpace($candidate)) {
            continue
        }

        if (Test-Path -LiteralPath $candidate) {
            return [System.IO.Path]::GetFullPath($candidate)
        }

        try {
            New-Item -ItemType Directory -Force -Path $candidate | Out-Null
            return [System.IO.Path]::GetFullPath($candidate)
        }
        catch {
            continue
        }
    }

    throw "Desktop path could not be resolved."
}

function New-BridgeShortcut {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Arguments,
        [Parameter(Mandatory = $true)][string]$Description
    )

    $shortcutPath = Join-Path $DesktopPath "$Name.lnk"
    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = $PowerShellPath
    $shortcut.Arguments = $Arguments
    $shortcut.WorkingDirectory = $AppPath
    $shortcut.Description = $Description
    $shortcut.IconLocation = "$PowerShellPath,0"
    $shortcut.Save()

    return $shortcutPath
}

if (-not (Test-Path -LiteralPath $ControlPath)) {
    throw "Bridge control script not found: $ControlPath"
}

if (-not (Test-Path -LiteralPath $RestartAndMonitorPath)) {
    throw "Restart helper script not found: $RestartAndMonitorPath"
}

if (-not (Test-Path -LiteralPath $PowerShellPath)) {
    throw "Windows PowerShell executable not found: $PowerShellPath"
}

$DesktopPath = Get-DesktopPath

$created = @()
$created += New-BridgeShortcut `
    -Name "Lighthouse Bridge Monitor" `
    -Arguments ("-NoProfile -ExecutionPolicy Bypass -File {0} monitor-window" -f (Quote-ShortcutArgument -Value $ControlPath)) `
    -Description "Open the live Lighthouse Bridge monitor."

$created += New-BridgeShortcut `
    -Name "Restart Lighthouse Bridge" `
    -Arguments ("-NoProfile -ExecutionPolicy Bypass -File {0}" -f (Quote-ShortcutArgument -Value $RestartAndMonitorPath)) `
    -Description "Restart the Lighthouse Bridge, then open the live monitor."

if (-not $SkipStatusShortcut) {
    $created += New-BridgeShortcut `
        -Name "Lighthouse Bridge Status" `
        -Arguments ("-NoProfile -ExecutionPolicy Bypass -NoExit -File {0} status" -f (Quote-ShortcutArgument -Value $ControlPath)) `
        -Description "Show current Lighthouse Bridge status."
}

Write-Host "Lighthouse Bridge monitor shortcuts created or updated:"
foreach ($path in $created) {
    Write-Host $path
}
