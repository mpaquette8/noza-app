// frontend/assets/js/main.js - Point d'entrée principal

import { utils, API_BASE_URL } from './utils/utils.js';
import { authManager } from './auth.js';
import { courseManager, VULGARIZATION_LABELS, DURATION_LABELS, getTeacherTypeLabel } from './course-manager.js';

// État global de l'application
let currentCourse = null;
let currentQuiz = null;
let quizState = { answered: 0, correct: 0 };
let currentOnDemandQuiz = null;


// Initialisation de l'application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation Hermès App');

    // L'initialisation de l'interface est désormais gérée dans index.html
    // pour permettre la vérification d'authentification avant chargement.
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
    setupFormControls();
}

function setupEventListeners() {
    // Boutons principaux
    const generateBtn = document.getElementById('generateBtn');
    const generateQuiz = document.getElementById('generateQuiz');
    const copyContent = document.getElementById('copyContent');
    const randomQuizSubjectBtn = document.getElementById('randomQuizSubjectBtn');

    if (generateBtn) generateBtn.addEventListener('click', handleGenerateCourse);
    if (generateQuiz) generateQuiz.addEventListener('click', handleGenerateQuiz);
    if (copyContent) copyContent.addEventListener('click', () => courseManager && courseManager.copyContent());
    document.getElementById('randomSubjectBtn')?.addEventListener('click', generateRandomSubject);
    if (randomQuizSubjectBtn) randomQuizSubjectBtn.addEventListener('click', generateRandomQuizSubject);
    const generateOnDemandQuiz = document.getElementById('generateOnDemandQuiz');
    if (generateOnDemandQuiz) {
        generateOnDemandQuiz.addEventListener('click', handleGenerateOnDemandQuiz);
    }


    // Chat
    setupChatEventListeners();
}

// Gestionnaires d'événements principaux
async function handleGenerateCourse() {
    const subject = document.getElementById('subject').value.trim();
    const subjectLength = subject.length;
    const { teacher_type, intensity } = collectFormParameters();

    if (!subject) {
        utils.handleAuthError('Veuillez entrer un sujet pour le décryptage');
        return;
    }

    try {
        if (courseManager) {
            const course = await courseManager.generateCourse(
                subject,
                undefined,
                undefined,
                teacher_type,
                intensity
            );
            if (course) {
                currentCourse = course;
                const vulgarizationLabel = VULGARIZATION_LABELS[course.vulgarization] || course.vulgarization;
                const durationLabel = DURATION_LABELS[course.duration] || course.duration;
                const teacherTypeLabel = getTeacherTypeLabel(course.teacher_type);
                displayCourseMetadata(vulgarizationLabel, durationLabel, teacherTypeLabel);
                if (typeof configManager !== 'undefined') {
                    configManager.enableQuizCard();
                }

                if (typeof gtag === 'function') {
                    gtag('event', 'course_generation', {
                        intensity,
                        vulgarization: course.vulgarization,
                        duration: course.duration,
                        teacher_type,
                        subject_length: subjectLength
                    });
                }
            }
        }
    } finally {
        utils.initializeLucide();
    }
}

function displayCourseMetadata(vulgarization, duration, teacherType) {
    const container = document.getElementById('generatedCourse');
    if (!container) return;

    const badgesContainer = document.createElement('div');
    badgesContainer.className = 'message-badges';
    badgesContainer.innerHTML = `
        <span class="message-badge course-badge">${vulgarization}</span>
        <span class="message-badge general-badge">${duration}</span>
        <span class="message-badge level-badge">${teacherType}</span>
    `;

    const existing = container.querySelector('.message-badges');
    if (existing) {
        existing.remove();
    }

    container.prepend(badgesContainer);
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

function addChatMessage(text, type) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return null;

    const message = document.createElement('div');
    message.className = `chat-message ${type}`;
    message.textContent = text;
    chatMessages.appendChild(message);
    chatMessages.style.display = 'block';
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return message;
}

async function askQuestion() {
    const chatInput = document.getElementById('chatInput');
    const question = utils.sanitizeInput(chatInput.value, 2000);

    if (!question) {
        utils.handleAuthError('Veuillez saisir une question');
        return;
    }

    addChatMessage(question, 'user');

    const typingMessage = addChatMessage('...', 'assistant typing');

    try {
        const response = await fetch(`${API_BASE_URL}/ai/ask-question`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authManager.getAuthHeaders()
            },
            body: JSON.stringify({
                question,
                courseContent: currentCourse?.content
            })
        });

        const data = await response.json();
        if (data.success && data.answer) {
            addChatMessage(data.answer, 'assistant');
        } else {
            addChatMessage(data.error || 'Erreur lors de la récupération de la réponse.', 'error');
        }
    } catch (error) {
        console.error('Erreur chat:', error);
        addChatMessage('Une erreur est survenue lors de l\'appel.', 'error');
    } finally {
        if (typingMessage) typingMessage.remove();
        chatInput.value = '';
    }
}

