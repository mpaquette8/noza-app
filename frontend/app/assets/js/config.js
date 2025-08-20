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
window.API_BASE_URL = 'https://noza-app-staging.up.railway.app/api';

// Configuration des endpoints
window.ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    profile: '/auth/profile',
    google: '/auth/google'
  },
  onboarding: {
    config: '/onboarding/config',
    complete: '/onboarding/complete',
    status: '/onboarding/status',
    profile: '/onboarding/profile'
  },
  courses: {
    create: '/courses',
    list: '/courses',
    details: '/courses'
  },
  ai: {
    generate: '/ai/generate',
    quiz: '/ai/quiz'
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
