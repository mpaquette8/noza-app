const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../app/assets/js/modular-config-manager.js');

function createElement({ className = '', dataset = {} } = {}) {
  return {
    dataset,
    classList: {
      classes: new Set(className.split(/\s+/).filter(Boolean)),
      add(cls) { this.classes.add(cls); },
      remove(cls) { this.classes.delete(cls); },
      toggle(cls, force) {
        if (force === undefined) {
          if (this.classes.has(cls)) this.classes.delete(cls); else this.classes.add(cls);
        } else {
          if (force) this.classes.add(cls); else this.classes.delete(cls);
        }
      },
      contains(cls) { return this.classes.has(cls); }
    },
    disabled: false,
    style: {},
    eventListeners: {},
    addEventListener(type, cb) { (this.eventListeners[type] ||= []).push(cb); },
    dispatchEvent(evt) { (this.eventListeners[evt.type] || []).forEach(cb => cb(evt)); }
  };
}

test('preset selection updates advanced controls', async () => {
  const presetDefault = createElement({ dataset: { preset: 'default' }, className: 'preset' });
  const presetExpert = createElement({ dataset: { preset: 'expert' }, className: 'preset' });
  const styleNeutral = createElement({ dataset: { type: 'style', value: 'neutral' } });
  const styleStory = createElement({ dataset: { type: 'style', value: 'storytelling' } });
  const durationShort = createElement({ dataset: { type: 'duration', value: 'short' } });
  const durationLong = createElement({ dataset: { type: 'duration', value: 'long' } });
  const intentDiscover = createElement({ dataset: { type: 'intent', value: 'discover' } });
  const intentMaster = createElement({ dataset: { type: 'intent', value: 'master' } });
  const allButtons = [styleNeutral, styleStory, durationShort, durationLong, intentDiscover, intentMaster];

  const statusEl = { textContent: '', style: {} };
  global.document = {
    querySelectorAll(selector) {
      if (selector === '.quick-config [data-preset]') return [presetDefault, presetExpert];
      if (selector === '.selector-group button') return allButtons;
      const typeMatch = selector.match(/\.selector-group button\[data-type="([^\"]+)"\]/);
      if (typeMatch) return allButtons.filter(b => b.dataset.type === typeMatch[1]);
      return [];
    },
    querySelector(selector) {
      if (selector === '[data-type="style"][data-value="storytelling"]') return styleStory;
      if (selector === '[data-type="duration"][data-value="long"]') return durationLong;
      if (selector === '[data-type="intent"][data-value="master"]') return intentMaster;
      if (selector === '.config-card.secondary-card') return null; // not used here
      return null;
    },
    getElementById(id) {
      return id === 'quizStatus' ? statusEl : null;
    }
  };
  global.window = { Event: class { constructor(type) { this.type = type; } } };

  const { ModularConfigManager } = await load();
  const manager = new ModularConfigManager();
  manager.init();

  presetExpert.dispatchEvent({ type: 'click' });

  assert.strictEqual(manager.currentPreset, 'expert');
  const cfg = manager.getConfig();
  assert.strictEqual(cfg.style, 'storytelling');
  assert.strictEqual(cfg.duration, 'long');
  assert.strictEqual(cfg.intent, 'master');
  assert.ok(styleStory.classList.contains('active'));
  assert.ok(durationLong.classList.contains('active'));
  assert.ok(intentMaster.classList.contains('active'));
});

test('quiz buttons reflect quiz availability', async () => {
  const generateQuizBtn = createElement();
  const openQuizBtn = createElement();
  const statusEl = { textContent: '', style: {} };

  global.document = {
    querySelectorAll() { return []; },
    querySelector() { return null; },
    getElementById(id) {
      if (id === 'generateQuiz') return generateQuizBtn;
      if (id === 'openQuizOnDemand') return openQuizBtn;
      if (id === 'quizStatus') return statusEl;
      return null;
    }
  };
  global.window = { Event: class { constructor(type) { this.type = type; } } };

  const { ModularConfigManager } = await load();
  const manager = new ModularConfigManager();
  manager.init();

  assert.ok(generateQuizBtn.disabled);
  assert.ok(!openQuizBtn.disabled);
  assert.strictEqual(statusEl.textContent, 'Seul le "Quiz du cours" requiert un cours généré');

  manager.enableQuizCard();
  assert.ok(!generateQuizBtn.disabled);
  assert.strictEqual(statusEl.textContent, 'Prêt');
});
