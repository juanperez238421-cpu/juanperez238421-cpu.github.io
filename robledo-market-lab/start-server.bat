@echo off
cd /d "%~dp0"
echo.
echo Robledo Market Lab se abrira en http://localhost:8000
echo Para detener el servidor presiona Ctrl+C.
echo.
start "" http://localhost:8000
python -m http.server 8000
pause
