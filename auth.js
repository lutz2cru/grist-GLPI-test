// js/auth.js

const Auth = {
  userEmail: "",
  currentAdherent: null,
  allAdherents: [],

  // Initialise l'authentification au chargement
  async init() {
    this.allAdherents = await API.getAdherents();
    
    // Tente de récupérer l'email via Grist ou le localStorage
    const u = await API.getCurrentUser();
    let targetEmail = (u && u.email) ? u.email : localStorage.getItem('helpdesk_adherent_email');

    if (targetEmail) {
      await this.authenticate(targetEmail);
      return true; // Connecté avec succès
    }
    return false; // Doit se connecter manuellement
  },

  // Tente une connexion avec un email saisi manuellement
  async login(emailInput) {
    if (!emailInput) return false;
    emailInput = emailInput.trim().toLowerCase();
    
    // Rafraîchit la liste au cas où un adhérent vient d'être ajouté dans Grist
    this.allAdherents = await API.getAdherents();
    const found = this.allAdherents.find(a => (a.Email || '').trim().toLowerCase() === emailInput);

    if (found) {
      localStorage.setItem('helpdesk_adherent_email', emailInput);
      await this.authenticate(emailInput);
      return true;
    }
    return false;
  },

  // Valide l'identité et stocke l'objet adhérent
  async authenticate(email) {
    this.userEmail = email;
    this.currentAdherent = this.allAdherents.find(a => (a.Email || '').trim().toLowerCase() === email.toLowerCase()) || null;
  },

  // Déconnecte l'utilisateur
  logout() {
    localStorage.removeItem('helpdesk_adherent_email');
    this.userEmail = "";
    this.currentAdherent = null;
  }
};