const expenses = [];


let users = [];
let currentUser = null;

// Charger les utilisateurs
function loadUsers() {
    fetch('/api/users')
        .then(r => r.json())
        .then(data => {
            users = data;
            updateUserSelect();
            if (users.length === 0) {
                // Créer un utilisateur par défaut
                addUser('Utilisateur principal');
            }
        })
        .catch(() => {
            // Créer un utilisateur par défaut si erreur
            addUser('Utilisateur principal');
        });
}

function fixDatesInExpenses() {
    const currentYear = new Date().getFullYear();
    let corrected = 0;
    
    expenses.forEach(expense => {
        if (expense.date) {
            const date = new Date(expense.date);
            if (date.getFullYear() < 2024) {
                date.setFullYear(currentYear);
                expense.date = date.toISOString().slice(0, 10);
                corrected++;
                
                // Mettre à jour sur le serveur
                if (expense.id) {
                    fetch('/api/expenses', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(expense)
                    });
                }
            }
        }
        
        // Corriger aussi les dates "aujourd'hui" qui ne sont pas converties
        if (expense.date === "aujourd'hui") {
            expense.date = new Date().toISOString().slice(0, 10);
            corrected++;
            
            // Mettre à jour sur le serveur
            if (expense.id) {
                fetch('/api/expenses', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(expense)
                });
            }
        }
    });
    
    if (corrected > 0) {
        console.log(`${corrected} dates corrigées automatiquement`);
        filterTable(); // Recharger l'affichage
    }
}

function deleteUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    // Vérifier s'il reste au moins un utilisateur
    if (users.length <= 1) {
        alert('Impossible de supprimer le dernier utilisateur.');
        return;
    }
    
    // Vérifier si l'utilisateur a des dépenses
    const userExpenses = expenses.filter(e => e.userId === userId);
    if (userExpenses.length > 0) {
        alert(`Impossible de supprimer ${user.name}. Cet utilisateur a ${userExpenses.length} dépense(s). Supprimez d'abord ses dépenses.`);
        return;
    }
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${user.name}" ?`)) {
        fetch('/api/users', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: userId })
        })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'ok') {
                // Supprimer du tableau local
                const index = users.findIndex(u => u.id === userId);
                if (index !== -1) {
                    users.splice(index, 1);
                }
                updateUserSelect();
                
                // Réinitialiser le filtre si l'utilisateur supprimé était sélectionné
                const userFilter = document.getElementById('userFilter');
                if (userFilter.value === userId) {
                    userFilter.value = '';
                    filterTable();
                }
                
                console.log('Utilisateur supprimé avec succès');
            } else {
                alert('Erreur lors de la suppression: ' + (result.error || 'Erreur inconnue'));
            }
        })
        .catch(err => {
            console.error('Erreur suppression utilisateur:', err);
            alert('Erreur lors de la suppression');
        });
    }
}

