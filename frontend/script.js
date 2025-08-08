// Configuration API
const API_BASE_URL = window.location.origin + '/api';

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
    initializeLucide();
});

function initializeApp() {
    // Vos event listeners existants...
    document.getElementById('generateBtn').textContent = 'Décrypter le sujet';
    document.getElementById('generateBtn').addEventListener('click', generateCourse);
    document.getElementById('generateQuiz').addEventListener('click', generateQuiz);
    document.getElementById('copyContent').addEventListener('click', copyContent);
    document.getElementById('exportPdf').addEventListener('click', exportPdf);
    document.getElementById('exportDocx').addEventListener('click', exportDocx);
    document.getElementById('randomSubjectBtn').addEventListener('click', generateRandomSubject);
    document.getElementById('generateBtn').addEventListener('click', generateCourse);
    
    // Chat interface
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            askQuestion();
        }
    });
    
    chatSendBtn.addEventListener('click', askQuestion);

    // Auto-resize chat input
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });

    initializeGauges();

    // Ajouter le bouton d'effacement du chat
    addClearChatButton();

    // Setup form controls
    setupFormControls();
}

async function generateCourse() {
    const subject = document.getElementById('subject').value.trim();
    const detailLevel = document.getElementById('detailSlider').value;
    const vulgarizationLevel = document.getElementById('vulgarizationSlider').value;

    if (!subject) {
        showNotification('Veuillez entrer un sujet pour le décryptage', 'error');
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
            showNotification('Cours généré avec succès !', 'success');
        } else {
            throw new Error(data.error || 'Erreur lors de la génération');
        }

    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la génération du cours: ' + error.message, 'error');
    } finally {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i data-lucide="sparkles"></i>Générer le cours';
        initializeLucide();
    }
}

async function askQuestion() {
    const chatInput = document.getElementById('chatInput');
    const question = chatInput.value.trim();

    if (!question) {
        showNotification('Veuillez saisir une question', 'error');
        return;
    }

    // Afficher les messages
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.style.display = 'block';

    // Créer un élément de question
    const questionElement = createMessageElement(question, 'user');
    appendToChat(questionElement);

    // Nettoyer l'input
    chatInput.value = '';
    chatInput.style.height = 'auto';

    // Désactiver les contrôles pendant la génération
    const chatSendBtn = document.getElementById('chatSendBtn');
    chatSendBtn.disabled = true;
    chatInput.disabled = true;

    // Afficher le typing indicator
    const typingElement = createTypingIndicator();
    appendToChat(typingElement);

    try {
        // Récupérer le niveau sélectionné
        const selectedLevel = document.querySelector('input[name="level"]:checked')?.value || 'intermediate';
        
        // Préparer les données pour l'API
        const requestData = {
            question: question,
            level: selectedLevel,
            questionType: 'auto' // Détection automatique du type
        };

        // Ajouter le contenu du cours s'il existe
        if (currentCourse && currentCourse.content) {
            requestData.courseContent = currentCourse.content;
        }

        const response = await fetch(`${API_BASE_URL}/ask-question`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        const data = await response.json();

        // Retirer le typing indicator
        typingElement.remove();

        if (data.success) {
            // Créer la réponse avec des métadonnées
            const answerElement = createEnhancedMessageElement(
                data.answer, 
                'assistant', 
                {
                    questionType: data.questionType,
                    level: data.level
                }
            );
            appendToChat(answerElement);

            // Suggérer des questions de suivi si c'est une question générale
            if (data.questionType === 'general' && currentCourse) {
                setTimeout(() => {
                    suggestFollowUpQuestions();
                }, 2000);
            }
        } else {
            throw new Error(data.error || 'Erreur lors de la génération de la réponse');
        }

    } catch (error) {
        typingElement.remove();
        console.error('Erreur:', error);
        
        // Réponse d'erreur plus intelligente
        const errorMessage = getIntelligentErrorMessage(error.message);
        const errorElement = createMessageElement(errorMessage, 'error');
        appendToChat(errorElement);
        
        showNotification('Erreur lors de la génération de la réponse', 'error');
    } finally {
        // Réactiver les contrôles
        chatSendBtn.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
        initializeLucide();
    }
}

async function generateQuiz() {
    if (!currentCourse) {
        showNotification('Générez d\'abord un cours pour créer un quiz', 'error');
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
            showNotification('Quiz généré avec succès !', 'success');
        } else {
            throw new Error(data.error || 'Erreur lors de la génération du quiz');
        }

    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la génération du quiz: ' + error.message, 'error');
        
        // En cas d'erreur, vider le quiz section
        const quizSection = document.getElementById('quizSection');
        if (quizSection) {
            quizSection.style.display = 'none';
            quizSection.innerHTML = '';
        }
    } finally {
        // Toujours remettre le bouton en état normal
        quizBtn.disabled = false;
        quizBtn.innerHTML = '<i data-lucide="help-circle"></i>Quiz';
        initializeLucide();
    }
}

