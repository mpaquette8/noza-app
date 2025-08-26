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
  const vulgarizationGeneral = createElement({ dataset: { type: 'vulgarization', value: 'general_public' } });
  const vulgarizationExpert = createElement({ dataset: { type: 'vulgarization', value: 'expert' } });
  const durationShort = createElement({ dataset: { type: 'duration', value: 'short' } });
  const durationLong = createElement({ dataset: { type: 'duration', value: 'long' } });
  const teacherBuilder = createElement({ dataset: { type: 'teacher_type', value: 'builder' } });
  const teacherLightning = createElement({ dataset: { type: 'teacher_type', value: 'lightning' } });
  const allButtons = [vulgarizationGeneral, vulgarizationExpert, durationShort, durationLong, teacherBuilder, teacherLightning];

  global.document = {
    querySelectorAll(selector) {
      const sel = selector.replace(/^\.decryptage-controls\s*/, '');
      if (sel === '.quick-config [data-preset]') return [presetDefault, presetExpert];
      if (sel === '.selector-group button') return allButtons;
      const typeMatch = sel.match(/\.selector-group button\[data-type="([^"]+)"\]/);
      if (typeMatch) return allButtons.filter(b => b.dataset.type === typeMatch[1]);
      return [];
    },
    querySelector(selector) {
      const sel = selector.replace(/^\.decryptage-controls\s*/, '');
      if (sel === '[data-type="vulgarization"][data-value="expert"]') return vulgarizationExpert;
      if (sel === '[data-type="duration"][data-value="long"]') return durationLong;
      if (sel === '[data-type="teacher_type"][data-value="lightning"]') return teacherLightning;
      return null;
    },
    getElementById() { return null; },
    addEventListener() {},
    body: { appendChild() {} }
  };
  global.window = { Event: class { constructor(type) { this.type = type; } }, location: { origin: '' } };
  global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };

  const { VULGARIZATION_LABELS, TEACHER_TYPE_LABELS } = await import('../app/assets/js/course-manager.js');
  const { ModularConfigManager } = await load();
  const manager = new ModularConfigManager();
  manager.init();

  presetExpert.dispatchEvent({ type: 'click' });

  assert.strictEqual(manager.currentPreset, 'expert');
  const cfg = manager.getConfig();
  assert.strictEqual(cfg.vulgarization, 'expert');
  assert.strictEqual(cfg.duration, 'long');
  assert.strictEqual(cfg.teacher_type, 'lightning');
  assert.ok(vulgarizationExpert.classList.contains('active'));
  assert.ok(durationLong.classList.contains('active'));
  assert.ok(teacherLightning.classList.contains('active'));
  assert.strictEqual(VULGARIZATION_LABELS[cfg.vulgarization], 'Expert');
  assert.strictEqual(TEACHER_TYPE_LABELS[cfg.teacher_type], '⚡ Prof Flash');
});

test('quiz button reflects quiz availability', async () => {
  const generateQuizBtn = createElement();
  generateQuizBtn.disabled = true;

  global.document = {
    querySelectorAll() { return []; },
    querySelector() { return null; },
    getElementById(id) {
      if (id === 'generateQuiz') return generateQuizBtn;
      return null;
    }
  };
  global.window = { Event: class { constructor(type) { this.type = type; } } };

  const { ModularConfigManager } = await load();
  const manager = new ModularConfigManager();
  manager.init();

  assert.ok(generateQuizBtn.disabled);

  manager.enableQuizCard();
  assert.ok(!generateQuizBtn.disabled);
});
