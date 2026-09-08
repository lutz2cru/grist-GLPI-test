// js/ui.js

const UI = {
  // --- UTILITAIRES ---
  formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleDateString('fr-FR') + ' à ' + d.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
  },

  showToast(message, type = "info") {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { 
      toast.classList.remove('show'); 
      setTimeout(() => toast.remove(), 300); 
    }, 4000);
  },

  // --- NAVIGATION ET CONNEXION ---
  showLogin() {
    document.getElementById('view-login').classList.remove('hidden');
    document.getElementById('app-content').classList.add('hidden');
  },

  showApp() {
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('app-content').classList.remove('hidden');
  },

  showLoginError(show) {
    document.getElementById('login-error-msg').style.display = show ? 'block' : 'none';
  },

  switchView(viewName) {
    // Gère l'apparence des boutons du menu
    document.querySelectorAll('.tab-btn').forEach(b => {
      if(b.dataset.target === viewName) b.classList.add('active');
      else b.classList.remove('active');
    });
    
    // Masque toutes les vues et affiche la bonne
    document.getElementById('view-list').classList.add('hidden'); 
    document.getElementById('view-create').classList.add('hidden'); 
    document.getElementById('view-profile').classList.add('hidden');
    
    const targetView = document.getElementById(viewName);
    if (targetView) targetView.classList.remove('hidden');
  },

  renderProfile(email, adherent) {
    const nom = adherent ? (adherent.Nom || email) : email;
    const org = adherent ? (adherent['Organisation / Structure'] || adherent.Organisation___Structure || '') : '';
    
    document.getElementById('user-header-text').textContent = org ? `${nom} (${org})` : nom;
    document.getElementById('profile-nom').textContent = nom;
    document.getElementById('profile-org').textContent = org || 'Non renseignée';
    document.getElementById('profile-email').textContent = email;
  },

  // --- TICKETS ET FORMULAIRES ---
  populateMaterielDropdown(materiels, userId) {
    const select = document.getElementById('new-materiel');
    select.innerHTML = '<option value="">-- Aucun --</option>';
    if (userId) {
      materiels.filter(m => m.Utilisateur === userId).forEach(m => {
        select.innerHTML += `<option value="${m.id}">${m.Nom} (${m.Type || 'Matériel'})</option>`;
      });
    }
  },

  updateFilters(selectedBtn) {
    document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active-filter'));
    selectedBtn.classList.add('active-filter');
  },

  renderTicketsList(filteredTickets, selectedTicketId, onTicketClick) {
    const container = document.getElementById('tickets-list'); 
    container.innerHTML = '';
    
    if (!filteredTickets.length) {
      container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem;">Aucun ticket correspondant.</p>';
      return;
    }
    
    filteredTickets.forEach(t => {
      const card = document.createElement('div');
      card.className = `ticket-card ${selectedTicketId === t.id ? 'selected' : ''}`;
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:0.35rem;">
          <strong style="font-size: 0.95rem;">${t.Titre || 'Sans titre'}</strong>
          <span class="badge badge-${(t.Statut||'Nouveau').replace(' ','-')}">${t.Statut||'Nouveau'}</span>
        </div>
        <small style="color:var(--text-muted);">${this.formatDate(t.Date_Creation)}</small>
      `;
      // On attache l'événement de clic qui sera géré par main.js
      card.onclick = () => onTicketClick(t.id);
      container.appendChild(card);
    });
  },

  renderTicketDetail(ticket, materielName) {
    document.getElementById('no-selection').classList.add('hidden');
    document.getElementById('selection-content').classList.remove('hidden');
    
    document.getElementById('current-title').textContent = ticket.Titre;
    document.getElementById('current-date').textContent = this.formatDate(ticket.Date_Creation);
    
    const descText = ticket.Description ? ticket.Description.replace(/\n/g, '<br>') : 'Aucun détail renseigné.';
    const imgHtml = ticket.Image_Base64 ? `<div style="margin-top:1rem;"><a href="${ticket.Image_Base64}" target="_blank"><img src="${ticket.Image_Base64}" style="max-width:100%; max-height: 400px; border-radius:6px; border:1px solid var(--border);"></a></div>` : '';
    document.getElementById('current-desc').innerHTML = descText + imgHtml;
    
    document.getElementById('current-meta').innerHTML = `
      <span class="badge badge-gray">${ticket.Type || 'Non défini'}</span>
      <span class="badge badge-gray">${ticket.Categorie || 'Général'}</span>
      <span class="badge badge-gray">Priorité: ${ticket.Priorite || 'Normale'}</span>
      <span class="badge badge-gray">Matériel: ${materielName}</span>
    `;
    
    this.updateActionBlocks(ticket);
  },

  renderConversation(echanges, userEmail) {
    const tl = document.getElementById('timeline'); 
    tl.innerHTML = '';
    
    echanges.forEach(e => {
      const isMine = e.Auteur_Email === userEmail;
      const msgText = e.Message ? e.Message.replace(/\n/g, '<br>') : '';
      tl.innerHTML += `
        <div class="message ${isMine ? 'mine' : 'support'}">
          <div class="meta">${isMine ? 'Moi' : 'Support'} • ${this.formatDate(e.Date)}</div>
          <div>${msgText}</div>
        </div>`;
    });
    tl.scrollTop = tl.scrollHeight; // Descend tout en bas
  },

  updateActionBlocks(ticket) {
    const status = ticket.Statut || 'Nouveau';
    document.getElementById('action-reply').classList.add('hidden');
    document.getElementById('action-resolve').classList.add('hidden');
    document.getElementById('action-satisfaction').classList.add('hidden');
    document.getElementById('action-satisfaction-readonly').classList.add('hidden');

    if (status === 'Résolu') {
      document.getElementById('action-resolve').classList.remove('hidden');
    } else if (status === 'Clos') {
      if (!ticket.Note_Satisfaction) {
        document.getElementById('action-satisfaction').classList.remove('hidden');
        this.setRatingStars(0); 
      } else {
        document.getElementById('action-satisfaction-readonly').classList.remove('hidden');
        document.getElementById('readonly-stars').textContent = '★'.repeat(ticket.Note_Satisfaction) + '☆'.repeat(5 - ticket.Note_Satisfaction);
        document.getElementById('readonly-comment').textContent = ticket.Commentaire_Satisfaction ? `"${ticket.Commentaire_Satisfaction}"` : "Aucun commentaire.";
      }
    } else {
      document.getElementById('action-reply').classList.remove('hidden');
    }
  },

  setRatingStars(val) {
    const stars = document.querySelectorAll('#star-container .star');
    stars.forEach((s, idx) => { 
      s.style.color = idx < val ? '#f59e0b' : '#cbd5e1'; 
    });
  }
};