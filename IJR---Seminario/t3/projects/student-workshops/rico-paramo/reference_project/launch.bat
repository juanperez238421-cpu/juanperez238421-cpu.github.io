@echo off
cd /d "%~dp0"

if exist PortableVisualShow.exe (
  echo Starting packaged Portable Python Visual Show...
  start "" "PortableVisualShow.exe"
  exit /b 0
)

if exist .venv\Scripts\python.exe (
  echo Starting source version...
  .venv\Scripts\python.exe main.py
  exit /b %errorlevel%
)

echo.
echo PortableVisualShow.exe was not found.
echo Create the portable build first or configure the local Python environment.
pause
