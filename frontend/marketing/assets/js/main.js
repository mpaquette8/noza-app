// frontend/assets/js/main.js - Point d'entrée principal

import { utils } from './utils.js';

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Initialisation Hermès App');

    initializeApp();
    setupEventListeners();

    utils.initializeLucide();
    console.log('✅ App initialisée');
});

function initializeApp() {
    setupFormControls();
    initializeGauges();
}

function setupEventListeners() {
    const menuToggle = document.getElementById('menuToggle');
    const configPanel = document.querySelector('.configuration-container');
    const headerNav = document.getElementById('headerNav');
    const closeConfigBtn = document.getElementById('closeConfigBtn');

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
}

// Contrôle d'intensité pédagogique
const intensityLevels = {
    1: {
        name: 'Rapide & Simple',
        description: 'Cours concis et accessible, synthèse des points essentiels',
        vulgarization: 'general_public',
        duration: 'short'
    },
    2: {
        name: 'Équilibré',
        description: 'Cours complet avec bon équilibre accessibilité/profondeur',
        vulgarization: 'enlightened',
        duration: 'medium'
    },
    3: {
        name: 'Approfondi & Expert',
        description: 'Analyse détaillée avec vocabulaire technique et références',
        vulgarization: 'expert',
        duration: 'long'
    }
};

function updateIntensitySlider() {
    const slider = document.getElementById('intensitySlider');
    const value = parseInt(slider.value);
    const level = intensityLevels[value];

    const descEl = document.getElementById('intensityDescription');
    if (descEl) {
        descEl.innerHTML = `<strong>${level.name} :</strong> ${level.description}`;
    }

    document.querySelectorAll('.slider-label').forEach(label => {
        label.classList.remove('active');
    });
    const labels = document.querySelectorAll('.slider-label');
    if (labels[value - 1]) {
        labels[value - 1].classList.add('active');
    }

    window.currentIntensity = {
        vulgarization: level.vulgarization,
        duration: level.duration,
        level: value
    };
}

function initializeIntensitySlider() {
    const slider = document.getElementById('intensitySlider');
    if (slider) {
        slider.addEventListener('input', updateIntensitySlider);
        updateIntensitySlider();
    }
}

function initializeGauges() {
    initializeIntensitySlider();
}

function collectFormParameters() {
    const teacherType = document.querySelector('[data-type="teacher_type"].active')?.dataset.value || 'builder';
    const intensity = window.currentIntensity || intensityLevels[2];

    return {
        teacher_type: teacherType,
        intensity: intensity.level === 1 ? 'rapid_simple' : intensity.level === 2 ? 'balanced' : 'deep_expert',
        vulgarization: intensity.vulgarization,
        duration: intensity.duration
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
}