function showUserManagement() {
    let html = `
        <div style="max-width: 500px; margin: 20px auto; padding: 20px; background: white; border-radius: 12px; box-shadow: 0 2px 15px rgba(0,0,0,0.1);">
            <h3 style="margin-bottom: 20px; color: #1a1a1a;">Gestion des utilisateurs</h3>
            <div style="margin-bottom: 20px;">
                <button class="btn primary" onclick="addUser(); closeUserManagement();">➕ Nouvel utilisateur</button>
            </div>
            <div style="border-top: 1px solid #e9ecef; padding-top: 20px;">
    `;
    
    users.forEach(user => {
        const userExpenseCount = expenses.filter(e => e.userId === user.id).length;
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f1f3f4;">
                <div>
                    <strong>${user.name}</strong>
                    <br><small style="color: #666;">${userExpenseCount} dépense(s)</small>
                </div>
                <button class="action-btn delete" onclick="deleteUser('${user.id}'); closeUserManagement();" 
                        ${users.length <= 1 ? 'disabled title="Impossible de supprimer le dernier utilisateur"' : ''}>
                    🗑️
                </button>
            </div>
        `;
    });
    
    html += `
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <button class="btn secondary" onclick="closeUserManagement()">Fermer</button>
            </div>
        </div>
    `;
    
    // Créer la modal
    const modal = document.createElement('div');
    modal.id = 'userManagementModal';
    modal.className = 'modal';
    modal.innerHTML = html;
    
    // Fermer en cliquant à côté
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeUserManagement();
        }
    };
    
    document.body.appendChild(modal);
}

function closeUserManagement() {
    const modal = document.getElementById('userManagementModal');
    if (modal) {
        document.body.removeChild(modal);
    }
    // Recharger la liste pour mettre à jour les compteurs
    updateUserSelect();
    filterTable();
}

function updateUserSelect() {
    const select = document.getElementById('userFilter');
    select.innerHTML = '<option value="">Tous les utilisateurs</option>';
    
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        select.appendChild(option);
    });
}

function addUser(userName = null) {
    const name = userName || prompt('Nom du nouvel utilisateur :');
    if (!name || name.trim() === '') return;
    
    const user = {
        id: Date.now().toString(),
        name: name.trim(),
        createdAt: new Date().toISOString()
    };
    
    fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user)
    })
    .then(r => r.json())
    .then(result => {
        if (result.status === 'ok') {
            users.push(user);
            updateUserSelect();
            // Sélectionner automatiquement le nouvel utilisateur
            document.getElementById('userFilter').value = user.id;
            currentUser = user.id;
        }
    })
    .catch(err => console.error('Erreur création utilisateur:', err));
}

function getCurrentUser() {
    const select = document.getElementById('userFilter');
    return select.value || (users[0] ? users[0].id : null);
}

function loadExpenses() {
    expenses.length = 0; // Vider le tableau
    
    // Vider le tableau HTML
    const tbody = document.getElementById('expense-table').getElementsByTagName('tbody')[0];
    tbody.innerHTML = '';
    
    fetch('/api/expenses')
        .then(r => r.json())
        .then(data => {
            console.log('Chargement des dépenses:', data.length, 'trouvées');
            data.forEach(e => {
                // Ajouter un userId si pas présent
                if (!e.userId && users.length > 0) {
                    e.userId = users[0].id;
                    e.userName = users[0].name;
                }
                // Récupérer le nom d'utilisateur
                if (e.userId && !e.userName) {
                    const user = users.find(u => u.id === e.userId);
                    e.userName = user ? user.name : 'Utilisateur supprimé';
                }
                expenses.push(e);
            });
            filterTable(); // Utiliser filterTable au lieu d'addRow
            updateSummary();
        })
        .catch(err => {
            console.error('Erreur chargement:', err);
        });
}

async function startRecognition() {
    // Vérifier le support
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        showManualInput();
        return;
    }
    
    startRecognitionGoogle();
}

function startRecognitionGoogle() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'fr-FR';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    
    // Ajouter ces nouvelles options
    try {
        recognition.serviceURI = 'wss://www.google.com/speech-api/v2/recognize';
    } catch (e) {
        console.log('ServiceURI non supporté');
    }
    
    document.getElementById('transcript').innerText = '🎤 Parlez maintenant...';
    document.getElementById('transcript').className = 'transcript active';
    
    const btn = document.querySelector('button[onclick="startRecognition()"]');
    btn.textContent = '🎤 En cours...';
    btn.disabled = true;
    
    recognition.start();

    recognition.onresult = async function(event) {
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;
        
        if (result.isFinal) {
            document.getElementById('transcript').innerText = transcript;
            document.getElementById('transcript').className = 'transcript';
            
            btn.textContent = '🎤 Nouvelle dépense';
            btn.disabled = false;
            
           const output = await parseSpeechWithGPT(transcript);
document.getElementById('output').style.display = 'block';
document.getElementById('output').innerText = JSON.stringify(output, null, 2);

if (validateExpenseData(output)) {
    addExpense(output);
} else {
    document.getElementById('transcript').innerText = 'Données incomplètes extraites. Réessayez ou utilisez la saisie manuelle.';
    setTimeout(showManualInput, 2000);
}
        } else {
            document.getElementById('transcript').innerText = transcript + '...';
        }
    };

   recognition.onerror = function(event) {
    console.error('Erreur reconnaissance:', event.error);
    
    let errorMessage = 'Erreur de reconnaissance.';
    let shouldShowManualInput = false;
    
    switch(event.error) {
        case 'network':
            errorMessage = 'Problème de connexion internet.';
            shouldShowManualInput = true;
            break;
        case 'no-speech':
            errorMessage = 'Aucune parole détectée. Réessayez.';
            break;
        case 'audio-capture':
            errorMessage = 'Problème microphone. Vérifiez les permissions.';
            shouldShowManualInput = true;
            break;
        case 'not-allowed':
            errorMessage = 'Permissions microphone refusées.';
            shouldShowManualInput = true;
            break;
        case 'service-not-allowed':
            errorMessage = 'Service de reconnaissance non autorisé.';
            shouldShowManualInput = true;
            break;
        default:
            errorMessage = `Erreur: ${event.error}`;
            shouldShowManualInput = true;
    }
    
    document.getElementById('transcript').innerText = errorMessage;
    if (shouldShowManualInput) {
        document.getElementById('transcript').innerText += ' → Saisie manuelle activée.';
        setTimeout(showManualInput, 2000);
    }
    document.getElementById('transcript').className = 'transcript';
    
    btn.textContent = '🎤 Nouvelle dépense';
    btn.disabled = false;
};

    recognition.onend = function() {
        document.getElementById('transcript').className = 'transcript';
        btn.textContent = '🎤 Nouvelle dépense';
        btn.disabled = false;
    };
}


function showManualInput() {
    const text = prompt('Dictez votre dépense (ex: "50 euros essence Total mission Paris")');
    if (text && text.trim()) {
        document.getElementById('transcript').innerText = text;
        parseSpeechWithGPT(text).then(output => {
            document.getElementById('output').style.display = 'block';
            document.getElementById('output').innerText = JSON.stringify(output, null, 2);
            
            if (validateExpenseData(output)) {
                addExpense(output);
            } else {
                document.getElementById('transcript').innerText = 'Données incomplètes extraites. Vérifiez votre saisie.';
                alert('Impossible d\'extraire les données. Vérifiez le format de votre saisie.\nExemple : "50 euros essence Total mission Paris"');
            }
        }).catch(error => {
            console.error('Erreur OpenAI:', error);
            document.getElementById('transcript').innerText = 'Erreur lors du traitement. Réessayez.';
        });
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    console.log('Initialisation de l\'application...');
    
    // Charger les utilisateurs en premier
    await new Promise(resolve => {
        loadUsers();
        // Attendre que les utilisateurs soient chargés
        const checkUsers = () => {
            if (users.length > 0) {
                resolve();
            } else {
                setTimeout(checkUsers, 100);
            }
        };
        checkUsers();
    });
    
    // Ensuite charger les dépenses
    loadExpenses();
    
    // Corriger les dates après un délai
    setTimeout(fixDatesInExpenses, 1000);
    
    // Initialiser l'interface
    const btn = document.querySelector('button[onclick="startRecognition()"]');
    const statusElement = document.getElementById('transcript');
    
    // Vérifier les limites au chargement
    try {
        const response = await fetch('/api/limits');
        const limits = await response.json();
        
        if (limits.remaining <= 0) {
            statusElement.innerText = '⚠️ Limite de 5 dépenses atteinte pour votre adresse IP. Cette limitation protège le service durant la phase de test.';
            if (btn) {
                btn.disabled = true;
                btn.textContent = '❌ Limite atteinte';
            }
        } else {
            // Configuration normale
            if (btn) {
                btn.disabled = false;
                btn.textContent = '🎤 Nouvelle dépense';
            }
            
            if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
                let message = 'Cliquez sur "Nouvelle dépense" pour commencer, puis dictez votre dépense en langage naturel : (Jai dépensé X euros, à la station/au snack/a la librairie etc... pour un repas/de l essence/des fournitures etc... pour la mission atelier/réunion/vernissage etc...)';
                
                // Ajouter l'info sur les dépenses restantes si proche de la limite
                if (limits.remaining <= 2) {
                    message = `⚠️ ${limits.remaining} dépense(s) restante(s) pour votre IP. ` + message;
                } else if (limits.remaining < 5) {
                    message = `${limits.remaining} dépenses restantes. ` + message;
                }
                
                statusElement.innerText = message;
            } else {
                statusElement.innerText = 'Reconnaissance vocale non supportée. Saisie manuelle disponible.';
            }
        }
    } catch (err) {
        console.log('Pas de vérification de limite possible');
        
        // Configuration par défaut en cas d'erreur
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🎤 Nouvelle dépense';
        }
        
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            statusElement.innerText = 'Cliquez sur "Nouvelle dépense" pour commencer, puis dictez votre dépense en langage naturel : (Jai dépensé X euros, à la station/au snack/a la librairie etc... pour un repas/de l essence/des fournitures etc... pour la mission atelier/réunion/vernissage etc...)';
        } else {
            statusElement.innerText = 'Reconnaissance vocale non supportée. Saisie manuelle disponible.';
        }
    }
    
    statusElement.className = 'transcript';
    console.log('Application initialisée avec succès');
});

async function parseSpeechWithGPT(text) {
    const res = await fetch('/api/openai-key');
    const { key } = await res.json();
    
    // Obtenir la date actuelle
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentDate = today.toISOString().slice(0, 10);
    
    const prompt = `
Tu es un assistant qui extrait des données comptables à partir de phrases en français.

INFORMATION IMPORTANTE : Nous sommes actuellement en ${currentYear}. La date d'aujourd'hui est ${currentDate}.

Extrait les éléments suivants depuis la phrase fournie :
- date (format ISO 8601 YYYY-MM-DD, utilise ${currentDate} si "aujourd'hui" ou aucune date précisée, assure-toi d'utiliser l'année ${currentYear} pour toute date sans année spécifiée)
- montant (numérique, sans €)
- type_depense (ex: essence, repas, train…)
- fournisseur (ex: Total, SNCF…)
- mission (ex: région réunion, formation Paris…)
- ligne_comptable = DEP-TYPE-FOURNISSEUR-MISSION (chaînes en MAJUSCULES, espaces remplacés par _)

IMPORTANT : Si aucune année n'est mentionnée dans la phrase, utilise TOUJOURS ${currentYear}. Ne jamais utiliser 2022 ou 2023.

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
        const result = JSON.parse(message);
        
        // Double vérification de la date côté client
        if (result.date) {
            const date = new Date(result.date);
            const year = date.getFullYear();
            
            // Si l'année est antérieure à 2024, la corriger
            if (year < 2024) {
                date.setFullYear(currentYear);
                result.date = date.toISOString().slice(0, 10);
                console.log('Date corrigée automatiquement:', result.date);
            }
        }
        
        return result;
    } catch (e) {
        console.error("Erreur GPT JSON :", message);
        return null;
    }
}

// Fonction de validation des données extraites
function validateExpenseData(data) {
    if (!data) {
        console.log('Validation échouée : pas de données');
        return false;
    }
    if (!data.montant || isNaN(parseFloat(data.montant))) {
        console.log('Validation échouée : montant invalide', data.montant);
        return false;
    }
    if (!data.date) {
        console.log('Validation échouée : pas de date');
        return false;
    }
    console.log('Validation réussie :', data);
    return true;
}


function addRow(data) {
    const table = document.getElementById('expense-table').getElementsByTagName('tbody')[0];
    const row = table.insertRow();
    
    // Utiliser l'ID au lieu de l'index
    row.dataset.expenseId = data.id;
    
    row.insertCell(0).innerText = data.userName || 'Inconnu';
    row.insertCell(1).innerText = data.date;
    row.insertCell(2).innerText = data.montant + ' €';
    row.insertCell(3).innerText = data.fournisseur || '-';
    row.insertCell(4).innerText = data.type_depense || '-';
    row.insertCell(5).innerText = data.mission || '-';
    row.insertCell(6).innerText = data.ligne_comptable || '-';
    
    const photoCell = row.insertCell(7);
    if (data.photo) {
        const btn = document.createElement('button');
        btn.textContent = 'Voir';
        btn.className = 'action-btn photo';
        btn.onclick = () => showPhoto(data.photo);
        photoCell.appendChild(btn);
    } else {
        const btn = document.createElement('button');
        btn.textContent = '📷';
        btn.className = 'action-btn';
        btn.onclick = () => addPhoto(data.id);
        photoCell.appendChild(btn);
    }

    const actionCell = row.insertCell(8);
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '🗑️';
    deleteBtn.className = 'action-btn delete';
    deleteBtn.onclick = () => deleteExpense(data.id);
    actionCell.appendChild(deleteBtn);
}

function addPhoto(expenseId) {
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
                // Trouver la dépense par ID
                const expense = expenses.find(e => String(e.id) === String(expenseId));
                if (expense) {
                    expense.photo = result.url;
                    
                    // Mettre à jour sur le serveur
                    const updateResponse = await fetch('/api/expenses', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(expense)
                    });
                    
                    if (updateResponse.ok) {
                        filterTable(); // Recharger le tableau
                        updateSummary();
                    }
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
    // Ajouter l'utilisateur actuel
    data.userId = getCurrentUser();
    data.userName = users.find(u => u.id === data.userId)?.name || 'Inconnu';
    
    // Envoyer au serveur AVANT d'ajouter localement
    fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(result => {
    if (result.status === 'ok' && result.id) {
        // Utiliser l'ID du serveur
        data.id = result.id;
        expenses.push(data);
        addRow(data);
        updateSummary();
        
        // Afficher le nombre de dépenses restantes
        if (result.remaining !== undefined) {
            if (result.remaining <= 1) {
                document.getElementById('transcript').innerText = 
                    `Dépense ajoutée ! ⚠️ ${result.remaining} dépense(s) restante(s)`;
            } else {
                document.getElementById('transcript').innerText = 
                    `Dépense ajoutée ! ${result.remaining} dépenses restantes`;
            }
        }
        
        console.log('Dépense ajoutée avec ID serveur:', result.id);
    } else {
        alert('Erreur lors de l\'ajout de la dépense');
    }
})
    .catch(err => {
    console.error('Erreur sauvegarde:', err);
    
    // Vérifier si c'est une erreur de limite
    if (err.response && err.response.status === 429) {
        alert('⚠️ LIMITE ATTEINTE\n\nVous avez atteint la limite de 5 dépenses par adresse IP.\nCette limitation est en place pour protéger le service durant la phase de test.');
        document.getElementById('transcript').innerText = 'Limite de 5 dépenses atteinte pour votre adresse IP';
    } else {
        alert('Erreur lors de l\'ajout de la dépense');
    }
});
}

function filterTable() {
    const userFilter = document.getElementById('userFilter').value;
    const month = document.getElementById('monthFilter').value;
    const text = document.getElementById('textFilter').value.toLowerCase();
    
    let mStart = null, mEnd = null;
    if (month) {
        const [y, m] = month.split('-').map(Number);
        const first = new Date(y, m - 1, 1);
        const last = new Date(y, m, 0);
        mStart = first.toISOString().slice(0,10);
        mEnd = last.toISOString().slice(0,10);
    }
    
    const tbody = document.getElementById('expense-table').getElementsByTagName('tbody')[0];
    tbody.innerHTML = '';
    
    let filtered = expenses.filter(e => {
        // Filtre par utilisateur
        if (userFilter && e.userId !== userFilter) return false;
        
        // Filtre par mois
        if (mStart && mEnd && (e.date < mStart || e.date > mEnd)) return false;
        
        // Filtre par texte
        if (text && !Object.values(e).some(v => String(v).toLowerCase().includes(text))) return false;
        
        return true;
    });
    
    filtered.forEach(addRow);
    updateSummary(filtered);
}

function resetFilters() {
    document.getElementById('userFilter').value = '';
    document.getElementById('monthFilter').value = '';
    document.getElementById('textFilter').value = '';
    filterTable();
}

function updateSummary(list = expenses) {
    const total = list.reduce((sum, e) => sum + (parseFloat(e.montant) || 0), 0);
    document.getElementById('summary').innerText = `Total: ${total.toFixed(2)} € (${list.length} dépense${list.length > 1 ? 's' : ''})`;
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

function deleteExpense(expenseId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette dépense ?')) {
        console.log('Suppression de la dépense ID:', expenseId);
        
        fetch('/api/expenses', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: expenseId })
        })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'ok') {
                // Supprimer du tableau local
                const index = expenses.findIndex(e => String(e.id) === String(expenseId));
                if (index !== -1) {
                    expenses.splice(index, 1);
                }
                filterTable(); // recharge le tableau filtré
                updateSummary();
                console.log('Suppression réussie');
            } else {
                console.error('Erreur suppression:', result);
                alert('Erreur lors de la suppression: ' + (result.error || 'Erreur inconnue'));
            }
        })
        .catch(err => {
            console.error('Erreur suppression :', err);
            alert('Erreur lors de la suppression');
        });
    }
}
function showPhoto(photoUrl) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    const content = document.createElement('div');
    content.className = 'modal-content';
    
    const img = document.createElement('img');
    img.src = photoUrl;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.textContent = '✕';
    closeBtn.onclick = () => document.body.removeChild(modal);
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
        }
    };
    
    content.appendChild(img);
    content.appendChild(closeBtn);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    img.onerror = () => {
        img.style.display = 'none';
        const errorMsg = document.createElement('div');
        errorMsg.textContent = 'Impossible de charger l\'image';
        errorMsg.style.cssText = 'padding: 40px; text-align: center; color: #666;';
        content.appendChild(errorMsg);
    };
}

