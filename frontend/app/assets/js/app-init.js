import { ModularConfigManager } from './modular-config-manager.js';
import { authManager } from './auth.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.isLoggedIn || !window.isLoggedIn()) {
    window.location.href = '/auth.html';
    return;
  }

  await window.onboardingManager.redirectToOnboardingIfNeeded();
  const status = await window.onboardingManager.checkOnboardingStatus();
  if (!status.onboardingCompleted) {
    return;
  }

  window.configManager = new ModularConfigManager();
  window.configManager.init();

  if (!authManager.isAuthenticated()) {
    window.location.href = '/auth.html';
    return;
  }

  if (typeof window.initializeApp === 'function') {
    window.initializeApp();
  }
});
