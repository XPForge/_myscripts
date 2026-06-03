$host.UI.RawUI.WindowTitle = "Lighthouse Backend :3000"
Set-Location -LiteralPath "C:\Users\paulz\_myscripts\alice-ui"
Write-Host "Starting Lighthouse backend on port 3000..."
npm run backend:start
Write-Host ""
Write-Host "Backend command ended. If you see EADDRINUSE, port 3000 is already running."
Read-Host "Press Enter to close this backend window"
