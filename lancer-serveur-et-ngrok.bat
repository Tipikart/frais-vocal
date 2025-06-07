@echo off
setlocal

REM Démarrer le serveur Express
start "" cmd /k "cd /d %~dp0 && node server.js"

REM Attendre 3 secondes pour laisser le serveur démarrer
timeout /t 3 >nul

REM Lancer ngrok depuis le dossier local (version sans admin)
start "" cmd /k "cd /d %~dp0\ngrok && ngrok.exe http 3000"

REM Message à l'utilisateur
echo.
echo Serveur en cours d'exécution sur http://localhost:3000
echo Ngrok ouvrira une URL HTTPS accessible depuis ton smartphone.
echo Copie manuelle de l'URL nécessaire (ou installe jq pour automatiser).
pause