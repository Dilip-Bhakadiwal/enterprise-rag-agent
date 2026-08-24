@echo off
cd /d "%~dp0"
title Nexora AI — Setup on New Laptop
color 0A

echo.
echo  =======================================================
echo   Nexora AI — Automatic 1-Click Setup for New Laptop
echo  =======================================================
echo.

:: ── Step 1: Environment File ──────────────────────────────
if not exist ".env" (
    echo  [*] Creating .env from .env.example ...
    copy ".env.example" ".env" >nul
    echo  [!] Please add your API keys into the .env file if needed.
) else (
    echo  [v] .env file found.
)
echo.

:: ── Step 2: Python Virtual Environment ────────────────────
echo  [*] Setting up Python virtual environment...
if not exist "denv" (
    python -m venv denv
)
echo  [*] Installing Python dependencies...
denv\Scripts\pip.exe install --upgrade pip >nul 2>&1
denv\Scripts\pip.exe install -r requirements.txt

if %ERRORLEVEL% NEQ 0 (
    echo  [!] Warning: Some Python packages failed to install. Please check python version (3.11+ recommended).
) else (
    echo  [v] Python dependencies installed successfully!
)
echo.

:: ── Step 3: React Frontend Dependencies ───────────────────
echo  [*] Installing Frontend Node.js dependencies...
cd /d "%~dp0react-frontend"
call npm install
echo  [*] Building React Frontend production bundle...
call npm run build
cd /d "%~dp0"
echo  [v] Frontend built successfully!
echo.

echo  =======================================================
echo   Setup Complete! Launching Nexora AI...
echo  =======================================================
echo.
pause

call "%~dp0dev.bat"