async function exportPDF() {
    // Charger jsPDF dynamiquement si pas encore chargé
    if (typeof window.jspdf === 'undefined') {
        try {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/jspdf@2.5.1/dist/jspdf.umd.min.js';
            document.head.appendChild(script);
            
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
            });
            
            console.log('jsPDF chargé dynamiquement');
        } catch (error) {
            alert('Impossible de charger jsPDF. Vérifiez votre connexion internet.');
            return;
        }
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Récupérer les données filtrées
    const month = document.getElementById('monthFilter').value;
const text = document.getElementById('textFilter').value.toLowerCase();
const userFilter = document.getElementById('userFilter').value;
    
   let mStart = null, mEnd = null;
if (month) {
    const [y, m] = month.split('-').map(Number);
    const first = new Date(y, m - 1, 1);
    const last = new Date(y, m, 0);
    mStart = first.toISOString().slice(0,10);
    mEnd = last.toISOString().slice(0,10);
}
    
    let filtered = expenses.filter(e => (!mStart || e.date >= mStart) && (!mEnd || e.date <= mEnd));
    if (text) {
        filtered = filtered.filter(e => Object.values(e).some(v => String(v).toLowerCase().includes(text)));
    }
    
    // Titre
    doc.setFontSize(16);
    doc.text('Notes de Frais', 20, 20);
    
    // Période
    let periode = 'Toutes les dépenses';
    if (mStart && mEnd) {
        periode = `Période: ${mStart} au ${mEnd}`;
    } else if (month) {
        const [y, m] = month.split('-');
        const monthNames = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                           'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        periode = `Période: ${monthNames[parseInt(m)]} ${y}`;
    }
    
    doc.setFontSize(10);
    doc.text(periode, 20, 30);
    
    // Total
    const total = filtered.reduce((sum, e) => sum + (parseFloat(e.montant) || 0), 0);
    doc.text(`Total: ${total.toFixed(2)} €`, 20, 40);
    
    let yPosition = 55;
    
    // En-têtes
    doc.setFontSize(8);
    doc.text('Date', 20, yPosition);
    doc.text('Montant', 50, yPosition);
    doc.text('Fournisseur', 80, yPosition);
    doc.text('Type', 120, yPosition);
    doc.text('Mission', 150, yPosition);
    doc.text('Photo', 180, yPosition);
    
    yPosition += 10;
    
    // Données avec gestion des photos
    for (let i = 0; i < filtered.length; i++) {
        const expense = filtered[i];
        
        // Vérifier si on dépasse la page
        if (yPosition > 270) {
            doc.addPage();
            yPosition = 20;
            // Répéter les en-têtes
            doc.text('Date', 20, yPosition);
            doc.text('Montant', 50, yPosition);
            doc.text('Fournisseur', 80, yPosition);
            doc.text('Type', 120, yPosition);
            doc.text('Mission', 150, yPosition);
            doc.text('Photo', 180, yPosition);
            yPosition += 10;
        }
        
        doc.text(expense.date || '', 20, yPosition);
        doc.text(String(expense.montant || '') + ' €', 50, yPosition);
        doc.text(truncateText(expense.fournisseur || '', 15), 80, yPosition);
        doc.text(truncateText(expense.type_depense || '', 15), 120, yPosition);
        doc.text(truncateText(expense.mission || '', 15), 150, yPosition);
        
        // Gestion des photos
        if (expense.photo) {
            try {
                const imgData = await getImageAsBase64(expense.photo);
                if (imgData) {
                    // Ajouter une petite image
                    doc.addImage(imgData, 'JPEG', 180, yPosition - 5, 15, 10);
                } else {
                    doc.text('Photo disponible', 180, yPosition);
                }
            } catch (error) {
                doc.text('Photo disponible', 180, yPosition);
            }
        } else {
            doc.text('-', 180, yPosition);
        }
        
        yPosition += 15;
    }
    
    // Générer le nom du fichier
    const now = new Date();
    const dateStr = now.toISOString().slice(0,10);
    let filename = `notes-de-frais-${dateStr}`;
    if (month) {
        const [y, m] = month.split('-');
        filename = `notes-de-frais-${y}-${m.padStart(2, '0')}`;
    }
    
    // Télécharger le PDF
    doc.save(`${filename}.pdf`);
}

function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

async function getImageAsBase64(url) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
                // Redimensionner l'image si nécessaire
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Calculer les dimensions pour garder les proportions
                    const maxWidth = 200;
                    const maxHeight = 150;
                    let { width, height } = img;
                    
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error('Erreur lors du chargement de l\'image:', error);
        return null;
    }
}