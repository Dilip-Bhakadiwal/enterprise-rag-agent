@echo off
title Enterprise RAG App — Starting...
color 0A

echo.
echo  ============================================
echo   Enterprise RAG App — Starting All Services
echo  ============================================
echo.

:: ── Step 1: Build the React frontend ──────────────────────────────────────
echo  [1/3] Building React frontend...
cd react-frontend
call npm run build >nul 2>&1
if %errorlevel% neq 0 (
  echo  [ERROR] React build failed. Run: cd react-frontend ^&^& npm install
  pause
  exit /b 1
)
cd ..
echo  [1/3] React build DONE.
echo.

:: ── Step 2: Start FastAPI backend in a new window ─────────────────────────
echo  [2/3] Starting FastAPI backend on http://localhost:8000 ...
set "PY_EXE="
if exist "C:\Users\EXNOX\Desktop\project\venv\Scripts\python.exe" set "PY_EXE=C:\Users\EXNOX\Desktop\project\venv\Scripts\python.exe"
if "%PY_EXE%"=="" if exist ".\denv\Scripts\python.exe" set "PY_EXE=.\denv\Scripts\python.exe"
if "%PY_EXE%"=="" if exist ".\venv\Scripts\python.exe" set "PY_EXE=.\venv\Scripts\python.exe"
if "%PY_EXE%"=="" set "PY_EXE=python"

start "FastAPI Backend" cmd /k "title FastAPI Backend && color 0B && "%PY_EXE%" -m uvicorn app.main:app --reload --port 8000"
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
