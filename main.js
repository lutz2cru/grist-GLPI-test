// js/main.js

// État global de l'application
const AppState = {
  tickets: [],
  echanges: [],
  materiels: [],
  searchQuery: "",
  currentFilter: "Tous",
  selectedTicketId: null,
  currentSelectedRating: 0
};

// --- INITIALISATION ---
let isInitialized = false;
grist.ready({ requiredAccess: 'full' });

grist.onRecord(async () => {
  if (!isInitialized) {
    isInitialized = true;
    await initApp();
    setupEventListeners();
  }
});

async function initApp() {
  const isLoggedIn = await Auth.init();
  if (isLoggedIn) {
    await postLoginSetup();
  } else {
    UI.showLogin();
  }
}

async function postLoginSetup() {
  UI.showLoginError(false);
  UI.showApp();
  UI.renderProfile(Auth.userEmail, Auth.currentAdherent);
  await loadData();
}

// --- CHARGEMENT DES DONNÉES ---
async function loadData() {
  try {
    const [rawT, rawE, rawM] = await Promise.all([
      API.getTickets(),
      API.getEchanges(),
      API.getMateriels()
    ]);
    
    AppState.echanges = rawE;
    AppState.materiels = rawM;
    
    // On ne garde que les tickets de l'adhérent connecté
    const adherentId = Auth.currentAdherent ? Auth.currentAdherent.id : null;
    AppState.tickets = rawT.filter(t => adherentId && t.Demandeur === adherentId);
    
    // Tri du plus récent au plus ancien
    AppState.tickets.sort((a, b) => new Date(b.Date_Creation || 0) - new Date(a.Date_Creation || 0));

    UI.populateMaterielDropdown(AppState.materiels, adherentId);
    refreshTicketList();
    
    if (AppState.selectedTicketId) {
      selectTicket(AppState.selectedTicketId);
    }
  } catch (err) {
    console.error("Erreur de synchronisation :", err);
    UI.showToast("Erreur lors de la récupération des données", "error");
  }
}

// --- LOGIQUE MÉTIER ---
function refreshTicketList() {
  let filtered = AppState.tickets.filter(t => {
    const status = t.Statut || 'Nouveau';
    let matchFilter = AppState.currentFilter === 'Tous' 
      || (AppState.currentFilter === 'Actifs' && ['Nouveau', 'En cours'].includes(status)) 
      || (AppState.currentFilter === 'Clos' && ['Résolu', 'Clos'].includes(status));
    
    let matchSearch = !AppState.searchQuery || (t.Titre || '').toLowerCase().includes(AppState.searchQuery);
    
    return matchFilter && matchSearch;
  });

  UI.renderTicketsList(filtered, AppState.selectedTicketId, selectTicket);
}

function selectTicket(id) {
  AppState.selectedTicketId = id;
  refreshTicketList(); // Met à jour la surbrillance dans la liste
  
  const ticket = AppState.tickets.find(t => t.id === id);
  if (!ticket) return;

  const matName = ticket.Materiel_Concerne 
    ? (AppState.materiels.find(m => m.id === ticket.Materiel_Concerne)?.Nom || 'Lié') 
    : 'Aucun équipement';
    
  UI.renderTicketDetail(ticket, matName);
  
  const ticketEchanges = AppState.echanges.filter(e => e.Ticket_ID === id);
  ticketEchanges.sort((a, b) => new Date(a.Date || 0) - new Date(b.Date || 0));
  
  UI.renderConversation(ticketEchanges, Auth.userEmail);
}

// --- ACTIONS UTILISATEUR ---
async function handleLogin() {
  const emailInput = document.getElementById('login-email').value;
  const success = await Auth.login(emailInput);
  if (success) {
    UI.showToast("Connexion réussie", "success");
    await postLoginSetup();
  } else {
    UI.showLoginError(true);
  }
}

