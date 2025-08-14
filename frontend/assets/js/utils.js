// frontend/assets/js/utils.js

// Configuration API
const API_BASE_URL = window.location.origin + '/api';

// Fonctions utilitaires globales
const utils = {
  // Initialiser Lucide
  initializeLucide() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    } else {
      console.warn('Lucide icons not loaded');
    }
  },

  // Système de notifications
  showNotification(message, type = 'success') {
    // Supprimer les notifications existantes
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notif => notif.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Supprimer automatiquement après 4 secondes
    setTimeout(() => {
      notification.remove();
    }, 4000);
  },

  // Sanitisation avec whitelist
  sanitizeInput(input, maxLength = 10000) {
    if (typeof input !== 'string') return input;
    return input
      .trim()
      .replace(/[^a-zA-Z0-9 _\n\r.,!?;:'"()\[\]{}-]/g, '')
      .substring(0, maxLength);
  },

  // Gestion unifiée des erreurs d'authentification
  handleAuthError(message, critical = false) {
    console.error(message);
    this.showNotification(message, 'error');

    if (critical) {
      try {
        fetch(`${API_BASE_URL}/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ level: 'error', message })
        }).catch(err => console.error('Erreur lors de l\'envoi du log serveur', err));
      } catch (err) {
        console.error('Erreur lors de la préparation du log serveur', err);
      }
    }
  }
};

// Exporter pour utilisation globale
window.utils = utils;
window.API_BASE_URL = API_BASE_URL;