// js/ui.js

export const UI = {
formatDate(val) {
    if (!val) return '';
    let d;
    if (typeof val === 'number') {
      d = new Date(val > 1e12 ? val : val * 1000);
    } else {
      let strVal = String(val);
      if (strVal.includes(' ') && !strVal.includes('T')) {
        strVal = strVal.replace(' ', 'T');
      }
      d = new Date(strVal);
    }
    
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }) + ' à ' + 
           d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
  },

  showToast(message, type = "info") {
    const container = document.getElementById('toast-container');
    if (!container) return;
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

  showLogin() {
    document.getElementById('view-login')?.classList.remove('hidden');
    document.getElementById('app-content')?.classList.add('hidden');
  },

  showApp() {
    document.getElementById('view-login')?.classList.add('hidden');
    document.getElementById('app-content')?.classList.remove('hidden');
  },

  showLoginError(show) {
    const errEl = document.getElementById('login-error-msg');
    if (errEl) errEl.style.display = show ? 'block' : 'none';
  },

  switchView(viewName) {
    document.querySelectorAll('.tab-btn').forEach(b => {
      if(b.dataset.target === viewName) b.classList.add('active');
      else b.classList.remove('active');
    });
    
    ['view-list', 'view-create', 'view-profile'].forEach(id => {
      document.getElementById(id)?.classList.add('hidden');
    });
    
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) targetView.classList.remove('hidden');
  },

renderProfile(email, adherent, isAdmin) {
    const nom = adherent ? (adherent.Nom || email) : email;
    const org = adherent ? (adherent['Organisation / Structure'] || adherent.Organisation___Structure || '') : '';
    
    const headerText = document.getElementById('user-header-text');
    const profNom = document.getElementById('profile-nom');
    const profOrg = document.getElementById('profile-org');
    const profEmail = document.getElementById('profile-email');

    if (headerText) {
      let text = org ? `${nom} (${org})` : nom;
      if (isAdmin) {
        text += ` <span class="badge" style="background:#dc2626; color:white; margin-left:8px; vertical-align:middle;">Admin</span>`;
      }
      headerText.innerHTML = text;
    }
    if (profNom) profNom.textContent = nom;
    if (profOrg) profOrg.textContent = org || 'Non renseignée';
    if (profEmail) profEmail.textContent = email;
  },

  populateMaterielDropdown(materiels, userId) {
    const select = document.getElementById('new-materiel');
    if (!select) return;
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
    if (!container) return;
    container.innerHTML = '';
    
    if (!filteredTickets.length) {
      container.innerHTML = '<p style="color:var(--text-muted); font-size:0.9rem; padding: 0.5rem;">Aucun ticket correspondant.</p>';
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
      card.onclick = () => onTicketClick(t.id);
      container.appendChild(card);
    });
  },

  renderTicketDetail(ticket, materielName) {
    document.getElementById('no-selection')?.classList.add('hidden');
    document.getElementById('selection-content')?.classList.remove('hidden');
    
    const titleEl = document.getElementById('current-title');
    const dateEl = document.getElementById('current-date');
    const descEl = document.getElementById('current-desc');
    const metaEl = document.getElementById('current-meta');

    if (titleEl) titleEl.textContent = ticket.Titre;
    if (dateEl) dateEl.textContent = this.formatDate(ticket.Date_Creation);
    
    const descText = ticket.Description ? ticket.Description.replace(/\n/g, '<br>') : 'Aucun détail renseigné.';
    const imgHtml = ticket.Image_Base64 ? `<div style="margin-top:1rem;"><a href="${ticket.Image_Base64}" target="_blank"><img src="${ticket.Image_Base64}" style="max-width:100%; max-height: 400px; border-radius:6px; border:1px solid var(--border);"></a></div>` : '';
    if (descEl) descEl.innerHTML = descText + imgHtml;
    
    if (metaEl) {
      metaEl.innerHTML = `
        <span class="badge badge-gray">${ticket.Type || 'Non défini'}</span>
        <span class="badge badge-gray">${ticket.Categorie || 'Général'}</span>
        <span class="badge badge-gray">Priorité: ${ticket.Priorite || 'Normale'}</span>
        <span class="badge badge-gray">Matériel: ${materielName}</span>
      `;
    }
    
    this.updateActionBlocks(ticket);
  },

  renderConversation(echanges, userEmail) {
    const tl = document.getElementById('timeline'); 
    if (!tl) return;
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
    tl.scrollTop = tl.scrollHeight;
  },

  updateActionBlocks(ticket) {
    const status = ticket.Statut || 'Nouveau';
    document.getElementById('action-reply')?.classList.add('hidden');
    document.getElementById('action-resolve')?.classList.add('hidden');
    document.getElementById('action-satisfaction')?.classList.add('hidden');
    document.getElementById('action-satisfaction-readonly')?.classList.add('hidden');

    if (status === 'Résolu') {
      document.getElementById('action-resolve')?.classList.remove('hidden');
    } else if (status === 'Clos') {
      if (!ticket.Note_Satisfaction) {
        document.getElementById('action-satisfaction')?.classList.remove('hidden');
        this.setRatingStars(0); 
      } else {
        document.getElementById('action-satisfaction-readonly')?.classList.remove('hidden');
        const starsEl = document.getElementById('readonly-stars');
        const commEl = document.getElementById('readonly-comment');
        if (starsEl) starsEl.textContent = '★'.repeat(ticket.Note_Satisfaction) + '☆'.repeat(5 - ticket.Note_Satisfaction);
        if (commEl) commEl.textContent = ticket.Commentaire_Satisfaction ? `"${ticket.Commentaire_Satisfaction}"` : "Aucun commentaire.";
      }
    } else {
      document.getElementById('action-reply')?.classList.remove('hidden');
    }
  },

  setRatingStars(val) {
    const stars = document.querySelectorAll('#star-container .star');
    stars.forEach((s, idx) => { 
      const starVal = parseInt(s.dataset.rating || 0);
      s.style.color = starVal <= val ? '#f59e0b' : '#cbd5e1'; 
    });
  }
};