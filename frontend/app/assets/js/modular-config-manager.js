export class ModularConfigManager {
    constructor() {
        this.currentPreset = 'default';
        this.cardStates = { quizEnabled: false };
        this.presets = {
            default: { style: 'neutral', duration: 'short', intent: 'discover' },
            balanced: { style: 'pedagogical', duration: 'medium', intent: 'learn' },
            expert: { style: 'storytelling', duration: 'long', intent: 'master' }
        };
        this.currentValues = { ...this.presets[this.currentPreset] };
    }

    init() {
        this.setupCardInteractions();
        this.setupPresets();
        this.setupCollapsibles();
        this.updateQuizCardState();
    }

    getConfig() {
        return { ...this.currentValues };
    }

    // Attach listeners to advanced selector buttons
    setupCardInteractions() {
        const buttons = document.querySelectorAll('.selector-group button');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                const value = btn.dataset.value;
                this.currentValues[type] = value;
                this.currentPreset = 'custom';

                document.querySelectorAll(`.selector-group button[data-type="${type}"]`).forEach(b => {
                    b.classList.remove('active');
                });
                btn.classList.add('active');

                // Remove active state from preset buttons when custom value chosen
                document.querySelectorAll('.quick-config [data-preset]').forEach(p => p.classList.remove('active'));
            });
        });
    }

    // Setup quick preset buttons
    setupPresets() {
        const presetButtons = document.querySelectorAll('.quick-config [data-preset]');
        presetButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                const values = this.presets[preset];
                if (!values) return;

                this.currentPreset = preset;
                this.currentValues = { ...values };

                // Update advanced controls
                ['style', 'duration', 'intent'].forEach(type => {
                    const val = values[type];
                    document.querySelectorAll(`.selector-group button[data-type="${type}"]`).forEach(b => {
                        b.classList.toggle('active', b.dataset.value === val);
                    });
                });

                // Update preset visuals
                presetButtons.forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    // Simple collapsible handling
    setupCollapsibles() {
        document.querySelectorAll('.collapsible').forEach(el => {
            const icon = el.querySelector('.toggle-icon');
            el.addEventListener('click', () => {
                el.classList.toggle('open');
                if (icon) {
                    icon.style.transform = el.classList.contains('open') ? 'rotate(180deg)' : '';
                }
            });
        });
    }

    updateQuizCardState() {
        const quizCard = document.querySelector('.config-card.secondary-card');
        const statusEl = document.getElementById('quizStatus');
        if (!quizCard || !statusEl) return;

        const enabled = this.cardStates.quizEnabled;
        quizCard.classList.toggle('disabled', !enabled);
        quizCard.style.opacity = enabled ? '1' : '0.5';
        quizCard.querySelectorAll('button').forEach(btn => {
            btn.disabled = !enabled;
        });
        statusEl.textContent = enabled ? 'Prêt' : 'Disponible après génération';
        statusEl.style.color = enabled ? '#38a169' : '#718096';
    }

    enableQuizCard() {
        this.cardStates.quizEnabled = true;
        this.updateQuizCardState();
        const quizCard = document.querySelector('.config-card.secondary-card');
        if (quizCard) {
            quizCard.classList.add('activated');
            setTimeout(() => quizCard.classList.remove('activated'), 300);
        }
    }
}

if (typeof window !== 'undefined') {
    window.ModularConfigManager = ModularConfigManager;
}
