@echo off
echo === NarrativeForge Setup ===
echo.

echo [1/4] Installing backend dependencies...
cd backend
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo Failed to install backend dependencies!
    pause
    exit /b 1
)

echo.
echo [2/4] Installing frontend dependencies...
cd ..\frontend
call npm install
if %errorlevel% neq 0 (
    echo Failed to install frontend dependencies!
    pause
    exit /b 1
)

echo.
echo [3/4] Creating uploads directory...
if not exist "..\backend\uploads" mkdir "..\backend\uploads"
if not exist "..\backend\uploads\entities" mkdir "..\backend\uploads\entities"

echo.
echo === Setup Complete! ===
echo.
echo To start the application, run: start.bat
echo.
pause
