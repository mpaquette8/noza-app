// frontend/assets/js/main.js - Point d'entrée principal

import { utils, API_BASE_URL } from './utils/utils.js';
import { authManager } from './auth.js';
import { courseManager, STYLE_LABELS, DURATION_LABELS, INTENT_LABELS } from './course-manager.js';

// État global de l'application
let currentCourse = null;
let currentQuiz = null;
let quizState = { answered: 0, correct: 0 };
let subjectValid = false;
let readyTriggered = false;

// Configuration par défaut pour les nouveaux sélecteurs
let currentConfig = {
    style: 'neutral',
    duration: 'short',
    intent: 'discover'
};

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

    if (!localStorage.getItem('onboardingSeen')) {
        showOnboardingTips();
    }

    console.log('✅ App initialisée');
});

function initializeApp() {
    // Configuration initiale de l'interface
    setupNewSelectors();
    setupFormControls();
}

function setupEventListeners() {
    // Boutons principaux
    const generateBtn = document.getElementById('generateBtn');
    const generateQuiz = document.getElementById('generateQuiz');
    const copyContent = document.getElementById('copyContent');
    const randomSubjectBtn = document.getElementById('randomSubjectBtn');
    const exampleTopics = document.querySelectorAll('.example-topic');
    const menuToggle = document.getElementById('menuToggle');
    const configPanel = document.querySelector('.configuration-panel');
    const headerNav = document.getElementById('headerNav');
    const closeConfigBtn = document.getElementById('closeConfigBtn');
    const subjectInput = document.getElementById('subject');

    if (subjectInput) {
        const feedback = document.createElement('div');
        feedback.id = 'subjectFeedback';
        subjectInput.parentNode?.insertAdjacentElement('afterend', feedback);
        subjectInput.addEventListener('input', () => {
            const value = subjectInput.value.trim();
            subjectValid = value.length > 0;
            feedback.textContent = subjectValid ? 'Super sujet, prêt à décrypter !' : 'Décrivez votre sujet ✍️';
            feedback.classList.toggle('valid', subjectValid);
            updateGenerateBtnState();
        });
    }

    if (generateBtn) generateBtn.addEventListener('click', handleGenerateCourse);
    if (generateQuiz) generateQuiz.addEventListener('click', handleGenerateQuiz);
    if (copyContent) copyContent.addEventListener('click', () => courseManager && courseManager.copyContent());
    if (randomSubjectBtn) randomSubjectBtn.addEventListener('click', generateRandomSubject);

    exampleTopics.forEach(btn => {
        btn.classList.add('pulse');
        btn.addEventListener('click', () => {
            const subjectField = document.getElementById('subject');
            if (subjectField) {
                subjectField.value = btn.dataset.subject || btn.textContent;
                subjectField.dispatchEvent(new Event('input'));
            }
        });
    });

    if (menuToggle) {
        const updateAria = () => {
            const expanded = headerNav && headerNav.classList.contains('open');
            menuToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        };
        updateAria();

        const toggleNavigation = () => {
            if (headerNav) headerNav.classList.toggle('open');
            if (configPanel) configPanel.classList.toggle('open');
            updateAria();
        };

        menuToggle.addEventListener('click', toggleNavigation);
        menuToggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleNavigation();
            }
        });

        if (closeConfigBtn) closeConfigBtn.addEventListener('click', toggleNavigation);
    }

    // Chat
    setupChatEventListeners();

    updateGenerateBtnState();
}

function updateGenerateBtnState() {
    const generateBtn = document.getElementById('generateBtn');
    if (!generateBtn) return;
    if (subjectValid) {
        generateBtn.classList.add('blink');
        if (!readyTriggered) {
            generateBtn.classList.add('ready');
            readyTriggered = true;
            setTimeout(() => generateBtn.classList.remove('ready'), 1000);
        }
    } else {
        generateBtn.classList.remove('blink');
        readyTriggered = false;
    }
}