async function handleCreateTicket() {
  const title = document.getElementById('new-title').value.trim();
  if (!title) return UI.showToast("Veuillez saisir un titre.", "error");

  const fileInput = document.getElementById('new-file');
  let base64String = "";

  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];
    if (file.size > 2000000) return UI.showToast("L'image est trop lourde (Max 2 Mo).", "error");
    
    try {
      base64String = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
      });
    } catch (e) {
      return UI.showToast("Erreur lors de la lecture de l'image.", "error");
    }
  }

  const matVal = document.getElementById('new-materiel').value;
  await API.createTicket({
    Titre: title, 
    Description: document.getElementById('new-desc').value.trim(), 
    Statut: 'Nouveau', 
    Demandeur: Auth.currentAdherent ? Auth.currentAdherent.id : null, 
    Date_Creation: new Date().toISOString(),
    Type: document.getElementById('new-type').value, 
    Categorie: document.getElementById('new-category').value, 
    Priorite: document.getElementById('new-priority').value, 
    Materiel_Concerne: matVal ? parseInt(matVal) : null,
    Image_Base64: base64String
  });
  
  // Reset formulaire
  document.getElementById('new-title').value = ''; 
  document.getElementById('new-desc').value = '';
  document.getElementById('new-file').value = '';
  
  UI.showToast("Ticket créé avec succès", "success");
  UI.switchView('view-list'); 
  await loadData();
}

async function handleReply(overrideMsg = null) {
  const input = document.getElementById('reply-text');
  const text = overrideMsg || input.value.trim();
  if (!text || !AppState.selectedTicketId) return;
  
  await API.addEchange({ 
    Ticket_ID: AppState.selectedTicketId, 
    Auteur_Email: Auth.userEmail, 
    Message: text, 
    Date: new Date().toISOString(), 
    Est_Public: true 
  });
  
  if(!overrideMsg) {
    input.value = '';
    UI.showToast("Message envoyé", "success");
  }
  await loadData();
}

async function handleAcceptSolution() {
  await API.updateTicket(AppState.selectedTicketId, { Statut: 'Clos' });
  await handleReply("✅ L'adhérent a validé la solution proposée.");
  UI.showToast("Ticket clôturé", "success");
}

async function handleRejectSolution() {
  const reason = prompt("Veuillez expliquer pourquoi la solution ne convient pas :");
  if (!reason) return;
  await API.updateTicket(AppState.selectedTicketId, { Statut: 'En cours' });
  await handleReply(`❌ L'adhérent a refusé la solution. Motif : ${reason}`);
  UI.showToast("Ticket rouvert", "error");
}

async function handleSubmitSatisfaction() {
  if (AppState.currentSelectedRating === 0) return UI.showToast("Veuillez sélectionner une note.", "error");
  const comment = document.getElementById('satisfaction-comment').value.trim();
  
  await API.updateTicket(AppState.selectedTicketId, { 
    Note_Satisfaction: AppState.currentSelectedRating, 
    Commentaire_Satisfaction: comment 
  });
  
  UI.showToast("Merci pour votre avis !", "success");
  await loadData();
}

// --- ÉCOUTEURS D'ÉVÉNEMENTS (Event Listeners) ---
function setupEventListeners() {
  // Auth
  document.getElementById('btn-login').addEventListener('click', handleLogin);
  document.getElementById('btn-logout').addEventListener('click', () => Auth.logout() || location.reload());

  // Navigation (Onglets)
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => UI.switchView(e.target.dataset.target));
  });

  // Recherche et Filtres
  document.getElementById('search-input').addEventListener('keyup', (e) => {
    AppState.searchQuery = e.target.value.trim().toLowerCase();
    refreshTicketList();
  });
  
  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      AppState.currentFilter = e.target.dataset.filter;
      UI.updateFilters(e.target);
      refreshTicketList();
    });
  });

  // Actions Tickets
  document.getElementById('btn-create-ticket').addEventListener('click', handleCreateTicket);
  document.getElementById('btn-reply').addEventListener('click', () => handleReply());
  document.getElementById('btn-accept').addEventListener('click', handleAcceptSolution);
  document.getElementById('btn-reject').addEventListener('click', handleRejectSolution);
  
  // Satisfaction (Étoiles)
  document.querySelectorAll('#star-container .star').forEach(star => {
    star.addEventListener('click', (e) => {
      AppState.currentSelectedRating = parseInt(e.target.dataset.val);
      UI.setRatingStars(AppState.currentSelectedRating);
    });
  });
  document.getElementById('btn-submit-satisfaction').addEventListener('click', handleSubmitSatisfaction);
}