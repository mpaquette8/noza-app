// frontend/app/assets/js/onboarding-manager.js

import { utils, API_BASE_URL } from './utils/utils.js';
import { authManager } from './auth.js';

class OnboardingManager {
  constructor() {
    this.status = null;
  }

  async checkOnboardingStatus(forceRefresh = false) {
    if (!forceRefresh && this.status) {
      return this.status;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/onboarding/status`, {
        headers: {
          'Content-Type': 'application/json',
          ...authManager.getAuthHeaders()
        }
      });
      const data = await response.json();
      if (data.success) {
        this.status = data.status;
        return this.status;
      } else {
        utils.handleAuthError(data.error || 'Erreur récupération statut onboarding');
        return { onboardingCompleted: false, profileConfidence: 0 };
      }
    } catch (error) {
      console.error('Erreur statut onboarding:', error);
      utils.handleAuthError('Erreur vérification statut onboarding: ' + error.message, true);
      return { onboardingCompleted: false, profileConfidence: 0 };
    }
  }

  async redirectToOnboardingIfNeeded(forceRefresh = false) {
    const status = await this.checkOnboardingStatus(forceRefresh);
    if (!status.onboardingCompleted) {
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/app/onboarding')) {
        window.location.href = '/app/onboarding.html';
      }
    }
  }
}

export const onboardingManager = new OnboardingManager();
if (typeof window !== 'undefined') {
  window.onboardingManager = onboardingManager;
  window.OnboardingManager = OnboardingManager;
}