function collectFormParameters() {
    const teacherType = document.querySelector('[data-type="teacher_type"].active')?.dataset.value || 'calculator';

    return {
        teacher_type: teacherType,
        intensity: 'balanced' // Valeur par défaut fixe
    };
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

    if (tabName === 'quiz-on-demand') {
        showQuizOnDemandSection();
    }
}

// Générer et afficher un quiz
async function handleGenerateQuiz() {
    if (!courseManager || !courseManager.currentCourse) {
        utils.handleAuthError("Veuillez d'abord générer un cours");
        return;
    }

    try {
        const quiz = await courseManager.generateQuiz();
        if (quiz) {
            currentQuiz = quiz;
            displayQuiz(quiz);
        }
    } finally {
        utils.initializeLucide();
    }
}

function displayQuiz(quiz, containerId = 'quizSection') {
    const quizSection = document.getElementById(containerId);
    if (!quizSection) return;

    quizState = { answered: 0, correct: 0 };

    const questionsHtml = quiz.questions.map((q, qi) => {
        const optionsHtml = q.options.map((opt, oi) => `
            <button class="quiz-option" data-question-index="${qi}" data-option-index="${oi}">
                <span class="option-letter">${String.fromCharCode(65 + oi)}.</span>${opt}
            </button>
        `).join('');

        return `
            <div class="quiz-question" data-question-index="${qi}">
                <h4><span class="question-number">${qi + 1}.</span>${q.question}</h4>
                <div class="quiz-options">${optionsHtml}</div>
                <div class="quiz-explanation" style="display:none;"></div>
            </div>
        `;
    }).join('');

    quizSection.innerHTML = `
        <div class="quiz-header"><h3><i data-lucide="help-circle"></i> Quiz</h3></div>
        ${questionsHtml}
        <div class="quiz-score" id="quizScore" style="display:none;">
            <div class="score-icon">🎉</div>
            <h3></h3>
        </div>
    `;
    quizSection.style.display = 'block';

    quizSection.querySelectorAll('.quiz-option').forEach(btn => {
        btn.addEventListener('click', () => handleQuizAnswer(btn));
    });

    utils.initializeLucide();
}

function handleQuizAnswer(btn) {
    const questionIndex = parseInt(btn.dataset.questionIndex);
    const optionIndex = parseInt(btn.dataset.optionIndex);
    const question = currentQuiz.questions[questionIndex];
    const questionEl = btn.closest('.quiz-question');

    if (!questionEl || questionEl.classList.contains('question-revealed')) return;

    questionEl.querySelectorAll('.quiz-option').forEach(opt => {
        opt.style.pointerEvents = 'none';
        if (parseInt(opt.dataset.optionIndex) === question.correct) {
            opt.classList.add('correct');
        }
    });

    if (optionIndex === question.correct) {
        questionEl.classList.add('question-revealed', 'question-correct');
        quizState.correct++;
    } else {
        btn.classList.add('incorrect');
        questionEl.classList.add('question-revealed', 'question-incorrect');
    }

    const explanationEl = questionEl.querySelector('.quiz-explanation');
    if (explanationEl) {
        explanationEl.innerHTML = `
            <div class="explanation-header"><strong>Explication :</strong></div>
            <div class="explanation-content">Réponse correcte : <span class="correct-answer">${String.fromCharCode(65 + question.correct)}</span><br>${question.explanation}</div>
        `;
        explanationEl.style.display = 'block';
    }

    quizState.answered++;
    if (quizState.answered === currentQuiz.questions.length) {
        showQuizScore();
    }
}

function showQuizScore() {
    const scoreEl = document.getElementById('quizScore');
    if (!scoreEl) return;

    const total = currentQuiz.questions.length;
    const percentage = Math.round((quizState.correct / total) * 100);
    let icon = '🎉';
    if (percentage < 50) {
        icon = '🤔';
    } else if (percentage < 80) {
        icon = '👏';
    }

    scoreEl.querySelector('.score-icon').textContent = icon;
    scoreEl.querySelector('h3').textContent = `Score : ${quizState.correct}/${total}`;
    scoreEl.style.display = 'block';
    scoreEl.classList.add('score-animated');
}

async function generateRandomSubject() {
    const randomBtn = document.getElementById('randomSubjectBtn');
    const subjectTextarea = document.getElementById('subject');
    
    if (!randomBtn || !subjectTextarea) return;
    
    // Désactiver le bouton et ajouter l'animation
    randomBtn.disabled = true;
    randomBtn.classList.add('spinning');
    randomBtn.innerHTML = '<i data-lucide="sparkles"></i> Génération... <i data-lucide="dice-6"></i>';
    
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
                randomBtn.innerHTML = '<i data-lucide="sparkles"></i> Générer un sujet aléatoire <i data-lucide="dice-6"></i>';
                
                // Afficher une notification avec la catégorie
                utils.showNotification(`Sujet aléatoire généré (${data.category})`, 'success');
                utils.initializeLucide();
            });
        } else {
            throw new Error(data.error || 'Erreur lors de la génération');
        }
    } catch (error) {
        console.error('Erreur:', error);
        utils.handleAuthError('Erreur lors de la génération du sujet: ' + error.message, true);
        
        // Réactiver le bouton en cas d'erreur
        randomBtn.disabled = false;
        randomBtn.classList.remove('spinning');
        randomBtn.innerHTML = '<i data-lucide="sparkles"></i> Générer un sujet aléatoire <i data-lucide="dice-6"></i>';
        utils.initializeLucide();
    }
}

