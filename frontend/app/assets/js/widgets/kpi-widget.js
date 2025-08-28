import { BaseWidget, WidgetFactory } from './widget-factory.js';

class KPIWidget extends BaseWidget {
    constructor(config) {
        super(config);
        this.previousValue = null;
    }

    renderContent() {
        const body = this.element.querySelector('.widget-body');
        body.innerHTML = `
            <div class="kpi-content">
                <div class="kpi-icon">${this.config.icon || '📊'}</div>
                <div class="kpi-value" data-value="${this.data.value ?? 0}">${this.data.value ?? 0}</div>
                <div class="kpi-label">${this.config.title || ''}</div>
            </div>
        `;
    }
}

WidgetFactory.register('kpi', KPIWidget);

export default KPIWidget;
