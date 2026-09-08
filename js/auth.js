// js/auth.js
import { API } from './api.js';

export const Auth = {
  userEmail: "",
  currentAdherent: null,
  allAdherents: [],

  async init() {
    try {
      this.allAdherents = await API.getAdherents();
      const u = await API.getCurrentUser();
      let targetEmail = (u && u.email) ? u.email : localStorage.getItem('helpdesk_adherent_email');

      if (targetEmail) {
        await this.authenticate(targetEmail);
        return true;
      }
    } catch (err) {
      console.error("Erreur d'initialisation de l'authentification :", err);
    }
    return false;
  },

  async login(emailInput) {
    if (!emailInput) return false;
    emailInput = emailInput.trim().toLowerCase();
    
    try {
      this.allAdherents = await API.getAdherents();
      const found = this.allAdherents.find(a => (a.Email || '').trim().toLowerCase() === emailInput);

      if (found) {
        localStorage.setItem('helpdesk_adherent_email', emailInput);
        await this.authenticate(emailInput);
        return true;
      }
    } catch (err) {
      console.error("Erreur lors de la tentative de connexion :", err);
    }
    return false;
  },

  async authenticate(email) {
    this.userEmail = email;
    this.currentAdherent = this.allAdherents.find(a => (a.Email || '').trim().toLowerCase() === email.toLowerCase()) || null;
  },

  logout() {
    localStorage.removeItem('helpdesk_adherent_email');
    this.userEmail = "";
    this.currentAdherent = null;
  }
};