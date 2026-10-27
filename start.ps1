# AegisPharma 1-Click PowerShell Launcher
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "🛡️  AEGISPHARMA™ - 21 CFR Part 11 MES & EBR SYSTEM" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start backend in a new process
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptDir\server'; Write-Host '🛡️ AegisPharma Backend API' -ForegroundColor Green; npm start"

# Start frontend in a new process
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptDir\client'; Write-Host '💻 AegisPharma Frontend Client' -ForegroundColor Cyan; npm run dev"

Write-Host "`n🚀 Servers started successfully!" -ForegroundColor Green
Write-Host "📡 Backend:  http://localhost:5000" -ForegroundColor Gray
Write-Host "🌐 Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "`nOpening browser in 3 seconds..." -ForegroundColor Gray

Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"