async function generateRandomQuizSubject() {
    const randomBtn = document.getElementById('randomQuizSubjectBtn');
    const subjectInput = document.getElementById('quizSubject');

    if (!randomBtn || !subjectInput) return;

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
            typewriterEffect(subjectInput, data.subject, () => {
                randomBtn.disabled = false;
                randomBtn.classList.remove('spinning');
                randomBtn.innerHTML = '<i data-lucide="sparkles"></i>Générer un sujet aléatoire <i data-lucide="dice-6"></i>';

                utils.showNotification(`Sujet aléatoire généré (${data.category})`, 'success');
                utils.initializeLucide();
            });
        } else {
            throw new Error(data.error || 'Erreur lors de la génération');
        }
    } catch (error) {
        console.error('Erreur:', error);
        utils.handleAuthError('Erreur lors de la génération du sujet: ' + error.message, true);

        randomBtn.disabled = false;
        randomBtn.classList.remove('spinning');
        randomBtn.innerHTML = '<i data-lucide="sparkles"></i>Générer un sujet aléatoire <i data-lucide="dice-6"></i>';
        utils.initializeLucide();
    }
}

function typewriterEffect(element, text, callback) {
    const isInput = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA';
    if (isInput) {
        element.value = '';
    } else {
        element.textContent = '';
    }
    let i = 0;

    function typeWriter() {
        if (i < text.length) {
            if (isInput) {
                element.value += text.charAt(i);
            } else {
                element.textContent += text.charAt(i);
            }
            i++;
            setTimeout(typeWriter, 30); // Vitesse de frappe
        } else if (callback) {
            callback();
        }
    }

    typeWriter();
}

function showQuizOnDemandSection() {
    const form = document.getElementById('quizOnDemandSection');
    const results = document.getElementById('quizOnDemandResults');
    if (form) form.style.display = 'block';
    if (results) results.style.display = 'none';
    const subjectInput = document.getElementById('quizSubject');
    if (subjectInput) subjectInput.focus();
    utils.initializeLucide();
}

function hideQuizOnDemandSection() {
    const form = document.getElementById('quizOnDemandSection');
    const results = document.getElementById('quizOnDemandResults');
    if (form) {
        form.style.display = 'none';
        const subjectInput = document.getElementById('quizSubject');
        if (subjectInput) subjectInput.value = '';
        const questionCount = document.getElementById('questionCount');
        if (questionCount) questionCount.selectedIndex = 0;
        const levelSelect = document.getElementById('quizLevel');
        if (levelSelect) levelSelect.value = 'intermediate';
    }
    if (results) results.style.display = 'block';
}

async function handleGenerateOnDemandQuiz() {
    const subjectInput = document.getElementById('quizSubject');
    const questionCountSelect = document.getElementById('questionCount');
    const subject = subjectInput ? subjectInput.value.trim() : '';
    const questionCount = questionCountSelect ? parseInt(questionCountSelect.value, 10) : 5;

    if (!subject) {
        utils.handleAuthError('Veuillez entrer un sujet pour le quiz');
        return;
    }

    utils.showLoading(['generateOnDemandQuiz']);

    try {
        const levelSelect = document.getElementById('quizLevel');
        const level = levelSelect ? levelSelect.value : 'intermediate';
        const response = await fetch(`${API_BASE_URL}/ai/generate-ondemand-quiz`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...authManager.getAuthHeaders()
            },
            body: JSON.stringify({ subject, level, questionCount })
        });

        const data = await response.json();

        if (data.success && data.quiz) {
            const quiz = data.quiz;
            currentOnDemandQuiz = quiz;
            currentQuiz = quiz;
            hideQuizOnDemandSection();
            displayQuiz(quiz, 'quizOnDemandResults');
            const resultSection = document.getElementById('quizOnDemandResults');
            if (resultSection) {
                resultSection.scrollIntoView({ behavior: 'smooth' });
            }
        } else {
            utils.handleAuthError(data.error || 'Erreur lors de la génération du quiz', true);
        }
    } catch (error) {
        console.error('Erreur:', error);
        utils.handleAuthError('Erreur lors de la génération du quiz: ' + error.message, true);
    } finally {
        utils.hideLoading(['generateOnDemandQuiz']);
        utils.initializeLucide();
    }
}

// Exposer globalement
window.currentCourse = currentCourse;
window.handleGenerateCourse = handleGenerateCourse;
window.displayCourseMetadata = displayCourseMetadata;

// Exposer globalement pour index.html
window.initializeApp = initializeApp;
