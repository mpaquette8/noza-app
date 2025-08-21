// frontend/assets/js/auth.js

import { utils, API_BASE_URL } from './utils/utils.js';

class AuthManager {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        console.log('AuthManager initialisé:', { hasToken: !!this.token, user: this.user });
        this.updateUI();
    }

    // Afficher un message d'action
    showAction(message, actionLabel, actionCallback) {
        const notification = document.createElement('div');
        notification.className = 'notification error';
        const text = document.createElement('span');
        text.textContent = message;
        const btn = document.createElement('button');
        btn.textContent = actionLabel;
        btn.onclick = () => {
            notification.remove();
            actionCallback();
        };
        notification.appendChild(text);
        notification.appendChild(btn);
        document.body.appendChild(notification);
    }

    savePendingAuth(payload) {
        localStorage.setItem('pending-auth', JSON.stringify(payload));
        utils.showNotification('Données sauvegardées pour réessai ultérieur', 'success');
    }

    // ⭐ NOUVELLE MÉTHODE : Authentification Google
    async handleGoogleLogin(googleResponse) {
        if (!googleResponse?.credential) {
            utils.showNotification('Token Google manquant', 'error');
            return { success: false, error: 'Token Google manquant' };
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: googleResponse.credential })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const message = errorData.error || 'Erreur de connexion';
                utils.showNotification(message, 'error');
                utils.handleAuthError(message, true);
                return { success: false, error: message };
            }

            const data = await response.json();
            console.log('Réponse auth Google:', data);

            if (data.success) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('authToken', this.token);
                localStorage.setItem('user', JSON.stringify(this.user));
                this.updateUI();

                utils.showNotification('Connexion Google réussie !', 'success');

                // Charger les cours de l'utilisateur
                if (typeof courseManager !== 'undefined' && courseManager.loadUserCourses) {
                    courseManager.loadUserCourses();
                }

                window.location.href = '/app/';
                return { success: true };
            } else if (data.code === 'IA_TIMEOUT') {
                this.showAction(data.error || 'Service indisponible', 'Réessayer', () => this.handleGoogleLogin(googleResponse));
            } else if (data.code === 'QUOTA_EXCEEDED') {
                this.showAction(data.error || 'Quota dépassé', 'Sauvegarder', () => this.savePendingAuth({ credential: googleResponse.credential }));
            } else {
                const msg = data.error || 'Erreur connexion Google';
                utils.showNotification(msg, 'error');
                utils.handleAuthError(msg, true);
                return { success: false, error: msg };
            }
        } catch (error) {
            console.error('Erreur connexion Google:', error);
            const friendly = error.message.includes('Failed to fetch') ? 'Impossible de contacter le serveur' : error.message;
            utils.showNotification(friendly, 'error');
            utils.handleAuthError('Erreur connexion Google: ' + friendly, true);
            return { success: false, error: friendly };
        }
    }

    // CONNEXION email (existant)
    async login(email, password) {
        try {
            console.log('Tentative de connexion pour:', email);
            
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            console.log('Réponse login:', data);

            if (data.success) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('authToken', this.token);
                localStorage.setItem('user', JSON.stringify(this.user));
                this.updateUI();
                window.location.href = '/app/';
                return { success: true };
            } else if (data.code === 'IA_TIMEOUT') {
                this.showAction(data.error || 'Service indisponible', 'Réessayer', () => this.login(email, password));
                return { success: false, error: data.error, code: data.code };
            } else if (data.code === 'QUOTA_EXCEEDED') {
                this.showAction(data.error || 'Quota dépassé', 'Sauvegarder', () => this.savePendingAuth({ email, password }));
                return { success: false, error: data.error, code: data.code };
            } else {
                return { success: false, error: data.error, code: data.code };
            }
        } catch (error) {
            console.error('Erreur login:', error);
            return { success: false, error: 'Erreur de connexion' };
        }
    }

    // INSCRIPTION email (existant)
    async register(name, email, password) {
        try {
            console.log('Tentative d\'inscription pour:', { name, email });
            
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();
            console.log('Réponse register:', data);

            if (data.success) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('authToken', this.token);
                localStorage.setItem('user', JSON.stringify(this.user));
                this.updateUI();
                window.location.href = '/app/';
                return { success: true };
            } else if (data.code === 'IA_TIMEOUT') {
                this.showAction(data.error || 'Service indisponible', 'Réessayer', () => this.register(name, email, password));
                return { success: false, errors: [{ msg: data.error }], code: data.code };
            } else if (data.code === 'QUOTA_EXCEEDED') {
                this.showAction(data.error || 'Quota dépassé', 'Sauvegarder', () => this.savePendingAuth({ name, email, password }));
                return { success: false, errors: [{ msg: data.error }], code: data.code };
            } else {
                return { success: false, errors: data.errors || [{ msg: data.error }], code: data.code };
            }
        } catch (error) {
            console.error('Erreur register:', error);
            return { success: false, errors: [{ msg: 'Erreur de connexion' }] };
        }
    }

    // DÉCONNEXION
    logout() {
        console.log('Déconnexion...');
        this.token = null;
        this.user = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');

        // ⭐ Déconnexion Google et nettoyage des boutons
        if (window.google?.accounts?.id) {
            google.accounts.id.disableAutoSelect?.();
        }

        this.updateUI();
        window.location.href = '/';
    }

    // VÉRIFIER SI CONNECTÉ
    isAuthenticated() {
        return !!this.token && !!this.user;
    }

    // OBTENIR LES EN-TÊTES D'AUTHENTIFICATION
    getAuthHeaders() {
        return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
    }

    // ⭐ MODIFIÉ : METTRE À JOUR L'INTERFACE avec support avatar
    updateUI() {
        const authSection = document.getElementById('authSection');
        const userSection = document.getElementById('userSection');
        const mainContent = document.querySelector('.main-content');
        const authNavLink = document.getElementById('authNavLink');

        console.log('Mise à jour UI, authentifié:', this.isAuthenticated());

        if (this.isAuthenticated()) {
            // Utilisateur connecté
            if (authSection) authSection.style.display = 'none';
            if (userSection) {
                userSection.style.display = 'flex';
                
                // Nom utilisateur
                const userNameElement = userSection.querySelector('.user-name');
                if (userNameElement) {
                    userNameElement.textContent = this.user.name;
                }
                
                // ⭐ NOUVEAU : Gestion avatar Google
                const userAvatar = document.getElementById('userAvatar');
                const userDefaultIcon = document.getElementById('userDefaultIcon');
                
                if (this.user.avatar && userAvatar && userDefaultIcon) {
                    // Utilisateur avec avatar (Google)
                    userAvatar.src = this.user.avatar;
                    userAvatar.alt = this.user.name;
                    userAvatar.style.display = 'block';
                    userDefaultIcon.style.display = 'none';
                } else if (userAvatar && userDefaultIcon) {
                    // Utilisateur sans avatar (email)
                    userAvatar.style.display = 'none';
                    userDefaultIcon.style.display = 'block';
                }
            }
            if (mainContent) mainContent.style.display = 'grid';
            if (authNavLink) {
                authNavLink.href = '/app/';
                authNavLink.textContent = "Accéder à l'app";
            }
        } else {
            // Utilisateur non connecté
            if (userSection) userSection.style.display = 'none';
            if (mainContent) mainContent.style.display = 'none';
            if (authNavLink) {
                authNavLink.href = '/auth.html';
                authNavLink.textContent = 'Login/Signup';
            }
        }
    }
}

