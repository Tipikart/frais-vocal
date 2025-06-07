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
    const data = req.body;
    expenses = expenses.filter(e =>
        !(e.date === data.date &&
          e.montant === data.montant &&
          e.fournisseur === data.fournisseur &&
          e.type_depense === data.type_depense &&
          e.mission === data.mission &&
          e.ligne_comptable === data.ligne_comptable)
    );
    res.sendStatus(200);
});


app.post('/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
const filePath = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

  res.json({ url: filePath });
});


app.listen(port, () => {
  console.log(`Assistant de notes de frais en écoute sur http://127.0.0.1:${port}`);
});

