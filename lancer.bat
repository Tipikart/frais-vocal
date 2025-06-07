@echo off
cd /d %~dp0

echo Installation des dépendances...
call npm install

echo.
echo Lancement du serveur Express...
start "" cmd /k "node server.js"

timeout /t 3 >nul
start http://127.0.0.1:3000

pause
