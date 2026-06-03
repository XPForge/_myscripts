$host.UI.RawUI.WindowTitle = "Lighthouse Frontend"
Set-Location -LiteralPath "C:\Users\paulz\_myscripts\alice-ui"
Write-Host "Starting Lighthouse frontend..."
npm run dev
Write-Host ""
Write-Host "Frontend command ended."
Read-Host "Press Enter to close this frontend window"
