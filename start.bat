@echo off
cd /d "%~dp0"
title Enterprise RAG App — Starting...
color 0A

echo.
echo  ============================================
echo   Enterprise RAG App — Starting All Services
echo  ============================================
echo.

:: ── Step 0: Kill any stale processes on port 8000 ─────────────────────────
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

:: ── Step 1: Build the React frontend ──────────────────────────────────────
echo  [1/3] Checking React frontend build...
if not exist "react-frontend\dist\index.html" (
  echo  Building React frontend for the first time...
  cd /d "%~dp0react-frontend"
  call npm run build
  cd /d "%~dp0"
)
echo  [1/3] React frontend ready.
echo.

:: ── Step 2: Start FastAPI backend in a new window ─────────────────────────
echo  [2/3] Starting FastAPI backend on http://localhost:8000 ...
set "PY_EXE="
if exist "C:\Users\EXNOX\Desktop\project\venv\Scripts\python.exe" set "PY_EXE=C:\Users\EXNOX\Desktop\project\venv\Scripts\python.exe"
if "%PY_EXE%"=="" if exist "%~dp0denv\Scripts\python.exe" set "PY_EXE=%~dp0denv\Scripts\python.exe"
if "%PY_EXE%"=="" if exist "%~dp0venv\Scripts\python.exe" set "PY_EXE=%~dp0venv\Scripts\python.exe"
if "%PY_EXE%"=="" set "PY_EXE=python"

start "FastAPI Backend" cmd /k ""%PY_EXE%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
timeout /t 3 /nobreak >nul

:: ── Step 3: Open browser ───────────────────────────────────────────────────
echo  [3/3] Opening app in browser...
timeout /t 2 /nobreak >nul
start http://localhost:8000

echo.
echo  ============================================
echo   App is running!
echo   Open: http://localhost:8000
echo   API Docs: http://localhost:8000/api/docs
echo  ============================================
echo.
echo  (Close the FastAPI window to stop the server)
echo.
pause
