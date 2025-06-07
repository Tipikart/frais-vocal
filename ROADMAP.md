# 🧠 Feuille de route — Frais Vocal

Projet : Gestion simplifiée de notes de frais par la voix, avec pièces jointes, export PDF/CSV et génération de notes de frais complètes pour petites structures.

Dépôt : https://github.com/Tipikart/frais-vocal  
Date : 2025-06-06

---

## ✅ Étape 1 : Saisie vocale et analyse automatique

- [x] Web Speech API pour reconnaissance vocale
- [x] Transfert de la phrase vers le backend
- [x] Analyse de la phrase avec OpenAI GPT
- [x] Affichage des données dans un tableau

---

## 🖼️ Étape 2 : Pièce jointe (photo de ticket)

- [ ] Upload de l’image avec Multer
- [ ] Lien d’accès à l’image dans la ligne de frais
- [ ] Affichage de l’image via un bouton "voir"

---

## 👥 Étape 3 : Gestion utilisateur

- [ ] Menu déroulant pour choisir un utilisateur
- [ ] Stockage de l’utilisateur dans la ligne
- [ ] Filtres par utilisateur (optionnel)

---

## 📄 Étape 4 : Export CSV & PDF

- [ ] Bouton "Exporter CSV" → Télécharger toutes les lignes
- [ ] Bouton "Exporter PDF" → Table formatée
- [ ] Image incluse si possible

---

## ✍️ Étape 5 : Note de frais à signer

- [ ] Générer un PDF individuel par utilisateur
- [ ] Afficher une case de signature (canvas ou champ vide)
- [ ] Totaux, tableau récapitulatif, date, identité

---

## 📊 Étape 6 : Statistiques graphiques

- [ ] Chart.js pour :
    - Dépenses par type
    - Dépenses par utilisateur
    - Dépenses par mission

---

## 🔐 Étape 7 : Gestion API + sécurité

- [x] Intégration de dotenv
- [x] Masquage de la clé OpenAI
- [ ] Détection de spam vocal ou entrées invalides

---

## 🌍 Étape 8 : Déploiement simplifié

- [ ] Script `.bat` avec `ngrok` intégré
- [ ] Affichage automatique de l’URL publique
- [ ] Tutoriel pour test mobile / en ligne

---

## ⚙️ Étape 9 : Automatisation Codex (optionnel)

- [ ] Prompts prêts à l’usage pour GPT-4/Codex
- [ ] Génération automatique de modules frontend / backend

---

## 📁 À venir

- Gestion des remboursements
- Historique des validations
- Ajout d’un rôle "trésorier" pour valider ou rejeter
