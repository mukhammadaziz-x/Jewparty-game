@echo off
title PDP Jewparty Game Server
echo.
echo  =========================================
echo    PDP Jewparty Game - Starting Server...
echo  =========================================
echo.
cd /d "%~dp0backend"
echo  Server running at: http://localhost:8000
echo  Press Ctrl+C to stop.
echo.
start "" "http://localhost:8000"
python main.py
pause
