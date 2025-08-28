const test = require('node:test');
const assert = require('node:assert');
const { VisualizationService } = require('../../src/services/visualizationService');

test('detecte les équations mathématiques', () => {
  const content = 'Les fonctions sin(x) et cos(x) représentent...';
  const results = VisualizationService.analyzeContentForVisualizations(content);

  const mathViz = results.find(r => r.type === 'math_graph');
  assert.ok(mathViz, 'Devrait détecter les équations mathématiques');
  assert.ok(mathViz.confidence >= 0.7, 'Confiance suffisante pour les maths');
});

test('detecte les séquences temporelles', () => {
  const content = 'En 1945, puis en 1969, et finalement en 2001, les événements...';
  const results = VisualizationService.analyzeContentForVisualizations(content);

  const timelineViz = results.find(r => r.type === 'timeline');
  assert.ok(timelineViz, 'Devrait détecter les séquences temporelles');
});

test('limite à 3 visualisations maximum', () => {
  const content = 'f(x) = x^2, en 1945 événement, 45% statistique, processus étape 1, géométrie triangle, compare données';
  const results = VisualizationService.analyzeContentForVisualizations(content);

  assert.ok(results.length <= 3, 'Maximum 3 visualisations par cours');
});

