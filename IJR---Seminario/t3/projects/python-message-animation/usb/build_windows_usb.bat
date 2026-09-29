@echo off
setlocal
cd /d "%~dp0.."

echo [1/4] Creating virtual environment...
py -m venv .venv
call .venv\Scripts\activate.bat

echo [2/4] Installing render and packaging tools...
python -m pip install --upgrade pip
pip install -r requirements.txt
pip install pyinstaller==6.16.0

echo [3/4] Rendering final MP4...
python run.py --title "Para ti" --subtitle "Un mensaje hecho con Python" --out output\animated_message.mp4

echo [4/4] Building standalone Windows executable...
pyinstaller --noconfirm --clean --onefile --name AnimatedMessage run.py

if not exist USB_PACKAGE mkdir USB_PACKAGE
copy /Y output\animated_message.mp4 USB_PACKAGE\animated_message.mp4
copy /Y dist\AnimatedMessage.exe USB_PACKAGE\AnimatedMessage.exe
copy /Y usb\README_USB.txt USB_PACKAGE\README_USB.txt

echo.
echo Package ready: USB_PACKAGE
echo Copy that folder to the USB drive.
pause
