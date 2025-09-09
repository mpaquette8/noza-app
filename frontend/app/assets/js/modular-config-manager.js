export class ModularConfigManager {
    constructor() {
        this.currentPreset = 'default';
        this.presets = {
            default: { vulgarization: 'general_public', duration: 'short', teacher_type: 'direct' },
            balanced: { vulgarization: 'enlightened', duration: 'medium', teacher_type: 'immersif' },
            expert: { vulgarization: 'expert', duration: 'long', teacher_type: 'structure' }
        };
        this.currentValues = { ...this.presets[this.currentPreset] };
    }

    init() {
        this.setupCardInteractions();
        this.setupPresets();
        this.setupCollapsibles();
    }

    getConfig() {
        return { ...this.currentValues };
    }

    // Attach listeners to advanced selector buttons
    setupCardInteractions() {
        const elements = document.querySelectorAll('.selector-group [data-type][data-value]');
        elements.forEach(el => {
            el.addEventListener('click', () => {
                const type = el.dataset.type;
                const value = el.dataset.value;
                this.currentValues[type] = value;
                this.currentPreset = 'custom';

                document.querySelectorAll(`.selector-group [data-type="${type}"]`).forEach(b => {
                    b.classList.remove('active');
                });
                el.classList.add('active');

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
                ['vulgarization', 'duration', 'teacher_type'].forEach(type => {
                    const val = values[type];
                    document.querySelectorAll(`.selector-group [data-type="${type}"]`).forEach(b => {
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

    enableQuizCard() {
        const generateQuizBtn = document.getElementById('generateQuiz');
        if (generateQuizBtn) {
            generateQuizBtn.disabled = false;
        }
    }
}

if (typeof window !== 'undefined') {
    window.ModularConfigManager = ModularConfigManager;
}
