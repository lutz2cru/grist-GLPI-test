// js/api.js

// Utilitaire robuste pour transformer les colonnes Grist en un tableau d'objets lisible
function formatGristData(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data; 
  if (data.id && Array.isArray(data.id)) {
    return data.id.map((id, index) => {
      let row = {};
      for (let key in data) {
        row[key] = data[key][index];
      }
      return row;
    });
  }
  return [];
}

// Objet global API qui contient toutes nos requêtes
const API = {
  // --- LECTURE DES DONNÉES ---
  async getAdherents() {
    const raw = await grist.docApi.fetchTable('Adherents');
    return formatGristData(raw);
  },

  async getTickets() {
    const raw = await grist.docApi.fetchTable('Tickets');
    return formatGristData(raw);
  },

  async getEchanges() {
    const raw = await grist.docApi.fetchTable('Echanges');
    return formatGristData(raw);
  },

  async getMateriels() {
    try {
      const raw = await grist.docApi.fetchTable('Materiels');
      return formatGristData(raw);
    } catch (e) {
      console.warn("Table Materiels introuvable ou vide", e);
      return [];
    }
  },

  // Remplace juste cette fonction dans js/api.js
async getCurrentUser() {
  try {
    return await grist.docApi.getUser();
  } catch (e) {
    console.warn("Impossible de récupérer l'utilisateur Grist, mode public assumé.");
    return null;
  }
},

  // --- ÉCRITURE DES DONNÉES ---
  async createTicket(ticketData) {
    return await grist.docApi.applyUserActions([
      ['AddRecord', 'Tickets', null, ticketData]
    ]);
  },

  async updateTicket(ticketId, updateData) {
    return await grist.docApi.applyUserActions([
      ['UpdateRecord', 'Tickets', ticketId, updateData]
    ]);
  },

  async addEchange(echangeData) {
    return await grist.docApi.applyUserActions([
      ['AddRecord', 'Echanges', null, echangeData]
    ]);
  }
};