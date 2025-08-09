// frontend/assets/js/main.js - Point d'entrée principal

// État global de l'application
let currentCourse = null;

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation Hermès App');
    
    initializeApp();
    setupEventListeners();
    
    // Charger l'historique selon l'authentification
    if (authManager && authManager.isAuthenticated()) {
        courseManager.loadUserCourses();
    } else if (courseManager) {
        courseManager.updateHistoryDisplay();
    }
    
    utils.initializeLucide();
    console.log('✅ App initialisée');
});

function initializeApp() {
    // Configuration initiale de l'interface
    initializeGauges();
    setupFormControls();
}

function setupEventListeners() {
    // Boutons principaux
    const generateBtn = document.getElementById('generateBtn');
    const generateQuiz = document.getElementById('generateQuiz');
    const copyContent = document.getElementById('copyContent');
    const randomSubjectBtn = document.getElementById('randomSubjectBtn');
    
    if (generateBtn) generateBtn.addEventListener('click', handleGenerateCourse);
    if (generateQuiz) generateQuiz.addEventListener('click', handleGenerateQuiz);
    if (copyContent) copyContent.addEventListener('click', () => courseManager && courseManager.copyContent());
    if (randomSubjectBtn) randomSubjectBtn.addEventListener('click', generateRandomSubject);
    
    // Chat
    setupChatEventListeners();
}

// Gestionnaires d'événements principaux
async function handleGenerateCourse() {
    const subject = document.getElementById('subject').value.trim();
    const detailLevel = document.getElementById('detailSlider').value;
    const vulgarizationLevel = document.getElementById('vulgarizationSlider').value;

    if (!subject) {
        utils.showNotification('Veuillez entrer un sujet pour le décryptage', 'error');
        return;
    }

    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<div class="loading-spinner"></div>Génération en cours...';

    try {
        if (courseManager) {
            const course = await courseManager.generateCourse(subject, detailLevel, vulgarizationLevel);
            if (course) {
                currentCourse = course;
            }
        }
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i data-lucide="sparkles"></i>Décrypter le sujet';
        utils.initializeLucide();
    }
}

function setupChatEventListeners() {
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    
    if (chatInput) {
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                askQuestion();
            }
        });
    }
    
    if (chatSendBtn) {
        chatSendBtn.addEventListener('click', askQuestion);
    }
}

async function askQuestion() {
    const chatInput = document.getElementById('chatInput');
    const question = chatInput.value.trim();

    if (!question) {
        utils.showNotification('Veuillez saisir une question', 'error');
        return;
    }

    // TODO: Implémenter la logique de chat
    utils.showNotification('Chat - En cours d\'implémentation', 'error');
}

// Jauges et contrôles (copiés de votre ancien script)
const detailLevels = {
    1: { name: 'Synthèse', description: 'Cours concis avec les points essentiels.' },
    2: { name: 'Détaillé', description: 'Cours complet avec explications approfondies.' },
    3: { name: 'Exhaustif', description: 'Analyse très complète avec références.' }
};

const vulgarizationLevels = {
    1: { name: 'Grand Public', description: 'Comme expliquer à votre grand-mère' },
    2: { name: 'Éclairé', description: 'Niveau bac scientifique' },
    3: { name: 'Connaisseur', description: 'Niveau université' },
    4: { name: 'Expert', description: 'Vocabulaire technique assumé' }
};

const combinations = {
    '1-1': { icon: '🎯', text: 'Synthèse grand public - Vue d\'ensemble accessible' },
    '1-4': { icon: '⚡', text: 'Synthèse expert - Résumé technique' },
    '2-1': { icon: '📚', text: 'Guide détaillé grand public' },
    '2-2': { icon: '🎯', text: 'Cours détaillé et accessible' },
    '2-3': { icon: '🔧', text: 'Cours technique détaillé' },
    '3-1': { icon: '📖', text: 'Manuel complet grand public' },
    '3-4': { icon: '🎓', text: 'Analyse exhaustive expert' }
};

function updateDetailGauge() {
    const slider = document.getElementById('detailSlider');
    const value = parseInt(slider.value);
    const level = detailLevels[value];
    
    const valueEl = document.getElementById('detailValue');
    const descEl = document.getElementById('detailDescription');
    const trackEl = document.getElementById('detailTrack');
    
    if (valueEl) valueEl.textContent = level.name;
    if (descEl) descEl.innerHTML = `<strong>${level.name} :</strong> ${level.description}`;
    if (trackEl) {
        const percentage = ((value - 1) / 2) * 100;
        trackEl.style.width = `${percentage}%`;
    }
    
    updateCombination();
}

