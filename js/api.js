// js/api.js

function formatGristData(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data; 
  if (data.id && Array.isArray(data.id)) {
    return data.id.map((id, idx) => {
      let row = {};
      for (let key in data) {
        row[key] = data[key][idx];
      }
      return row;
    });
  }
  return [];
}

export const API = {
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
      console.warn("Table Materiels introuvable", e);
      return [];
    }
  },

  async getCurrentUser() {
    try {
      return await grist.docApi.getUser();
    } catch (e) {
      return null;
    }
  },

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