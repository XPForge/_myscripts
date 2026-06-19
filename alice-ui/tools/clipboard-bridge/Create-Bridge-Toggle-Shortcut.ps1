Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$TogglePath = Join-Path $PSScriptRoot "toggle-bridge.ps1"
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = Join-Path $DesktopPath "Lighthouse Bridge Toggle.lnk"
$PowerShellPath = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"

$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($ShortcutPath)
$shortcut.TargetPath = $PowerShellPath
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$TogglePath`""
$shortcut.WorkingDirectory = $RepoRoot
$shortcut.Description = "Toggle the Lighthouse Clipboard Bridge on or off."
$shortcut.IconLocation = "$PowerShellPath,0"
$shortcut.Save()

Write-Host "Lighthouse Bridge Toggle shortcut created or updated:"
Write-Host $ShortcutPath
Write-Host "Icon customization can be added later by editing the shortcut properties."