// Fonctions d'affichage
function displayCourse(course) {
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('courseContent').style.display = 'block';
    document.getElementById('generatedCourse').innerHTML = course.content;
    
    // Réinitialiser le chat
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';
    chatMessages.style.display = 'none';
    
    // Masquer le quiz s'il était affiché
    document.getElementById('quizSection').style.display = 'none';
    document.getElementById('quizSection').innerHTML = '';
    
    initializeLucide();
}

function displayQuiz(quiz) {
    const quizSection = document.getElementById('quizSection');
    
    let quizHTML = `
        <div class="quiz-container">
            <div class="quiz-header">
                <h3>📝 Quiz de Compréhension</h3>
                <button class="quiz-close-btn" id="quizCloseBtn">
                    <i data-lucide="x"></i>
                </button>
            </div>
    `;
    
    quiz.questions.forEach((q, index) => {
        quizHTML += `
            <div class="quiz-question" data-question="${index}">
                <h4>${index + 1}. ${q.question}</h4>
                <div class="quiz-options">
                    ${q.options.map((option, optIndex) => `
                        <div class="quiz-option" data-question="${index}" data-option="${optIndex}">
                            ${option}
                        </div>
                    `).join('')}
                </div>
                <div class="quiz-explanation" style="display: none;">
                    <strong>✅ Réponse correcte :</strong> ${q.options[q.correct]}<br>
                    <strong>💡 Explication :</strong> ${q.explanation}
                </div>
            </div>
        `;
    });
    
    quizHTML += `
            <div class="quiz-score" style="display: none;">
                <h3>🎯 Résultat : <span id="scoreText"></span></h3>
                <div class="quiz-actions">
                    <button class="generate-btn" id="resetQuizBtn">
                        <i data-lucide="refresh-cw"></i>
                        Recommencer le Quiz
                    </button>
                    <button class="action-btn" id="closeQuizBtn">
                        <i data-lucide="x"></i>
                        Fermer le Quiz
                    </button>
                </div>
            </div>
        </div>
    `;
    
    quizSection.innerHTML = quizHTML;
    quizSection.style.display = 'block';
    
    // Ajouter les event listeners pour le quiz
    setupQuizListeners(quiz);
    
    // Ajouter les event listeners pour les boutons du quiz
    setupQuizButtonListeners();
    
    // Faire défiler vers le quiz
    quizSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    
    initializeLucide();
}

function setupQuizListeners(quiz) {
    const quizOptions = document.querySelectorAll('.quiz-option');
    let userAnswers = {};
    
    quizOptions.forEach(option => {
        option.addEventListener('click', function() {
            const questionIndex = parseInt(this.dataset.question);
            const optionIndex = parseInt(this.dataset.option);
            
            // Désélectionner les autres options de cette question
            document.querySelectorAll(`[data-question="${questionIndex}"]`).forEach(opt => {
                opt.classList.remove('selected');
            });
            
            // Sélectionner cette option
            this.classList.add('selected');
            userAnswers[questionIndex] = optionIndex;
            
            // Vérifier si toutes les questions ont été répondues
            if (Object.keys(userAnswers).length === quiz.questions.length) {
                setTimeout(() => showQuizResults(quiz, userAnswers), 500);
            }
        });
    });
}

