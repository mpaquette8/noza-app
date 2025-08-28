// Factory Pattern pour création de widgets
class WidgetFactory {
    static widgetTypes = new Map();

    static register(type, widgetClass) {
        this.widgetTypes.set(type, widgetClass);
    }

    static create(config) {
        const WidgetClass = this.widgetTypes.get(config.type);
        if (!WidgetClass) {
            throw new Error(`Widget type ${config.type} non reconnu`);
        }
        return new WidgetClass(config);
    }
}

// Classe de base pour tous les widgets
class BaseWidget {
    constructor(config) {
        this.id = config.id;
        this.type = config.type;
        this.config = config.config || {};
        this.gridArea = config.gridArea || { width: 1, height: 1 };
        this.element = null;
        this.data = null;
    }

    render() {
        this.element = document.createElement('div');
        this.element.className = `widget-card widget-${this.type}`;
        this.element.dataset.widgetId = this.id;
        this.element.innerHTML = `
            <div class="widget-header">
                <h3 class="widget-title">${this.config.title || ''}</h3>
                <div class="widget-actions">
                    <button class="widget-refresh" aria-label="Rafraîchir">↻</button>
                </div>
            </div>
            <div class="widget-body">
                <div class="widget-loading"><div class="spinner"></div></div>
            </div>
        `;
        this.setupEventListeners();
        return this.element;
    }

    setupEventListeners() {
        this.element.querySelector('.widget-refresh')?.addEventListener('click', () => {
            this.refresh();
        });
    }

    updateData(data) {
        this.data = data;
        this.hideLoader();
        this.renderContent();
    }

    renderContent() {
        // À implémenter par les sous-classes
    }

    showLoader() {
        const loader = this.element.querySelector('.widget-loading');
        if (loader) loader.style.display = 'flex';
    }

    hideLoader() {
        const loader = this.element.querySelector('.widget-loading');
        if (loader) loader.style.display = 'none';
    }

    refresh() {
        this.showLoader();
        this.emit('refresh-requested', { widgetId: this.id });
    }

    serialize() {
        return {
            id: this.id,
            type: this.type,
            config: this.config,
            gridArea: this.gridArea
        };
    }

    emit(event, detail) {
        this.element.dispatchEvent(new CustomEvent(event, { detail, bubbles: true }));
    }
}

export { WidgetFactory, BaseWidget };
