import { BaseWidget, WidgetFactory } from './widget-factory.js';

class LineChartWidget extends BaseWidget {
    constructor(config) {
        super(config);
        this.chart = null;
    }

    renderContent() {
        const body = this.element.querySelector('.widget-body');
        body.innerHTML = '<div class="chart-container"><canvas></canvas></div>';
    }
}

WidgetFactory.register('line-chart', LineChartWidget);

export default LineChartWidget;