// Instance globale
export const authManager = new AuthManager();

// Fonctions pour gérer les événements d'authentification
function setupAuthListeners() {
    console.log('Configuration des event listeners auth...');

    // Tabs d'authentification
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            console.log('Changement d\'onglet:', tabName);

            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');

            document.getElementById('loginForm').style.display = tabName === 'login' ? 'block' : 'none';
            document.getElementById('registerForm').style.display = tabName === 'register' ? 'block' : 'none';

            // Relancer GoogleAuth lors du changement de vue si déjà prêt
            if (window.GoogleAuth) {
                if (GoogleAuth.state === GoogleAuth.STATES.FAILED) {
                    GoogleAuth.reset();
                }
                if (GoogleAuth.state === GoogleAuth.STATES.READY) {
                    GoogleAuth.promptLogin();
                }
            }
        });
    });

    // Connexion email (existant)
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', async function() {
            console.log('Clic sur le bouton de connexion');
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            if (!email || !password) {
                utils.handleAuthError('Veuillez remplir tous les champs');
                return;
            }

            this.disabled = true;
            this.innerHTML = '<div class="loading-spinner"></div>Connexion...';

            const result = await authManager.login(email, password);

            if (result.success) {
                showNotification('Connexion réussie !', 'success');
                // Charger les cours de l'utilisateur si la fonction existe
                if (typeof courseManager !== 'undefined' && courseManager.loadUserCourses) {
                    courseManager.loadUserCourses();
                }
            } else {
                utils.handleAuthError(result);
            }

            this.disabled = false;
            this.innerHTML = '<i data-lucide="log-in"></i>Se connecter';
            // Réinitialiser les icônes
            if (typeof utils !== 'undefined') {
                utils.initializeLucide();
            }
        });
    }

    // Inscription email (existant)
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', async function() {
            console.log('Clic sur le bouton d\'inscription');
            
            const name = document.getElementById('registerName').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;
            if (!name || !email || !password) {
                utils.handleAuthError('Veuillez remplir tous les champs');
                return;
            }

            if (password.length < 6) {
                utils.handleAuthError('Le mot de passe doit contenir au moins 6 caractères');
                return;
            }

            this.disabled = true;
            this.innerHTML = '<div class="loading-spinner"></div>Inscription...';

            const result = await authManager.register(name, email, password);

            if (result.success) {
                showNotification('Compte créé avec succès !', 'success');
            } else {
                const errorMessage = result.errors?.map(err => err.msg).join(', ') || 'Erreur lors de l\'inscription';
                utils.handleAuthError({ code: result.code, message: errorMessage });
            }

            this.disabled = false;
            this.innerHTML = '<i data-lucide="user-plus"></i>Créer mon compte';
            // Réinitialiser les icônes
            if (typeof utils !== 'undefined') {
                utils.initializeLucide();
            }
        });
    }

    // Déconnexion
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            console.log('Clic sur déconnexion');
            authManager.logout();
        });
    }

    // Gestion de la touche Entrée (existant)
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const registerName = document.getElementById('registerName');
    const registerEmail = document.getElementById('registerEmail');
    const registerPassword = document.getElementById('registerPassword');

    [loginEmail, loginPassword].forEach(input => {
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    document.getElementById('loginBtn').click();
                }
            });
        }
    });

    [registerName, registerEmail, registerPassword].forEach(input => {
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    document.getElementById('registerBtn').click();
                }
            });
        }
    });
}

function showNotification(message, type = 'success') {
    if (typeof utils !== 'undefined' && utils.showNotification) {
        utils.showNotification(message, type);
    } else {
        // Fallback si utils n'est pas encore chargé
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// Initialiser GoogleAuth une seule fois
let googleAuthInitialized = false;
async function initializeGoogleAuth() {
    if (!window.GoogleAuth || googleAuthInitialized) return;
    try {
        await GoogleAuth.init(response => authManager.handleGoogleLogin(response));
        document.querySelectorAll('.auth-separator').forEach(el => el.style.display = 'block');
        googleAuthInitialized = true;
    } catch (err) {
        console.error('Erreur initialisation GoogleAuth:', err);
    }
}

// Initialiser les event listeners quand le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM chargé, configuration de l'authentification...");
    setupAuthListeners();
    const authSection = document.getElementById('authSection');
    if (authSection) {
        document.querySelectorAll('.auth-separator').forEach(el => el.style.display = 'none');
        initializeGoogleAuth();
    }
});

// Export global
window.authManager = authManager;
window.setupAuthListeners = setupAuthListeners;
window.AuthManager = AuthManager;

console.log('Script auth.js chargé');

