const assert = require('node:assert');
const test = require('node:test');

global.Chart = class MockChart {
  constructor() { this.destroy = () => {}; }
};

test('génère les visualisations après détection', async () => {
  function createElement() {
    return {
      children: [],
      className: '',
      innerHTML: '',
      prepend(node) { this.children.unshift(node); },
      appendChild(node) { this.children.push(node); },
      after(node) { this.afterNode = node; },
      querySelector() { return null; },
      addEventListener() {}
    };
  }

  const courseContainer = createElement();
  const buttonStub = createElement();

  global.document = {
    createElement: () => createElement(),
    body: createElement(),
    addEventListener() {},
    getElementById(id) {
      if (id === 'generatedCourse') return courseContainer;
      if (id === 'generateVisualizationsBtn') return buttonStub;
      return null;
    },
    querySelector() { return null; }
  };

  global.window = { location: { origin: '' } };

  global.localStorage = {
    getItem() { return null; },
    setItem() {},
    removeItem() {}
  };

  const { courseManager } = await import('../app/assets/js/course-manager.js');

  global.fetch = async () => ({
    json: async () => ({
      success: true,
      visualizations: [{
        id: 'test123',
        type: 'math_graph',
        confidence: 0.8,
        data: { equations: ['x^2'], domain: { min: -5, max: 5 } }
      }]
    })
  });

  const mockCourse = {
    id: 'course123',
    content: 'La fonction f(x) = x^2 est une parabole...'
  };

  await courseManager.detectAndSuggestVisualizations(mockCourse);

  assert.ok(courseContainer.children[0].className.includes('visualization-suggestion'),
    'Devrait afficher la suggestion de visualisation');
});

