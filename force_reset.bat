@echo off
echo  =============================================
echo   MedVision AI - FORCE RESET
echo  =============================================
echo.
echo   This script will aggressively KILL all Python and Node.js processes.
echo   Use this if the server is stuck or code updates aren't applying.
echo.

echo   [1/3] Killing Python processes...
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM uvicorn.exe /T 2>nul

echo   [2/3] Killing Node.js processes...
taskkill /F /IM node.exe /T 2>nul

echo   [3/3] Clearing ports 8001, 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8001 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a 2>nul

echo.
echo   [OK] All processes terminated.
echo.
echo   Now run 'run_app.bat' to start fresh.
echo.
pause
