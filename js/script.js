const expenses = [];

function loadExpenses() {
    fetch('/api/expenses')
        .then(r => r.json())
        .then(data => {
            data.forEach(e => {
                expenses.push(e);
                addRow(e);
            });
            updateSummary();
        })
        .catch(() => {});
}

document.addEventListener('DOMContentLoaded', loadExpenses);

function sendExpense(data) {
    fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).catch(() => {});
}

function startRecognition() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'fr-FR';
    recognition.start();

    recognition.onresult = async function(event) {
        const speechResult = event.results[0][0].transcript;
        document.getElementById('transcript').innerText = speechResult;

        const output = await parseSpeechWithGPT(speechResult);
        document.getElementById('output').innerText = JSON.stringify(output, null, 2);
        if (output && output.montant) {
            addExpense(output);
        }
    };

    recognition.onerror = function(event) {
        document.getElementById('transcript').innerText = 'Erreur : ' + event.error;
    };
}


async function parseSpeechWithGPT(text) {
    const res = await fetch('/api/openai-key');
    const { key } = await res.json();
    const prompt = `
Tu es un assistant qui extrait des données comptables à partir de phrases en français.

Extrait les éléments suivants depuis la phrase fournie :
- date (format ISO 8601, ou aujourd’hui si non précisé)
- montant (numérique, sans €)
- type_depense (ex: essence, repas, train…)
- fournisseur (ex: Total, SNCF…)
- mission (ex: région réunion, formation Paris…)
- ligne_comptable = DEP-TYPE-FOURNISSEUR-MISSION (chaînes en MAJUSCULES, espaces remplacés par _)

Retourne **uniquement** un objet JSON strictement valide.

Phrase : "${text}"
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + key

        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2
        })
    });

    const data = await response.json();
    const message = data.choices?.[0]?.message?.content;
    try {
        return JSON.parse(message);
    } catch (e) {
        console.error("Erreur GPT JSON :", message);
        return null;
    }
}


function wordsToNumber(str) {
    const numbers = {
        'zero':0,'zéro':0,'un':1,'une':1,'deux':2,'trois':3,'quatre':4,'cinq':5,
        'six':6,'sept':7,'huit':8,'neuf':9,'dix':10,'onze':11,'douze':12,'treize':13,
        'quatorze':14,'quinze':15,'seize':16,'dix-sept':17,'dix-huit':18,'dix-neuf':19,
        'vingt':20,'trente':30,'quarante':40,'cinquante':50,'soixante':60,
        'soixante-dix':70,'septante':70,'quatre-vingt':80,'quatre-vingt-dix':90,
        'huitante':80,'nonante':90
    };
    str = str.toLowerCase().replace(/-/g, ' ');
    if (numbers[str] !== undefined) {
        return numbers[str];
    }
    let total = 0;
    str.split(' ').forEach(word => {
        if(numbers[word] !== undefined) {
            total += numbers[word];
        }
    });
    return total || null;
}

function parseDate(text) {
    const months = {
        'janvier':1,'février':2,'fevrier':2,'mars':3,'avril':4,'mai':5,'juin':6,
        'juillet':7,'août':8,'aout':8,'septembre':9,'octobre':10,'novembre':11,
        'décembre':12,'decembre':12
    };
    text = text.toLowerCase();
    if (text.includes("aujourd'hui")) return new Date().toISOString().slice(0,10);
    if (text.includes('hier')) {
        const d = new Date();
        d.setDate(d.getDate()-1);
        return d.toISOString().slice(0,10);
    }
    const m = text.match(/(\d{1,2})\s+(janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)(?:\s+(\d{4}))?/i);
    if (m) {
        const day = parseInt(m[1],10);
        const month = months[m[2]] - 1;
        const year = m[3] ? parseInt(m[3],10) : new Date().getFullYear();
        const d = new Date(year, month, day);
        return d.toISOString().slice(0,10);
    }
    return new Date().toISOString().slice(0,10);
}

function parseSpeech(text) {
    let montantMatch = text.match(/(?:\b|\D)(\d+(?:[\.,]\d{1,2})?)\s*(?:euros?|€)/i);
    let montant = montantMatch ? montantMatch[1].replace(',', '.') : null;
    if (!montant) {
        const words = text.match(/([a-zA-Z\-\s]+)\s*(?:euros?|\u20ac)/i);
        if (words) {
            const number = wordsToNumber(words[1]);
            if (number) montant = number;
        }
    }
    const type = text.match(/\b(d'|de |du |des )?(essence|repas|logement|avion|train|restaurant|carburant|hôtel|location)/i);
    const missionMatch = text.match(/mission\s+([\w\d\s-]+)/i);
    let mission = null;
    if (missionMatch) {
        mission = missionMatch[1].split(/\s+(?:pour|chez|de|du|des)\b/i)[0].trim();
    }
    const fournisseurMatch = text.match(/(?:chez|\u00e0|au|aux)\s+(.+)/i);
    let fournisseur = null;
    if (fournisseurMatch) {
        let rest = fournisseurMatch[1];
        rest = rest.replace(/^(la|le|les|un|une|l')\s+/i, '');
        rest = rest.split(/\s+(?:pour|mission|de|du|des)\b/i)[0];
        fournisseur = rest.trim();
    }

    return {
        date: parseDate(text),
        montant: montant ? parseFloat(montant) : null,
        fournisseur: fournisseur || null,
        type_depense: type ? type[2] : null,
        mission: mission,
        ligne_comptable: montant
            ? `DEP-${(type ? type[2] : 'XXX').toUpperCase()}-${(fournisseur ? fournisseur : 'FOU').toUpperCase()}-${(mission ? mission : 'MISS').toUpperCase()}`
            : 'N/A'
    };
}

function addRow(data) {
    const table = document.getElementById('expense-table').getElementsByTagName('tbody')[0];
    const row = table.insertRow();
    const index = expenses.indexOf(data);
    row.insertCell(0).innerText = data.date;
    row.insertCell(1).innerText = data.montant;
    row.insertCell(2).innerText = data.fournisseur;
    row.insertCell(3).innerText = data.type_depense;
    row.insertCell(4).innerText = data.mission;
    row.insertCell(5).innerText = data.ligne_comptable;
    const photoCell = row.insertCell(6);
    if (data.photo) {
        const link = document.createElement('a');
        link.href = data.photo;
        link.target = '_blank';
        link.textContent = 'Voir';
        photoCell.appendChild(link);
    } else {
        const btn = document.createElement('button');
        btn.textContent = '📷';
        btn.onclick = () => addPhoto(index);
        photoCell.appendChild(btn);
    }

       const deleteCell = row.insertCell(7);
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.onclick = () => deleteExpense(index);
    deleteCell.appendChild(deleteBtn);
}

function addPhoto(index) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('photo', file);

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            if (result.url) {
                expenses[index].photo = result.url;
                
                // Mettre à jour la ligne dans le fichier JSON
                const updateResponse = await fetch('/api/expenses', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(expenses[index])
                });
                
                if (updateResponse.ok) {
                    filterTable(); // Recharger le tableau
                    updateSummary();
                }
            }
        } catch (error) {
            console.error('Erreur upload photo:', error);
            alert('Erreur lors de l\'upload de la photo');
        }
    };
    input.click();
}
function addExpense(data) {
    expenses.push(data);
    sendExpense(data);
    addRow(data);
    updateSummary();
}

function filterTable() {
    const start = document.getElementById('startDate').value;
    const end = document.getElementById('endDate').value;
    const month = document.getElementById('monthFilter').value;
    const text = document.getElementById('textFilter').value.toLowerCase();
    let mStart = start, mEnd = end;
    if (month) {
        const [y, m] = month.split('-').map(Number);
        const first = new Date(y, m - 1, 1);
        const last = new Date(y, m, 0);
        mStart = first.toISOString().slice(0,10);
        mEnd = last.toISOString().slice(0,10);
    }
    const tbody = document.getElementById('expense-table').getElementsByTagName('tbody')[0];
    tbody.innerHTML = '';
    let filtered = expenses.filter(e => (!mStart || e.date >= mStart) && (!mEnd || e.date <= mEnd));
    if (text) {
        filtered = filtered.filter(e => Object.values(e).some(v => String(v).toLowerCase().includes(text)));
    }
    filtered.forEach(addRow);
    updateSummary(filtered);
}

function resetFilters() {
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    document.getElementById('monthFilter').value = '';
    document.getElementById('textFilter').value = '';
    filterTable();
}

function updateSummary(list = expenses) {
    const total = list.reduce((sum, e) => sum + (parseFloat(e.montant) || 0), 0);
    document.getElementById('summary').innerText = 'Total: ' + total.toFixed(2) + ' \u20ac';
}

function exportCSV() {
    const rows = document.getElementById('expense-table').getElementsByTagName('tr');
    let csv = [];
    for (let row of rows) {
        let cells = Array.from(row.cells).map(cell => '"' + cell.innerText + '"');
        csv.push(cells.join(','));
    }
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notes-de-frais.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function deleteExpense(index) {
    const expense = expenses[index];
    if (!expense) return;

    if (confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) {
        fetch('/api/expenses', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(expense)
        })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'ok') {
                expenses.splice(index, 1);
                filterTable(); // recharge le tableau filtré
                updateSummary();
            }
        })
        .catch(err => console.error('Erreur suppression :', err));
    }
}