function setupQuizButtonListeners() {
    // Bouton fermer dans le header
    const quizCloseBtn = document.getElementById('quizCloseBtn');
    if (quizCloseBtn) {
        quizCloseBtn.addEventListener('click', closeQuiz);
    }
    
    // Bouton recommencer
    const resetQuizBtn = document.getElementById('resetQuizBtn');
    if (resetQuizBtn) {
        resetQuizBtn.addEventListener('click', resetQuiz);
    }
    
    // Bouton fermer dans le score
    const closeQuizBtn = document.getElementById('closeQuizBtn');
    if (closeQuizBtn) {
        closeQuizBtn.addEventListener('click', closeQuiz);
    }
}

function showQuizResults(quiz, userAnswers) {
    let correctCount = 0;
    
    quiz.questions.forEach((question, index) => {
        const userAnswer = userAnswers[index];
        const isCorrect = userAnswer === question.correct;
        
        if (isCorrect) correctCount++;
        
        // Marquer les réponses
        const questionOptions = document.querySelectorAll(`[data-question="${index}"]`);
        questionOptions.forEach((option, optIndex) => {
            if (optIndex === question.correct) {
                option.classList.add('correct');
            } else if (optIndex === userAnswer && !isCorrect) {
                option.classList.add('incorrect');
            }
            option.style.pointerEvents = 'none';
        });
        
        // Afficher l'explication
        document.querySelector(`[data-question="${index}"] .quiz-explanation`).style.display = 'block';
    });
    
    // Afficher le score
    // Afficher le score
    const scorePercentage = Math.round((correctCount / quiz.questions.length) * 100);
    const scoreElement = document.getElementById('scoreText');
    if (scoreElement) {
        scoreElement.textContent = `${correctCount}/${quiz.questions.length} (${scorePercentage}%)`;
    }

    const quizScoreElement = document.querySelector('.quiz-score');
    if (quizScoreElement) {
        quizScoreElement.style.display = 'block';
    }

    showNotification(`Quiz terminé ! Score: ${scorePercentage}%`, 'success');
}

