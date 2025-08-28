// frontend/app/assets/js/visualization-engine.js

// Moteur de visualisation avec Chart.js et SVG natif
class VisualizationEngine {
  constructor() {
    this.charts = new Map(); // Stockage des instances Chart.js
    this.loadChartJS();
  }

  // Charger Chart.js dynamiquement
  async loadChartJS() {
    if (window.Chart) return;

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js';
    script.onload = () => console.log('Chart.js chargé avec succès');
    document.head.appendChild(script);
  }

  // Point d'entrée principal - créer une visualisation
  createVisualization(vizData, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Conteneur ${containerId} introuvable`);
      return null;
    }

    switch (vizData.type) {
      case 'math_graph':
        return this.createMathGraph(vizData, container);
      case 'timeline':
        return this.createTimeline(vizData, container);
      case 'comparison_chart':
        return this.createComparisonChart(vizData, container);
      case 'flowchart':
        return this.createFlowchart(vizData, container);
      case 'statistics':
        return this.createStatisticsChart(vizData, container);
      case 'geometry_3d':
        return this.createGeometry3D(vizData, container);
      default:
        console.warn(`Type de visualisation non supporté: ${vizData.type}`);
        return null;
    }
  }

  // 1. Graphiques mathématiques
  createMathGraph(vizData, container) {
    const canvasId = `mathChart_${vizData.id}`;
    container.innerHTML = `
      <div class="visualization-container">
        <div class="viz-header">
          <h4>📊 Graphique de la fonction</h4>
          <div class="viz-controls">
            <button class="viz-btn" onclick="visualizationEngine.exportChart('${canvasId}')">
              <i data-lucide="download"></i> Export PNG
            </button>
          </div>
        </div>
        <canvas id="${canvasId}" width="400" height="300"></canvas>
      </div>
    `;

    const { equations, domain } = vizData.data;
    const points = this.generateMathPoints(equations[0] || 'x^2', domain.min, domain.max, 100);

    const ctx = document.getElementById(canvasId).getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: points.x,
        datasets: [{
          label: equations[0] || 'f(x)',
          data: points.y,
          borderColor: '#4299e1',
          backgroundColor: 'rgba(66, 153, 225, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: { title: { display: true, text: 'x' }},
          y: { title: { display: true, text: 'f(x)' }}
        }
      }
    });

    this.charts.set(canvasId, chart);
    return chart;
  }

  // 2. Timeline interactive
  createTimeline(vizData, container) {
    const { events } = vizData.data;
    container.innerHTML = `
      <div class="visualization-container">
        <div class="viz-header">
          <h4>🕐 Timeline Interactive</h4>
        </div>
        <div class="timeline-container">
          ${events.map((event, index) => `
            <div class="timeline-event ${event.category}" data-index="${index}">
              <div class="timeline-date">${event.year}</div>
              <div class="timeline-content">${event.description}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.querySelectorAll('.timeline-event').forEach(event => {
      event.addEventListener('click', () => {
        event.classList.toggle('expanded');
      });
    });

    return { type: 'timeline', events: events.length };
  }

  // 3. Graphiques de comparaison
  createComparisonChart(vizData, container) {
    const canvasId = `comparisonChart_${vizData.id}`;
    container.innerHTML = `
      <div class="visualization-container">
        <div class="viz-header">
          <h4>📊 Analyse Comparative</h4>
          <div class="viz-controls">
            <select id="chartType_${vizData.id}">
              <option value="bar">Barres</option>
              <option value="pie">Camembert</option>
              <option value="radar">Radar</option>
            </select>
          </div>
        </div>
        <canvas id="${canvasId}" width="400" height="300"></canvas>
      </div>
    `;

    const { categories, values } = vizData.data;
    this.renderComparisonChart(canvasId, 'bar', categories, values);

    document.getElementById(`chartType_${vizData.id}`).addEventListener('change', e => {
      this.renderComparisonChart(canvasId, e.target.value, categories, values);
    });

    return { type: 'comparison', dataPoints: values.length };
  }

  // 4. Schémas de processus (SVG)
  createFlowchart(vizData, container) {
    const steps = this.extractProcessSteps(vizData.content || '');
    const svgId = `flowchart_${vizData.id}`;

    container.innerHTML = `
      <div class="visualization-container">
        <div class="viz-header">
          <h4>🔄 Schéma du Processus</h4>
        </div>
        <svg id="${svgId}" width="100%" height="400" viewBox="0 0 800 400">
          ${this.generateFlowchartSVG(steps)}
        </svg>
      </div>
    `;

    return { type: 'flowchart', steps: steps.length };
  }

  // 5. Graphiques statistiques
  createStatisticsChart(vizData, container) {
    const canvasId = `statsChart_${vizData.id}`;
    container.innerHTML = `
      <div class="visualization-container">
        <div class="viz-header">
          <h4>📈 Analyse Statistique</h4>
        </div>
        <div class="stats-grid">
          <canvas id="${canvasId}" width="300" height="200"></canvas>
          <div class="stats-summary">
            <div class="stat-item">
              <span class="stat-label">Moyenne</span>
              <span class="stat-value" id="mean_${vizData.id}">--</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Médiane</span>
              <span class="stat-value" id="median_${vizData.id}">--</span>
            </div>
          </div>
        </div>
      </div>
    `;

    const sampleData = this.generateStatsSampleData();
    this.renderStatisticsChart(canvasId, sampleData);
    this.updateStatsDisplay(vizData.id, sampleData);

    return { type: 'statistics', sampleSize: sampleData.length };
  }

  // 6. Modèles géométriques 3D (SVG isométrique)
  createGeometry3D(vizData, container) {
    const canvasId = `geometry3d_${vizData.id}`;
    container.innerHTML = `
      <div class="visualization-container">
        <div class="viz-header">
          <h4>🎯 Modèle Géométrique</h4>
          <div class="viz-controls">
            <button onclick="visualizationEngine.rotate3D('${canvasId}', 'x')">↻ Rotation X</button>
            <button onclick="visualizationEngine.rotate3D('${canvasId}', 'y')">↻ Rotation Y</button>
          </div>
        </div>
        <div id="${canvasId}" class="geometry-canvas" style="width: 400px; height: 300px;"></div>
      </div>
    `;

    this.renderIsometricShape(canvasId, 'cube');
    return { type: 'geometry_3d', shape: 'cube' };
  }

  // UTILITAIRES DE RENDU

  generateMathPoints(equation, xMin, xMax, samples) {
    const x = [];
    const y = [];
    const step = (xMax - xMin) / samples;

    for (let i = 0; i <= samples; i++) {
      const xVal = xMin + i * step;
      x.push(xVal.toFixed(2));
      let yVal;
      try {
        if (equation.includes('x^2')) yVal = xVal * xVal;
        else if (equation.includes('sin')) yVal = Math.sin(xVal);
        else if (equation.includes('cos')) yVal = Math.cos(xVal);
        else if (equation.includes('log')) yVal = Math.log(Math.abs(xVal) + 1);
        else yVal = xVal;
      } catch {
        yVal = 0;
      }
      y.push(yVal);
    }
    return { x, y };
  }

  renderComparisonChart(canvasId, chartType, categories, values) {
    const existingChart = this.charts.get(canvasId);
    if (existingChart) existingChart.destroy();

    const ctx = document.getElementById(canvasId).getContext('2d');
    const colors = ['#4299e1', '#48bb78', '#ed8936', '#9f7aea', '#f56565'];

    const chart = new Chart(ctx, {
      type: chartType,
      data: {
        labels: categories,
        datasets: [{
          label: 'Valeurs',
          data: values,
          backgroundColor: colors.slice(0, values.length),
          borderColor: colors.slice(0, values.length),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: chartType === 'pie' }
        }
      }
    });

    this.charts.set(canvasId, chart);
  }

  generateFlowchartSVG(steps) {
    const stepWidth = 120;
    const stepHeight = 60;
    const spacing = 40;

    return steps
      .map((step, index) => {
        const x = 50 + index * (stepWidth + spacing);
        const y = 150;
        return `
        <g class="flowchart-step" data-step="${index}">
          <rect x="${x}" y="${y}" width="${stepWidth}" height="${stepHeight}" 
                fill="#f7fafc" stroke="#4299e1" stroke-width="2" rx="8"/>
          <text x="${x + stepWidth / 2}" y="${y + stepHeight / 2 + 5}" 
                text-anchor="middle" font-size="12" fill="#2d3748">
            ${step.substring(0, 15)}...
          </text>
          ${index < steps.length - 1 ? `
            <path d="M ${x + stepWidth} ${y + stepHeight / 2} L ${x + stepWidth + spacing} ${y + stepHeight / 2}" 
                  stroke="#4299e1" stroke-width="2" marker-end="url(#arrowhead)"/>
          ` : ''}
        </g>
        ${index === 0 ? `
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" 
                    refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#4299e1"/>
            </marker>
          </defs>
        ` : ''}`;
      })
      .join('');
  }

  exportChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (canvas) {
      const link = document.createElement('a');
      link.download = `visualization_${canvasId}.png`;
      link.href = canvas.toDataURL();
      link.click();
    }
  }

  extractProcessSteps(content) {
    return content.match(/(?:étape|phase)\s*\d+[^.!?]*/gi) || [];
  }

  generateStatsSampleData() {
    return Array.from({ length: 20 }, () => Math.floor(Math.random() * 100));
  }

  renderStatisticsChart(canvasId, data) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.map((_, i) => i + 1),
        datasets: [{
          label: 'Valeurs',
          data,
          backgroundColor: '#4299e1'
        }]
      }
    });
    this.charts.set(canvasId, chart);
  }

  updateStatsDisplay(id, data) {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;

    document.getElementById(`mean_${id}`).textContent = mean.toFixed(2);
    document.getElementById(`median_${id}`).textContent = median.toFixed(2);
  }

  renderIsometricShape(canvasId, shape) {
    const container = document.getElementById(canvasId);
    if (!container) return;
    container.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 200 200">
      <rect x="50" y="50" width="100" height="100" fill="#4299e1" opacity="0.7" />
    </svg>`;
  }

  rotate3D(canvasId, axis) {
    console.log('Rotate', canvasId, axis);
  }

  destroy() {
    this.charts.forEach(chart => chart.destroy());
    this.charts.clear();
  }
}

window.visualizationEngine = new VisualizationEngine();
export { VisualizationEngine };

