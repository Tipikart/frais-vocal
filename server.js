const express = require('express');

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;
const DATA_FILE = path.join(__dirname, 'expenses.json');
require('dotenv').config();

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });


// Stockage en mémoire des compteurs par IP
const ipCounters = new Map();
const MAX_EXPENSES_PER_IP = 5;

// Fonction pour obtenir l'IP réelle
function getRealIP(req) {
    return req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           req.ip;
}

// Middleware de limitation
function checkIPLimit(req, res, next) {
    const ip = getRealIP(req);
    const count = ipCounters.get(ip) || 0;
    
    if (count >= MAX_EXPENSES_PER_IP) {
        return res.status(429).json({ 
            error: 'limit_exceeded',
            message: `Limite de ${MAX_EXPENSES_PER_IP} dépenses atteinte pour cette adresse IP`,
            remaining: 0
        });
    }
    
    req.userIP = ip;
    next();
}

// Middleware pour nettoyer les paramètres de tracking
app.use((req, res, next) => {
    console.log('URL reçue:', req.originalUrl);
    console.log('Query params:', req.query);
    
    // Liste des paramètres de tracking à supprimer
    const trackingParams = ['fbclid', 'utm_source', 'utm_medium', 'utm_campaign', 'gclid', '_gl'];
    const hasTrackingParams = trackingParams.some(param => req.query[param]);
    
    if (hasTrackingParams) {
        // Construire l'URL propre
        const baseUrl = `${req.protocol}://${req.get('host')}${req.path}`;
        
        // Garder seulement les paramètres non-tracking
        const cleanQuery = {};
        Object.keys(req.query).forEach(key => {
            if (!trackingParams.includes(key)) {
                cleanQuery[key] = req.query[key];
            }
        });
        
        // Construire la query string propre
        const queryString = Object.keys(cleanQuery).length > 0 
            ? '?' + new URLSearchParams(cleanQuery).toString()
            : '';
        
        const cleanUrl = baseUrl + queryString;
        
        console.log('Redirection vers:', cleanUrl);
        return res.redirect(301, cleanUrl);
    }
    
    next();
});

// Route spécifique pour la page d'accueil
app.get('/', (req, res) => {
    console.log('Accès à la racine:', req.originalUrl);
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(express.static(__dirname));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json({ limit: '20mb' }));
app.use(express.static(__dirname));

function readData() {
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return data;
  } catch (e) {
    return [];
  }
}

const USERS_FILE = path.join(__dirname, 'users.json');

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function writeUsers(data) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
    console.log('Utilisateurs sauvegardés:', data.length);
  } catch (e) {
    console.error('Erreur écriture utilisateurs:', e);
  }
}



app.delete('/api/users', (req, res) => {
  const userId = req.body.id;
  const users = readUsers();
  const expenses = readData();
  
  console.log('Tentative suppression utilisateur ID:', userId);
  
  // Vérifier qu'il reste au moins un utilisateur
  if (users.length <= 1) {
    return res.status(400).json({ error: 'cannot_delete_last_user' });
  }
  
  // Vérifier si l'utilisateur a des dépenses
  const userExpenses = expenses.filter(e => e.userId === userId);
  if (userExpenses.length > 0) {
    return res.status(400).json({ 
      error: 'user_has_expenses', 
      expenseCount: userExpenses.length 
    });
  }
  
  // Supprimer l'utilisateur
  const filteredUsers = users.filter(user => user.id !== userId);
  
  try {
    writeUsers(filteredUsers);
    console.log('Utilisateur supprimé:', userId);
    res.json({ status: 'ok' });
  } catch (e) {
    console.error('Erreur suppression utilisateur:', e);
    res.status(500).json({ error: 'delete_failed' });
  }
});

app.get('/api/users', (req, res) => {
  res.json(readUsers());
});

app.post('/api/users', (req, res) => {
  const user = req.body;
  const users = readUsers();
  users.push(user);
  
  try {
    writeUsers(users);
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ error: 'save_failed' });
  }
});
function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log('Données sauvegardées:', data.length, 'dépenses');
  } catch (e) {
    console.error('Erreur écriture fichier:', e);
  }
}