// Fonctions utilitaires
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
                <p>Détail: ${course.detailLevel}/3 | Vulgarisation: ${course.vulgarizationLevel}/4</p>
                <small>${new Date(course.createdAt).toLocaleDateString()}</small>
            </div>
        `).join('');
    }
    
    initializeLucide();
}

function loadCourseFromHistory(courseId) {
    const course = history.find(c => c.id === courseId);
    if (course) {
        currentCourse = course;
        displayCourse(course);
        switchTab('course');
        showNotification('Cours chargé depuis l\'historique', 'success');
    }
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
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.appendChild(element);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Fonctions d'export
function copyContent() {
    if (currentCourse) {
        const textContent = currentCourse.content.replace(/<[^>]*>/g, '');
        navigator.clipboard.writeText(textContent).then(() => {
            showNotification('Contenu copié dans le presse-papiers !', 'success');
        }).catch(() => {
            showNotification('Erreur lors de la copie', 'error');
        });
    }
}

function exportPdf() {
    showNotification('Export PDF - Fonctionnalité en développement', 'error');
}

function exportDocx() {
    showNotification('Export DOCX - Fonctionnalité en développement', 'error');
}

// Fonctions de navigation
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    document.getElementById(`${tabName}Tab`).style.display = 'block';
}

// Configuration des contrôles de formulaire
function setupFormControls() {
    // Radio buttons
    document.querySelectorAll('.radio-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            this.querySelector('input[type="radio"]').checked = true;
            
            // Mettre à jour l'indicateur de niveau du chat
            updateChatLevelIndicator();
        });
    });

    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // Initialiser l'indicateur de niveau
    updateChatLevelIndicator();
}

// Système de notifications
function showNotification(message, type = 'success') {
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
}

// Base de données de sujets aléatoires organisés par catégories
const randomSubjects = {
     physique: [
        "Pourquoi E=mc² a révolutionné le monde",
        "Comment votre GPS utilise la relativité d'Einstein",
        "Les trous noirs et la relativité générale",
        "La mécanique quantique et le principe d'incertitude",
        "La physique quantique sans les maths compliquées"
    ],
    mathematiques: [
        "Le mystère des nombres premiers expliqué simplement",
        "Les bases de l'arithmétique et des nombres premiers",
        "La géométrie euclidienne expliquée simplement",
        "Statistiques de base et leur importance",
        "Introduction aux concepts de topologie"
    ],
    biologie: [
        "Pourquoi les vaccins fonctionnent : immunologie 101",
        "L'évolution et la sélection naturelle",
        "La structure de l'ADN et la génétique",
        "Les neurones et le fonctionnement du cerveau",
        "La neuroplasticité et l'apprentissage"
    ],
    terre: [
        "Le réchauffement climatique et ses causes",
        "La théorie de la dérive des continents",
        "Les propriétés de l'eau et son cycle naturel",
        "Le climat et son impact sur les sociétés",
        "Fondements de la géologie et des tremblements de terre"
    ],
    appliees: [
        "Principes de base de l'ingénierie électrique",
        "Informatique théorique : algorithmes et complexité",
        "Introduction aux énergies renouvelables",
        "Les principes de la cybersécurité",
        "Informatique quantique et ses applications"
    ]
};

// Fonction pour obtenir un sujet aléatoire
function getRandomSubject() {
    const categories = Object.keys(randomSubjects);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const subjects = randomSubjects[randomCategory];
    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
    
    return {
        subject: randomSubject,
        category: randomCategory
    };
}

// Fonction pour générer un sujet aléatoire avec animation
function generateRandomSubject() {
    const randomBtn = document.getElementById('randomSubjectBtn');
    const subjectTextarea = document.getElementById('subject');
    
    // Désactiver le bouton et ajouter l'animation
    randomBtn.disabled = true;
    randomBtn.classList.add('spinning');
    
    // Simuler un délai pour l'effet visuel
    setTimeout(() => {
        const randomData = getRandomSubject();
        
        // Effet de typing pour remplir le textarea
        typewriterEffect(subjectTextarea, randomData.subject, () => {
            // Réactiver le bouton
            randomBtn.disabled = false;
            randomBtn.classList.remove('spinning');
            
            // Afficher une notification avec la catégorie
            showNotification(`Sujet aléatoire généré (${randomData.category})`, 'success');
        });
        
    }, 800);
}

// Effet de machine à écrire pour le textarea
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

// Modifier la fonction initializeApp pour ajouter l'event listener
function initializeAppWithRandomSubject() {
    // Tous vos event listeners existants...
    document.getElementById('generateBtn').addEventListener('click', generateCourse);
    document.getElementById('generateQuiz').addEventListener('click', generateQuiz);
    document.getElementById('copyContent').addEventListener('click', copyContent);
    document.getElementById('exportPdf').addEventListener('click', exportPdf);
    document.getElementById('exportDocx').addEventListener('click', exportDocx);
    
    // Nouveau event listener pour le bouton sujet aléatoire
    document.getElementById('randomSubjectBtn').addEventListener('click', generateRandomSubject);
    
    // Chat interface
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');
    
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            askQuestion();
        }
    });
    
    chatSendBtn.addEventListener('click', askQuestion);

    // Auto-resize chat input
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 120) + 'px';
    });

    // Setup form controls
    setupFormControls();
}

// Fonction pour ajouter plus de sujets à une catégorie (utile pour l'expansion)
function addSubjectsToCategory(category, newSubjects) {
    if (randomSubjects[category]) {
        randomSubjects[category].push(...newSubjects);
    } else {
        randomSubjects[category] = newSubjects;
    }
}

// Fonction pour obtenir des statistiques sur les sujets
function getSubjectsStats() {
    const stats = {};
    let total = 0;
    
    for (const [category, subjects] of Object.entries(randomSubjects)) {
        stats[category] = subjects.length;
        total += subjects.length;
    }
    
    stats.total = total;
    return stats;
}

// Nouvelle fonction pour créer des messages améliorés
function createEnhancedMessageElement(content, type, metadata = {}) {
    const div = document.createElement('div');
    div.className = `chat-message ${type}`;
    
    let messageHTML = `<div class="message-content">${content}</div>`;
    
    // Ajouter des métadonnées visuelles
    if (metadata.questionType || metadata.level) {
        const badges = [];
        
        if (metadata.questionType === 'course-related') {
            badges.push('<span class="message-badge course-badge">📚 Cours</span>');
        } else if (metadata.questionType === 'general') {
            badges.push('<span class="message-badge general-badge">🌐 Général</span>');
        }
        
        if (metadata.level) {
            const levelLabels = {
                beginner: '🟢 Débutant',
                intermediate: '🟡 Intermédiaire', 
                expert: '🔴 Expert',
                hybrid: '🟣 Hybride',
                hybridExpert: '🔴 Hybride Expert'
            };
            
            const badgeClass = metadata.level === 'hybridExpert' ? 'hybrid-expert-badge' : 'level-badge';
            badges.push(`<span class="message-badge ${badgeClass}">${levelLabels[metadata.level]}</span>`);
        }
        
        if (badges.length > 0) {
            messageHTML += `<div class="message-badges">${badges.join('')}</div>`;
        }
    }
    
    div.innerHTML = messageHTML;
    return div;
}

// Ajoutez cette fonction pour mettre à jour l'attribut data-level du chat
function updateChatLevelIndicator() {
    const chatInterface = document.querySelector('.chat-interface');
    const selectedLevel = document.querySelector('input[name="level"]:checked')?.value;
    
    if (chatInterface && selectedLevel) {
        chatInterface.setAttribute('data-level', selectedLevel);
    }
}

// Fonction pour suggérer des questions de suivi
async function suggestFollowUpQuestions() {
    if (!currentCourse) return;

    try {
        const selectedLevel = document.querySelector('input[name="level"]:checked')?.value || 'intermediate';
        
        const response = await fetch(`${API_BASE_URL}/suggest-questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                courseContent: currentCourse.content,
                level: selectedLevel
            })
        });

        const data = await response.json();

        if (data.success) {
            const suggestionsElement = createSuggestionsElement(data.suggestions);
            appendToChat(suggestionsElement);
        }
    } catch (error) {
        console.error('Erreur suggestions:', error);
    }
}

