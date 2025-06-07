@echo off
set /p message="Entrez le message de commit : "
git add .
git commit -m "%message%"
git push origin main
pause
