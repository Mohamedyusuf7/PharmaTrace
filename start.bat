@echo off
title AegisPharma EBR System Launcher
echo ================================================================
echo 🛡️  AEGISPHARMA™ - 21 CFR Part 11 MES & EBR SYSTEM
echo ================================================================
echo Starting Backend (Port 5000) and Frontend (Port 5173)...
echo.

start "AegisPharma Backend API (Port 5000)" cmd /k "cd /d %~dp0server && npm start"
start "AegisPharma Frontend Client (Port 5173)" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo ================================================================
echo 🚀 Both servers have been launched!
echo 🌐 Open your browser at: http://localhost:5173
echo ================================================================
timeout /t 5 >nul
start http://localhost:5173