// Créer un élément de suggestions
function createSuggestionsElement(suggestions) {
    const div = document.createElement('div');
    div.className = 'chat-message suggestions';
    
    let suggestionsHTML = `
        <div class="message-content">
            <strong>💡 Questions suggérées sur le thème de ce cours:</strong>
            <div class="suggestion-buttons">
    `;
    
    suggestions.forEach(suggestion => {
        suggestionsHTML += `
            <button class="suggestion-btn" onclick="askSuggestedQuestion('${suggestion.replace(/'/g, "\\'")}')">
                ${suggestion}
            </button>
        `;
    });
    
    suggestionsHTML += `
            </div>
        </div>
    `;
    
    div.innerHTML = suggestionsHTML;
    return div;
}

// Fonction pour poser une question suggérée
function askSuggestedQuestion(question) {
    const chatInput = document.getElementById('chatInput');
    chatInput.value = question;
    askQuestion();
}

// Fonction pour obtenir un message d'erreur intelligent
function getIntelligentErrorMessage(errorMessage) {
    const errorMessages = {
        'fetch': 'Problème de connexion. Vérifiez votre connexion internet.',
        'timeout': 'La réponse prend trop de temps. Essayez une question plus simple.',
        'rate limit': 'Trop de questions à la fois. Attendez quelques secondes.',
        'default': 'Désolé, je n\'ai pas pu répondre à votre question. Essayez de la reformuler.'
    };
    
    for (const [key, message] of Object.entries(errorMessages)) {
        if (errorMessage.toLowerCase().includes(key)) {
            return message;
        }
    }
    
    return errorMessages.default;
}

// Fonction pour effacer l'historique du chat
function clearChatHistory() {
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML = '';
    chatMessages.style.display = 'none';
    showNotification('Historique du chat effacé', 'success');
}

// Ajouter un bouton pour effacer le chat (à ajouter dans votre HTML)
function addClearChatButton() {
    const chatInterface = document.querySelector('.chat-interface');
    if (chatInterface && !document.getElementById('clearChatBtn')) {
        const clearButton = document.createElement('button');
        clearButton.id = 'clearChatBtn';
        clearButton.className = 'clear-chat-btn';
        clearButton.innerHTML = '<i data-lucide="trash-2"></i> Effacer';
        clearButton.onclick = clearChatHistory;
        
        const chatInputContainer = document.querySelector('.chat-input-container');
        chatInputContainer.appendChild(clearButton);
    }
}

// Fonction pour fermer le quiz
function closeQuiz() {
    const quizSection = document.getElementById('quizSection');
    if (quizSection) {
        quizSection.style.display = 'none';
        quizSection.innerHTML = '';
        showNotification('Quiz fermé', 'success');
    }
}

