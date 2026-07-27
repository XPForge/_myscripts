Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$AppPath = "C:\Users\paulz\_myscripts\alice-ui"
$ControlPath = Join-Path $AppPath "tools\clipboard-bridge\bridge-control.ps1"

if (-not (Test-Path -LiteralPath $ControlPath)) {
    throw "Bridge control script not found: $ControlPath"
}

try {
    $Host.UI.RawUI.WindowTitle = "Restart Lighthouse Bridge"
}
catch {
    # Some hosts do not expose RawUI window title control.
}

Set-Location -LiteralPath $AppPath
try {
    & $ControlPath restart
    & $ControlPath monitor-window
}
catch {
    Write-Host ""
    Write-Host "Restart Lighthouse Bridge failed:"
    Write-Host $_.Exception.Message
    Write-Host ""
    [void](Read-Host "Press Enter to close this window")
    exit 1
}
