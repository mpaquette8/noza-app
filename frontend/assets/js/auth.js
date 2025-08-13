// frontend/assets/js/auth.js

class AuthManager {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        console.log('AuthManager initialisé:', { hasToken: !!this.token, user: this.user });
        this.updateUI();
    }

    // ⭐ NOUVELLE MÉTHODE : Authentification Google
    async handleGoogleLogin(googleResponse) {
        try {
            console.log('Traitement connexion Google...', googleResponse);
            
            if (!googleResponse.credential) {
                throw new Error('Token Google manquant');
            }

            // Envoyer le token à notre API
            const response = await fetch(`${API_BASE_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    credential: googleResponse.credential 
                })
            });

            const data = await response.json();
            console.log('Réponse auth Google:', data);

            if (data.success) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('authToken', this.token);
                localStorage.setItem('user', JSON.stringify(this.user));
                this.updateUI();
                
                showNotification('Connexion Google réussie !', 'success');
                
                // Charger les cours de l'utilisateur
                if (typeof courseManager !== 'undefined' && courseManager.loadUserCourses) {
                    courseManager.loadUserCourses();
                }
                
                return { success: true };
            } else {
                throw new Error(data.error || 'Erreur connexion Google');
            }
        } catch (error) {
            console.error('Erreur connexion Google:', error);
            showNotification('Erreur connexion Google: ' + error.message, 'error');
            return { success: false, error: error.message };
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
                return { success: true };
            } else {
                return { success: false, error: data.error };
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
                return { success: true };
            } else {
                return { success: false, errors: data.errors || [{ msg: data.error }] };
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
        
        // ⭐ NOUVEAU : Déconnexion Google aussi
        if (window.GoogleAuth) {
            GoogleAuth.disableAutoSelect();
        }
        
        this.updateUI();
        window.location.reload();
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
        } else {
            // Utilisateur non connecté
            if (authSection) authSection.style.display = 'block';
            if (userSection) userSection.style.display = 'none';
            if (mainContent) mainContent.style.display = 'none';
        }
    }
}

// Instance globale
const authManager = new AuthManager();

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
        });
    });

    // Connexion email (existant)
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', async function() {
            console.log('Clic sur le bouton de connexion');
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const errorDiv = document.getElementById('loginError');

            if (!email || !password) {
                showAuthError(errorDiv, 'Veuillez remplir tous les champs');
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
                showAuthError(errorDiv, result.error);
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
            const errorDiv = document.getElementById('registerError');

            if (!name || !email || !password) {
                showAuthError(errorDiv, 'Veuillez remplir tous les champs');
                return;
            }

            if (password.length < 6) {
                showAuthError(errorDiv, 'Le mot de passe doit contenir au moins 6 caractères');
                return;
            }

            this.disabled = true;
            this.innerHTML = '<div class="loading-spinner"></div>Inscription...';

            const result = await authManager.register(name, email, password);

            if (result.success) {
                showNotification('Compte créé avec succès !', 'success');
            } else {
                const errorMessage = result.errors?.map(err => err.msg).join(', ') || 'Erreur lors de l\'inscription';
                showAuthError(errorDiv, errorMessage);
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

function showAuthError(errorDiv, message) {
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

function showNotification(message, type = 'success') {
    if (typeof utils !== 'undefined' && utils.showNotification) {
        utils.showNotification(message, type);
    } else {
        // Fallback si utils n'est pas encore chargé
        console.log(`${type.toUpperCase()}: ${message}`);
    }
}

// Initialiser les event listeners quand le DOM est chargé
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM chargé, configuration de l\'authentification...');

    const separators = document.querySelectorAll('.auth-separator');
    separators.forEach(el => el.style.display = 'none');

    if (window.GoogleAuth) {
        GoogleAuth.init((response) => authManager.handleGoogleLogin(response))
            .then(() => {
                if (GoogleAuth.state === GoogleAuth.STATES.READY) {
                    separators.forEach(el => el.style.display = 'block');
                }
            })
            .catch(() => {
                // L'initialisation a échoué, le fallback est géré par GoogleAuth
            });
    }
    setupAuthListeners();
});

// Export global
window.authManager = authManager;
window.setupAuthListeners = setupAuthListeners;

console.log('Script auth.js chargé');
