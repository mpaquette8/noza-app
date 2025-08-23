// frontend/assets/js/main.js - Point d'entrée principal

let utils;

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Initialisation Hermès App');

    const module = await import('./utils.js');
    utils = module.utils;

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
