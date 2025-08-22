// frontend/app/assets/js/config.js

// Configuration globale de l'application
window.APP_CONFIG = {
  version: '1.0.0',
  environment: 'staging',
  features: {
    onboarding: true,
    courses: true,
    ai: true,
    export: true
  }
};

// Configuration de l'API
const API_URL = window.ENV?.API_URL || '/api';
window.API_BASE_URL = API_URL;

// Configuration des endpoints
window.ENDPOINTS = {
  auth: {
    login: `${API_URL}/auth/login`,
    register: `${API_URL}/auth/register`,
    logout: `${API_URL}/auth/logout`,
    profile: `${API_URL}/auth/profile`,
    google: `${API_URL}/auth/google`
  },
  onboarding: {
    config: `${API_URL}/onboarding/config`,
    complete: `${API_URL}/onboarding/complete`,
    status: `${API_URL}/onboarding/status`,
    profile: `${API_URL}/onboarding/profile`
  },
  courses: {
    create: `${API_URL}/courses`,
    list: `${API_URL}/courses`,
    details: `${API_URL}/courses`
  },
  ai: {
    generate: `${API_URL}/ai/generate`,
    quiz: `${API_URL}/ai/quiz`
  }
};

// Configuration de l'authentification
window.AUTH_CONFIG = {
  tokenKey: 'noza-auth-token',
  userKey: 'noza-user-data',
  googleClientId: null // Sera récupéré depuis l'API
};

// Configuration de l'UI
window.UI_CONFIG = {
  notifications: {
    duration: 5000,
    position: 'top-right'
  },
  loading: {
    showAfter: 500,
    timeout: 30000
  }
};

// Configuration du cache
window.CACHE_CONFIG = {
  ttl: 5 * 60 * 1000, // 5 minutes
  keys: {
    courses: 'noza-courses-cache',
    profile: 'noza-profile-cache',
    config: 'noza-config-cache'
  }
};

// Fonction utilitaire pour vérifier la configuration
window.checkConfig = function() {
  const required = ['API_BASE_URL', 'ENDPOINTS', 'AUTH_CONFIG'];
  const missing = required.filter(key => !window[key]);
  
  if (missing.length > 0) {
    console.error('Configuration manquante:', missing);
    return false;
  }
  
  console.log('Configuration chargée avec succès');
  return true;
};

// Initialisation automatique
document.addEventListener('DOMContentLoaded', () => {
  window.checkConfig();
  
  // Récupérer la configuration Google si nécessaire
  if (window.authManager && typeof window.authManager.loadGoogleConfig === 'function') {
    window.authManager.loadGoogleConfig();
  }
});

console.log('Config.js chargé - API:', window.API_BASE_URL);
