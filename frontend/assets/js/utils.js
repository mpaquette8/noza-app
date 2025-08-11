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

  // Sanitisation simple
  sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    return input.trim().substring(0, 10000);
  },

  // Gestion des erreurs d'authentification
  handleAuthError(error) {
    if (error.message && error.message.includes('401')) {
      this.showNotification('Session expirée, veuillez vous reconnecter', 'error');
      if (window.authManager) {
        window.authManager.logout();
      }
      return true;
    }
    return false;
  }
};

// Exporter pour utilisation globale
window.utils = utils;
window.API_BASE_URL = API_BASE_URL;