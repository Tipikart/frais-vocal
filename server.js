const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;
const DATA_FILE = path.join(__dirname, 'expenses.json');
require('dotenv').config();

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use(express.json({ limit: '20mb' }));

app.use(express.static(__dirname));

function readData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return [];
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.get('/api/expenses', (req, res) => {
  res.json(readData());
});

app.get('/api/openai-key', (req, res) => {
    res.json({ key: process.env.OPENAI_API_KEY });
});


app.post('/api/expenses', (req, res) => {
  const data = readData();
  data.push(req.body);
  try {
    writeData(data);
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ error: 'save_failed' });
  }
});
app.delete('/api/expenses', (req, res) => {
    const expenseToDelete = req.body;
    const data = readData();
    
    // Filtrer les dépenses pour supprimer celle qui correspond
    const filteredData = data.filter(expense => 
        !(expense.date === expenseToDelete.date &&
          expense.montant === expenseToDelete.montant &&
          expense.fournisseur === expenseToDelete.fournisseur &&
          expense.type_depense === expenseToDelete.type_depense &&
          expense.mission === expenseToDelete.mission &&
          expense.ligne_comptable === expenseToDelete.ligne_comptable)
    );
    
    try {
        writeData(filteredData);
        res.json({ status: 'ok' });
    } catch (e) {
        res.status(500).json({ error: 'delete_failed' });
    }
});

app.put('/api/expenses', (req, res) => {
    const updatedExpense = req.body;
    const data = readData();
    
    // Trouver et mettre à jour la dépense
    const index = data.findIndex(expense => 
        expense.date === updatedExpense.date &&
        expense.montant === updatedExpense.montant &&
        expense.fournisseur === updatedExpense.fournisseur &&
        expense.type_depense === updatedExpense.type_depense &&
        expense.mission === updatedExpense.mission &&
        expense.ligne_comptable === updatedExpense.ligne_comptable
    );
    
    if (index !== -1) {
        data[index] = updatedExpense;
        try {
            writeData(data);
            res.json({ status: 'ok' });
        } catch (e) {
            res.status(500).json({ error: 'update_failed' });
        }
    } else {
        res.status(404).json({ error: 'expense_not_found' });
    }
});

app.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
const filePath = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

  res.json({ url: filePath });
});


app.listen(port, () => {
  console.log(`Assistant de notes de frais en écoute sur http://127.0.0.1:${port}`);
});

