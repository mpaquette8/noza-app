// Configuration API
const API_BASE_URL = 'http://localhost:3001/api';

// Fonction pour initialiser Lucide en sécurité
function initializeLucide() {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    } else {
        console.warn('Lucide icons not loaded');
    }
}

// État de l'application
let currentCourse = null;
let history = JSON.parse(localStorage.getItem('noza-history') || '[]');

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    loadHistory();
    initializeLucide(); // ← Ajoutez cette ligne
});

function initializeApp() {
    // Event listeners
    document.getElementById('generateBtn').addEventListener('click', generateCourse);
    document.getElementById('generateQuiz').addEventListener('click', generateQuiz);
    document.getElementById('copyContent').addEventListener('click', copyContent);
    
    // Chat interface
    const chatInput = document.querySelector('.chat-input');
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            askQuestion();
        }
    });

    // Radio buttons et sélecteurs
    setupFormControls();
}

async function generateCourse() {
    const subject = document.getElementById('subject').value.trim();
    const detailLevel = document.getElementById('detailSlider').value;
    const vulgarizationLevel = document.getElementById('vulgarizationSlider').value;

    if (!subject) {
        alert('Veuillez entrer un sujet pour le cours');
        return;
    }

    // État de chargement
    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<div class="loading-spinner"></div>Génération en cours...';

    try {
        const response = await fetch(`${API_BASE_URL}/generate-course`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                subject, 
                detailLevel: parseInt(detailLevel),
                vulgarizationLevel: parseInt(vulgarizationLevel)
            })
        });

        const data = await response.json();

        if (data.success) {
            currentCourse = data.course;
            displayCourse(data.course);
            addToHistory(data.course);
            showSuccessMessage('Cours généré avec succès !');
        } else {
            throw new Error(data.error || 'Erreur lors de la génération');
        }

    } catch (error) {
        console.error('Erreur:', error);
        showErrorMessage('Erreur lors de la génération du cours: ' + error.message);
    } finally {
        // Remettre le bouton en état normal
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i data-lucide="sparkles"></i>Générer le cours';
        initializeLucide();
    }
}

async function askQuestion() {
    const chatInput = document.querySelector('.chat-input');
    const question = chatInput.value.trim();

    if (!question || !currentCourse) return;

    // Créer un élément de question
    const questionElement = createMessageElement(question, 'user');
    appendToChat(questionElement);

    // Nettoyer l'input
    chatInput.value = '';

    // Afficher le typing indicator
    const typingElement = createTypingIndicator();
    appendToChat(typingElement);

    try {
        const response = await fetch(`${API_BASE_URL}/ask-question`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                question: question,
                courseContent: currentCourse.content
            })
        });

        const data = await response.json();

        // Retirer le typing indicator
        typingElement.remove();

        if (data.success) {
            const answerElement = createMessageElement(data.answer, 'assistant');
            appendToChat(answerElement);
        } else {
            throw new Error(data.error || 'Erreur lors de la génération de la réponse');
        }

    } catch (error) {
        typingElement.remove();
        console.error('Erreur:', error);
        const errorElement = createMessageElement('Désolé, je n\'ai pas pu répondre à votre question.', 'error');
        appendToChat(errorElement);
    }
}

async function generateQuiz() {
    if (!currentCourse) {
        alert('Générez d\'abord un cours pour créer un quiz');
        return;
    }

    const quizBtn = document.getElementById('generateQuiz');
    quizBtn.disabled = true;
    quizBtn.innerHTML = '<div class="loading-spinner"></div>Génération...';

    try {
        const response = await fetch(`${API_BASE_URL}/generate-quiz`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                courseContent: currentCourse.content
            })
        });

        const data = await response.json();

        if (data.success) {
            displayQuiz(data.quiz);
            showSuccessMessage('Quiz généré avec succès !');
        } else {
            throw new Error(data.error || 'Erreur lors de la génération du quiz');
        }

    } catch (error) {
        console.error('Erreur:', error);
        showErrorMessage('Erreur lors de la génération du quiz: ' + error.message);
    } finally {
        quizBtn.disabled = false;
        quizBtn.innerHTML = '<i data-lucide="help-circle"></i>Quiz';
        initializeLucide();
    }
}

// Fonctions utilitaires
function displayCourse(course) {
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('courseContent').style.display = 'block';
    document.getElementById('generatedCourse').innerHTML = course.content;
    
    // Réinitialiser le chat
    const chatContainer = document.querySelector('.chat-messages');
    if (chatContainer) {
        chatContainer.innerHTML = '';
    }
    
    initializeLucide();
}

function addToHistory(course) {
    history.unshift(course);
    if (history.length > 10) {
        history = history.slice(0, 10);
    }
    localStorage.setItem('noza-history', JSON.stringify(history));
    updateHistoryDisplay();
}

function loadHistory() {
    updateHistoryDisplay();
}

function updateHistoryDisplay() {
    const historyTab = document.getElementById('historyTab');
    
    if (history.length === 0) {
        historyTab.innerHTML = `
            <div class="empty-state">
                <i data-lucide="history"></i>
                <h3>Aucun historique</h3>
                <p>Vos cours générés apparaîtront ici automatiquement.</p>
            </div>
        `;
    } else {
        historyTab.innerHTML = history.map(course => `
            <div class="history-item" onclick="loadCourseFromHistory('${course.id}')">
                <h4>${course.subject}</h4>
                <p>Niveau: ${course.level} | Longueur: ${course.length}</p>
                <small>${new Date(course.createdAt).toLocaleDateString()}</small>
            </div>
        `).join('');
    }
    
    initializeLucide();
}

function showSuccessMessage(message) {
    // Implémentation simple avec alert, peut être améliorée avec une notification toast
    console.log('✅', message);
}

function showErrorMessage(message) {
    alert('❌ ' + message);
}

// Configuration des contrôles de formulaire
function setupFormControls() {
    // Radio buttons
    document.querySelectorAll('.radio-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            this.querySelector('input[type="radio"]').checked = true;
        });
    });

    // Length selector
    document.querySelectorAll('.length-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.length-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });
}

// Fonctions d'interface chat
function createMessageElement(content, type) {
    const div = document.createElement('div');
    div.className = `chat-message ${type}`;
    div.innerHTML = `<div class="message-content">${content}</div>`;
    return div;
}

function createTypingIndicator() {
    const div = document.createElement('div');
    div.className = 'chat-message typing';
    div.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    return div;
}

function appendToChat(element) {
    let chatContainer = document.querySelector('.chat-messages');
    if (!chatContainer) {
        chatContainer = document.createElement('div');
        chatContainer.className = 'chat-messages';
        document.querySelector('.chat-interface').appendChild(chatContainer);
    }
    chatContainer.appendChild(element);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Autres fonctions utilitaires
function copyContent() {
    if (currentCourse) {
        const textContent = currentCourse.content.replace(/<[^>]*>/g, '');
        navigator.clipboard.writeText(textContent).then(() => {
            showSuccessMessage('Contenu copié dans le presse-papiers !');
        });
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    document.getElementById(`${tabName}Tab`).style.display = 'block';
}