// Fonction pour recommencer le quiz
async function resetQuiz() {
    if (!currentCourse) {
        showNotification('Aucun cours disponible pour générer un quiz', 'error');
        return;
    }
    
    // Désactiver le bouton et montrer l'état de chargement
    const resetBtn = document.getElementById('resetQuizBtn');
    if (resetBtn) {
        resetBtn.disabled = true;
        resetBtn.innerHTML = '<div class="loading-spinner"></div>Génération...';
    }
    
    // Afficher l'état de chargement dans le quiz section
    const quizSection = document.getElementById('quizSection');
    if (quizSection) {
        quizSection.innerHTML = `
            <div class="quiz-container">
                <div class="quiz-header">
                    <h3>📝 Génération d'un nouveau quiz...</h3>
                </div>
                <div class="loading" style="padding: 40px; text-align: center;">
                    <div class="loading-spinner"></div>
                    Création de nouvelles questions...
                </div>
            </div>
        `;
        quizSection.style.display = 'block';
    }

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
            showNotification('Nouveau quiz généré avec succès !', 'success');
        } else {
            throw new Error(data.error || 'Erreur lors de la génération du quiz');
        }

    } catch (error) {
        console.error('Erreur:', error);
        showNotification('Erreur lors de la génération du nouveau quiz: ' + error.message, 'error');
        
        // En cas d'erreur, fermer le quiz
        closeQuiz();
    }
}

// === GESTION DES JAUGES - CORRECTION ===
const detailLevels = {
    1: { name: 'Synthèse', description: 'Cours concis avec les points essentiels.' },
    2: { name: 'Détaillé', description: 'Cours complet avec explications approfondies.' },
    3: { name: 'Exhaustif', description: 'Analyse très complète avec références.' }
};

// CORRECTION : Inverser l'ordre pour correspondre à l'interface HTML
const vulgarizationLevels = {
    1: { name: 'Grand Public', description: 'Comme expliquer à votre grand-mère' },
    2: { name: 'Éclairé', description: 'Niveau bac scientifique' },
    3: { name: 'Connaisseur', description: 'Niveau université' },
    4: { name: 'Expert', description: 'Vocabulaire technique assumé' }
};

// CORRECTION : Ajuster les combinaisons avec les nouveaux ordres
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
    
    document.getElementById('detailValue').textContent = level.name;
    document.getElementById('detailDescription').innerHTML = 
        `<strong>${level.name} :</strong> ${level.description}`;
    
    const percentage = ((value - 1) / 2) * 100;
    document.getElementById('detailTrack').style.width = `${percentage}%`;
    
    updateCombination();
}

function updateVulgarizationGauge() {
    const slider = document.getElementById('vulgarizationSlider');
    const value = parseInt(slider.value);
    const level = vulgarizationLevels[value];
    
    document.getElementById('vulgarizationValue').textContent = level.name;
    document.getElementById('vulgarizationDescription').innerHTML = 
        `<strong>${level.name} :</strong> ${level.description}`;
    
    const percentage = ((value - 1) / 3) * 100;
    document.getElementById('vulgarizationTrack').style.width = `${percentage}%`;
    
    updateCombination();
}

function updateCombination() {
    const detailVal = document.getElementById('detailSlider').value;
    const vulgarVal = document.getElementById('vulgarizationSlider').value;
    const key = `${detailVal}-${vulgarVal}`;
    
    const combination = combinations[key] || { 
        icon: '⚙️', 
        text: `Configuration personnalisée (Détail: ${detailLevels[detailVal].name}, Vulgarisation: ${vulgarizationLevels[vulgarVal].name})` 
    };
    
    document.querySelector('.combination-icon').textContent = combination.icon;
    document.getElementById('combinationText').textContent = combination.text;
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

// Fonctions globales pour l'accès depuis HTML
window.loadCourseFromHistory = loadCourseFromHistory;
window.resetQuiz = resetQuiz;
window.closeQuiz = closeQuiz;
window.askSuggestedQuestion = askSuggestedQuestion;
window.clearChatHistory = clearChatHistory;

// S'assurer que les fonctions sont bien attachées aux événements
document.addEventListener('DOMContentLoaded', function() {
    // Les fonctions sont déjà dans le scope global via window
});
