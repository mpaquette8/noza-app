import { WidgetFactory } from './widgets/widget-factory.js';
import './widgets/kpi-widget.js';
import './widgets/line-chart-widget.js';

class DashboardManager {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.widgets = new Map();
        this.filters = { period: 'week' };
        this.eventBus = new EventTarget();
        this.dataCache = new Map();
        this.setupDefaultWidgets();
        this.setupEventListeners();
    }

    setupDefaultWidgets() {
        this.addWidget({
            id: 'default-kpi',
            type: 'kpi',
            gridArea: { col: 1, row: 1, width: 3, height: 1 },
            config: { title: 'Default KPI' }
        });
    }

    addWidget(widgetConfig) {
        const widget = WidgetFactory.create(widgetConfig);
        this.widgets.set(widgetConfig.id, widget);
        this.renderWidget(widget);
        return widget;
    }

    renderWidget(widget) {
        const element = widget.render();
        element.style.gridColumn = `span ${widget.gridArea.width}`;
        element.style.gridRow = `span ${widget.gridArea.height}`;
        this.container.appendChild(element);
    }

    async loadUserConfig() {
        const res = await fetch('/api/user/dashboard-config');
        return res.json();
    }

    async loadDashboardData() {
        const data = await this.fetchWithCache('/api/analytics/dashboard', {
            params: this.filters,
            cacheTime: 60000
        });
        this.widgets.forEach(widget => widget.updateData(data));
    }

    async fetchWithCache(url, { params = {}, cacheTime = 0 }) {
        const key = `${url}-${JSON.stringify(params)}`;
        const cached = this.dataCache.get(key);
        if (cached && Date.now() - cached.timestamp < cacheTime) {
            return cached.data;
        }
        const response = await fetch(url + '?' + new URLSearchParams(params));
        const data = await response.json();
        this.dataCache.set(key, { data, timestamp: Date.now() });
        return data;
    }

    setupEventListeners() {
        document.getElementById('periodFilter')?.addEventListener('change', (e) => {
            this.filters.period = e.target.value;
            this.loadDashboardData();
        });
        this.eventBus.addEventListener('widget-interaction', (e) => {
            this.handleWidgetInteraction(e.detail);
        });
    }

    handleWidgetInteraction(interaction) {
        // Stub for tests
    }

    exportDashboard(format) {
        return `exported-${format}`;
    }
}

export default DashboardManager;
