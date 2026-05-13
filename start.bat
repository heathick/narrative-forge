@echo off
echo === Starting NarrativeForge ===
echo.

echo [1/2] Starting backend (FastAPI on port 8000)...
start "NarrativeForge API" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001"

timeout /t 3 /nobreak > nul

echo [2/2] Starting frontend (Next.js on port 3000)...
start "NarrativeForge Web" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo === NarrativeForge is running! ===
echo.
echo Backend:  http://localhost:8001
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8001/docs
echo.
echo Close the terminal windows to stop the servers.
echo.
pause