function showOnboardingTips() {
    const steps = [
        {
            selector: '.example-topics',
            text: 'Choisissez un sujet ou utilisez un exemple ci-dessous',
            progress: 'Étape 1/3 : Choisissez votre sujet'
        },
        {
            selector: '.new-selector-container',
            text: "Personnalisez le style, la durée et l'intention",
            progress: 'Étape 2/3 : Paramétrez votre cours'
        },
        {
            selector: '#generateBtn',
            text: 'Cliquez ici pour générer votre cours',
            progress: 'Étape 3/3 : Décryptez votre sujet'
        }
    ];

    const style = document.createElement('style');
    style.textContent = `
        .onboarding-tip{position:absolute;background:#333;color:#fff;padding:8px 12px;border-radius:4px;z-index:1001;max-width:260px;}
        .onboarding-buttons{display:flex;gap:8px;margin-top:8px;}
        .onboarding-buttons button{background:#fff;color:#333;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;}
    `;
    document.head.appendChild(style);

    const tip = document.createElement('div');
    tip.className = 'onboarding-tip';
    document.body.appendChild(tip);

    let index = 0;

    const endOnboarding = () => {
        const highlighted = document.querySelector('.onboarding-highlight');
        if (highlighted) highlighted.classList.remove('onboarding-highlight');
        const progressBar = document.querySelector('.onboarding-progress-bar');
        if (progressBar) progressBar.style.width = '100%';
        const badges = document.querySelectorAll('.onboarding-step-badge');
        badges.forEach(b => b.classList.add('active'));
        tip.remove();
        const skipBtn = document.getElementById('skipTutorial');
        if (skipBtn) skipBtn.remove();
        localStorage.setItem('onboardingSeen', '1');
    };

    const showStep = () => {
        const previous = document.querySelector('.onboarding-highlight');
        if (previous) previous.classList.remove('onboarding-highlight');

        if (index >= steps.length) {
            endOnboarding();
            return;
        }

        const step = steps[index];
        const el = document.querySelector(step.selector);
        if (!el) {
            index++;
            showStep();
            return;
        }

        el.classList.add('onboarding-highlight');
        tip.innerHTML = `
            <div>${step.text}</div>
            <div class="onboarding-buttons">
                <button class="onboarding-prev">Précédent</button>
                <button class="onboarding-next">Suivant</button>
                <button class="onboarding-skip-step">Ignorer</button>
            </div>`;
        const rect = el.getBoundingClientRect();
        tip.style.top = `${rect.bottom + window.scrollY + 8}px`;
        tip.style.left = `${rect.left + window.scrollX}px`;

        const progressEl = document.getElementById('onboardingProgress');
        if (progressEl) progressEl.textContent = step.progress;

        const progressBar = document.querySelector('.onboarding-progress-bar');
        if (progressBar) progressBar.style.width = `${((index + 1) / steps.length) * 100}%`;

        const badges = document.querySelectorAll('.onboarding-step-badge');
        badges.forEach((badge, i) => {
            badge.classList.toggle('active', i <= index);
        });

        const prevBtn = tip.querySelector('.onboarding-prev');
        const nextBtn = tip.querySelector('.onboarding-next');
        const skipStepBtn = tip.querySelector('.onboarding-skip-step');
        if (prevBtn) {
            prevBtn.disabled = index === 0;
            prevBtn.addEventListener('click', () => {
                index = Math.max(0, index - 1);
                showStep();
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                index++;
                showStep();
            });
        }
        if (skipStepBtn) {
            skipStepBtn.addEventListener('click', () => {
                index++;
                showStep();
            });
        }
    };

    const skipTutorialBtn = document.getElementById('skipTutorial');
    if (skipTutorialBtn) {
        skipTutorialBtn.addEventListener('click', endOnboarding);
    }

    showStep();
}

// Gestionnaires d'événements principaux
async function handleGenerateCourse() {
    const subject = document.getElementById('subject').value.trim();
    const subjectLength = subject.length;
    const isLegacyPayload = !currentConfig.style && !currentConfig.duration && !currentConfig.intent;

    if (!subject) {
        utils.handleAuthError('Veuillez entrer un sujet pour le décryptage');
        return;
    }

    try {
        if (courseManager) {
            const course = await courseManager.generateCourse(
                subject,
                currentConfig.style,
                currentConfig.duration,
                currentConfig.intent
            );
            if (course) {
                currentCourse = course;
                const styleLabel = STYLE_LABELS[course.style] || course.style;
                const durationLabel = DURATION_LABELS[course.duration] || course.duration;
                const intentLabel = INTENT_LABELS[course.intent] || course.intent;
                displayCourseMetadata(styleLabel, durationLabel, intentLabel);

                if (typeof gtag === 'function') {
                    gtag('event', 'course_generation', {
                        style: currentConfig.style,
                        duration: currentConfig.duration,
                        intent: currentConfig.intent,
                        isLegacyPayload,
                        subject_length: subjectLength
                    });
                }
            }
        }
    } finally {
        utils.initializeLucide();
    }
}

function displayCourseMetadata(style, duration, intent) {
    const container = document.getElementById('generatedCourse');
    if (!container) return;

    const badgesContainer = document.createElement('div');
    badgesContainer.className = 'message-badges';
    badgesContainer.innerHTML = `
        <span class="message-badge course-badge">${style}</span>
        <span class="message-badge general-badge">${duration}</span>
        <span class="message-badge level-badge">${intent}</span>
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

// Gestion des nouveaux sélecteurs de configuration
function setupNewSelectors() {
    document.querySelectorAll('.selector-group').forEach(group => {
        group.classList.add('highlight');
    });

    document.querySelectorAll('.selector-group button').forEach(btn => {
        const type = btn.dataset.type;
        const value = btn.dataset.value;
        let label;
        if (type === 'style') label = STYLE_LABELS[value];
        else if (type === 'duration') label = DURATION_LABELS[value];
        else if (type === 'intent') label = INTENT_LABELS[value];
        if (label) btn.setAttribute('data-tooltip', label);
        btn.addEventListener('click', () => {
            updateSelection(type, value, btn);
        });
    });
}

function updateSelection(type, value, selectedBtn) {
    currentConfig[type] = value;
    document.querySelectorAll(`.selector-group button[data-type="${type}"]`).forEach(btn => {
        btn.classList.remove('active');
    });
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
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

function displayQuiz(quiz) {
    const quizSection = document.getElementById('quizSection');
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
        utils.handleAuthError('Erreur lors de la génération du sujet: ' + error.message, true);
        
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
window.displayCourseMetadata = displayCourseMetadata;
window.initializeApp = initializeApp;
window.showOnboardingTips = showOnboardingTips;