app.get('/api/expenses', (req, res) => {
  const data = readData();
  console.log('Lecture des dépenses:', data.length, 'dépenses trouvées');
  res.json(data);
});

app.get('/api/openai-key', (req, res) => {
    res.json({ key: process.env.OPENAI_API_KEY });
});

app.post('/api/expenses', checkIPLimit, (req, res) => {
  const expense = req.body;
  
  // Ajouter un ID unique si pas présent
  if (!expense.id) {
    expense.id = uuidv4();
  }
  
  const data = readData();
  data.push(expense);
  
try {
    writeData(data);
    
    // Incrémenter le compteur IP
    const currentCount = ipCounters.get(req.userIP) || 0;
    ipCounters.set(req.userIP, currentCount + 1);
    
    const remaining = MAX_EXPENSES_PER_IP - (currentCount + 1);
    
    console.log('Dépense ajoutée avec ID:', expense.id);
    console.log(`IP ${req.userIP}: ${currentCount + 1}/${MAX_EXPENSES_PER_IP} dépenses`);
    
    res.json({ 
        status: 'ok', 
        id: expense.id,
        remaining: remaining
    });
} catch (e) {
    console.error('Erreur ajout dépense:', e);
    res.status(500).json({ error: 'save_failed' });
  }
});

// Route pour vérifier les limites
app.get('/api/limits', (req, res) => {
    const ip = getRealIP(req);
    const count = ipCounters.get(ip) || 0;
    const remaining = MAX_EXPENSES_PER_IP - count;
    
    res.json({
        used: count,
        remaining: Math.max(0, remaining),
        limit: MAX_EXPENSES_PER_IP
    });
});

app.delete('/api/expenses', (req, res) => {
  const expenseId = req.body.id;
  const data = readData();
  
  console.log('Tentative suppression ID:', expenseId);
  console.log('Dépenses avant suppression:', data.length);
  console.log('IDs disponibles:', data.map(e => e.id));
  
  const filteredData = data.filter(expense => String(expense.id) !== String(expenseId));
  
  console.log('Dépenses après suppression:', filteredData.length);
  
  if (filteredData.length === data.length) {
    console.log('Aucune dépense supprimée - ID non trouvé:', expenseId);
    return res.status(404).json({ error: 'expense_not_found', searchedId: expenseId });
  }
  
  try {
    writeData(filteredData);
    console.log('Suppression réussie pour ID:', expenseId);
    res.json({ status: 'ok' });
  } catch (e) {
    console.error('Erreur suppression:', e);
    res.status(500).json({ error: 'delete_failed' });
  }
});

app.put('/api/expenses', (req, res) => {
  const updatedExpense = req.body;
  const expenseId = updatedExpense.id;
  const data = readData();
  
  console.log('Tentative mise à jour ID:', expenseId);
  
  const index = data.findIndex(expense => String(expense.id) === String(expenseId));
  
  if (index === -1) {
    console.log('Dépense non trouvée pour mise à jour:', expenseId);
    return res.status(404).json({ error: 'expense_not_found' });
  }
  
  data[index] = updatedExpense;
  
  try {
    writeData(data);
    console.log('Mise à jour réussie pour ID:', expenseId);
    res.json({ status: 'ok' });
  } catch (e) {
    console.error('Erreur mise à jour:', e);
    res.status(500).json({ error: 'update_failed' });
  }
});

app.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const filePath = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url: filePath });
});

// Keep-alive pour éviter que Render endorme le service
const keepAlive = () => {
  setInterval(() => {
    const req = require('http').request({
      hostname: 'localhost',
      port: port,
      path: '/api/expenses',
      method: 'GET'
    }, (res) => {
      console.log('Keep-alive ping:', res.statusCode);
    });
    req.on('error', (err) => {
      console.log('Keep-alive error:', err.message);
    });
    req.end();
  }, 14 * 60 * 1000); // 14 minutes
};

// Démarrer le keep-alive seulement en production
if (process.env.NODE_ENV === 'production') {
  keepAlive();
}

app.listen(port, () => {
  console.log(`Assistant de notes de frais en écoute sur http://127.0.0.1:${port}`);
});