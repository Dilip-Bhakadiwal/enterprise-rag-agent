@echo off
cd /d "%~dp0"
title Enterprise RAG App — Live Development Mode
color 0B

echo.
echo  =======================================================
echo   Enterprise RAG App — Live Development Mode (HMR)
echo  =======================================================
echo.

:: ── Step 0: Free up ports 5173 and 8000 if already occupied ────
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

:: ── Step 1: Start FastAPI backend in a separate window ────
echo  [1/3] Starting FastAPI backend on http://localhost:8000 ...
start "FastAPI Backend" cmd /k "title FastAPI Backend && color 0B && %~dp0denv\Scripts\python.exe -m uvicorn app.main:app --no-reload --port 8000"
timeout /t 2 /nobreak >nul

:: ── Step 2: Start Vite Dev Server with Live Reload ─────────
echo  [2/3] Starting Vite Frontend with Instant Live Reload...
start "Vite Frontend (HMR)" cmd /k "title Vite Frontend (Live Reload) && color 0E && cd /d %~dp0react-frontend && npm run dev"
timeout /t 3 /nobreak >nul

:: ── Step 3: Open live dev frontend in browser ──────────────
echo  [3/3] Opening live frontend in browser...
start http://localhost:5173

echo.
echo  =======================================================
echo   Live Development Server is Running!
echo.
echo   Frontend (Live Reload):  http://localhost:5173
echo   FastAPI Backend:         http://localhost:8000
echo   FastAPI Docs:            http://localhost:8000/api/docs
echo.
echo   * Any edit to .tsx or .css in react-frontend/src/
echo     will update the browser INSTANTLY (<50ms).
echo  =======================================================
echo.
echo  (Close the two popup terminal windows to stop the servers)
echo.
pause
