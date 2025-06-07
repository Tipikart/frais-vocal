@echo off
<<<<<<< HEAD
echo ─── 📂 AJOUT DES MODIFICATIONS ───
git add .

echo ─── 💬 COMMIT ───
set /p message=Entrez votre message de commit :
git commit -m "%message%"

echo ─── 🔄 PULL (intégration des modifs distantes) ───
git pull --rebase

echo ─── 🚀 PUSH VERS GITHUB ───
git push origin master

echo ─── ✅ TERMINÉ ───
=======
title 🚀 Push Git Automatique
setlocal enabledelayedexpansion

echo ------------------------------------------------
echo 🧹 Vérification de rebase en cours...
if exist .git\rebase-merge (
    echo ⚠️ Rebase détecté. On l'abandonne proprement...
    git rebase --abort
)

echo ------------------------------------------------
echo 💾 Sauvegarde des changements non commités...
git add .

echo ------------------------------------------------
set /p commitMessage=Entrez votre message de commit :
git commit -m "%commitMessage%"

echo ------------------------------------------------
echo 🔄 PULL avec rebase (intégration des modifs distantes)...
git pull --rebase

echo ------------------------------------------------
echo 📤 PUSH vers GitHub...
git push

echo ------------------------------------------------
echo ✅ TERMINÉ AVEC SUCCÈS
>>>>>>> e3f3e5d (Maj)
pause