function updateVulgarizationGauge() {
    const slider = document.getElementById('vulgarizationSlider');
    const value = parseInt(slider.value);
    const level = vulgarizationLevels[value];
    
    const valueEl = document.getElementById('vulgarizationValue');
    const descEl = document.getElementById('vulgarizationDescription');
    const trackEl = document.getElementById('vulgarizationTrack');
    
    if (valueEl) valueEl.textContent = level.name;
    if (descEl) descEl.innerHTML = `<strong>${level.name} :</strong> ${level.description}`;
    if (trackEl) {
        const percentage = ((value - 1) / 3) * 100;
        trackEl.style.width = `${percentage}%`;
    }
    
    updateCombination();
}

function updateCombination() {
    const detailSlider = document.getElementById('detailSlider');
    const vulgarSlider = document.getElementById('vulgarizationSlider');
    
    if (!detailSlider || !vulgarSlider) return;
    
    const detailVal = detailSlider.value;
    const vulgarVal = vulgarSlider.value;
    const key = `${detailVal}-${vulgarVal}`;
    
    const combination = combinations[key] || { 
        icon: '⚙️', 
        text: `Configuration personnalisée (Détail: ${detailLevels[detailVal]?.name}, Vulgarisation: ${vulgarizationLevels[vulgarVal]?.name})` 
    };
    
    const iconEl = document.querySelector('.combination-icon');
    const textEl = document.getElementById('combinationText');
    
    if (iconEl) iconEl.textContent = combination.icon;
    if (textEl) textEl.textContent = combination.text;
}

function initializeGauges() {
    const detailSlider = document.getElementById('detailSlider');
    const vulgarizationSlider = document.getElementById('vulgarizationSlider');
    
    if (detailSlider) {
        detailSlider.addEventListener('input', updateDetailGauge);
        updateDetailGauge();
    }
    
    if (vulgarizationSlider) {
        vulgarizationSlider.addEventListener('input', updateVulgarizationGauge);
        updateVulgarizationGauge();
    }
}

function setupFormControls() {
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeTab) activeTab.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    const activeContent = document.getElementById(`${tabName}Tab`);
    if (activeContent) activeContent.style.display = 'block';
}

// Fonctions temporaires
function handleGenerateQuiz() {
    utils.showNotification('Quiz - En cours d\'implémentation', 'error');
}

async function generateRandomSubject() {
    const randomBtn = document.getElementById('randomSubjectBtn');
    const subjectTextarea = document.getElementById('subject');
    
    if (!randomBtn || !subjectTextarea) return;
    
    // Désactiver le bouton et ajouter l'animation
    randomBtn.disabled = true;
    randomBtn.classList.add('spinning');
    randomBtn.innerHTML = '<i data-lucide="sparkles"></i>Génération... <i data-lucide="dice-6"></i>';
    
    try {
        const response = await fetch(`${API_BASE_URL}/ai/random-subject`, {
            headers: authManager.getAuthHeaders()
        });

        const data = await response.json();

        if (data.success) {
            // Effet de typing pour remplir le textarea
            typewriterEffect(subjectTextarea, data.subject, () => {
                // Réactiver le bouton
                randomBtn.disabled = false;
                randomBtn.classList.remove('spinning');
                randomBtn.innerHTML = '<i data-lucide="sparkles"></i>Générer un sujet aléatoire <i data-lucide="dice-6"></i>';
                
                // Afficher une notification avec la catégorie
                utils.showNotification(`Sujet aléatoire généré (${data.category})`, 'success');
                utils.initializeLucide();
            });
        } else {
            throw new Error(data.error || 'Erreur lors de la génération');
        }
    } catch (error) {
        console.error('Erreur:', error);
        utils.showNotification('Erreur lors de la génération du sujet: ' + error.message, 'error');
        
        // Réactiver le bouton en cas d'erreur
        randomBtn.disabled = false;
        randomBtn.classList.remove('spinning');
        randomBtn.innerHTML = '<i data-lucide="sparkles"></i>Générer un sujet aléatoire <i data-lucide="dice-6"></i>';
        utils.initializeLucide();
    }
}

function typewriterEffect(element, text, callback) {
    element.value = '';
    let i = 0;
    
    function typeWriter() {
        if (i < text.length) {
            element.value += text.charAt(i);
            i++;
            setTimeout(typeWriter, 30); // Vitesse de frappe
        } else if (callback) {
            callback();
        }
    }
    
    typeWriter();
}

// Exposer globalement
window.currentCourse = currentCourse;
window.handleGenerateCourse = handleGenerateCourse;