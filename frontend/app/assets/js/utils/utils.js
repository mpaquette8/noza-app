// frontend/app/assets/js/utils/utils.js

import { sanitizeInput, sanitizeHTML } from '../shared/sanitize.js'; // Shared sanitization logic

// Configuration API
const API_BASE_URL = window.ENV?.API_URL || '/api';

// Libellés conviviaux pour les codes d'erreur
const ERROR_LABELS = {
  IA_TIMEOUT: 'Service IA indisponible, réessayez plus tard',
  QUOTA_EXCEEDED: 'Quota IA dépassé, réessayez plus tard',
  IA_ERROR: 'Erreur du service IA, réessayez plus tard'
};

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
  sanitizeInput,
  sanitizeHTML,

  // Gestion du chargement global et des boutons
  showLoading(buttonIds = []) {
    const loader = document.getElementById('loadingOverlay');
    if (loader) loader.style.display = 'flex';

    buttonIds.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = true;
    });
  },

  hideLoading(buttonIds = []) {
    const loader = document.getElementById('loadingOverlay');
    if (loader) loader.style.display = 'none';

    buttonIds.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = false;
    });
  },

  // Gestion unifiée des erreurs d'authentification
  handleAuthError(error) {
    let message = 'Une erreur est survenue';
    if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object') {
      if (error.code && ERROR_LABELS[error.code]) {
        message = ERROR_LABELS[error.code];
      } else if (error.message) {
        message = error.message;
      } else if (error.error) {
        message = error.error;
      }
    }

    console.error(error);

    try {
      if (typeof this.showNotification === 'function') {
        this.showNotification(message, 'error');
      } else if (typeof alert === 'function') {
        alert(message);
      }
    } catch (notifyErr) {
      console.error('Notification failure', notifyErr);
      if (typeof alert === 'function') {
        alert(message);
      }
    }
  }
};

// Exporter pour utilisation globale
window.utils = utils;
window.API_BASE_URL = API_BASE_URL;
export { utils, API_BASE_URL };
