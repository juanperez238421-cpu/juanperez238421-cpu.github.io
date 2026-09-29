@echo off
setlocal
cd /d "%~dp0"

if not exist .venv (
  py -m venv .venv
)

call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install pyinstaller==6.16.0

pyinstaller --noconfirm --clean --onefile --name PortableVisualShow main.py

if not exist PORTABLE_BUILD mkdir PORTABLE_BUILD
copy /Y dist\PortableVisualShow.exe PORTABLE_BUILD\PortableVisualShow.exe
copy /Y config.json PORTABLE_BUILD\config.json
copy /Y launch.bat PORTABLE_BUILD\launch.bat
copy /Y README_PORTABLE.txt PORTABLE_BUILD\README_PORTABLE.txt

echo.
echo Build ready in PORTABLE_BUILD
pause
