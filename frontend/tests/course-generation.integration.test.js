const test = require('node:test');
const assert = require('node:assert/strict');

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
    value: '',
    disabled: false,
    style: {},
    eventListeners: {},
    addEventListener(type, cb) { (this.eventListeners[type] ||= []).push(cb); },
    dispatchEvent(evt) { (this.eventListeners[evt.type] || []).forEach(cb => cb(evt)); }
  };
}

test('course generation triggered from decryptage controls', async () => {
  let calledWith = null;

  const subjectInput = createElement();
  subjectInput.value = 'Quantum Mechanics';

  const generateBtn = createElement();

  global.document = {
    getElementById(id) {
      if (id === 'subject') return subjectInput;
      if (id === 'generateBtn') return generateBtn;
      return null;
    },
    querySelector(selector) {
      if (selector === '.decryptage-controls #generateBtn') return generateBtn;
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener() {},
    body: { appendChild() {} }
  };
  global.window = { location: { origin: '' } };
  global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };

  const { VULGARIZATION_LABELS, TEACHER_TYPE_LABELS } = await import('../app/assets/js/course-manager.js');

  global.configManager = {
    getConfig() { return { vulgarization: 'expert', duration: 'long', teacher_type: 'synthetic' }; },
    enableQuizCard() {}
  };

  global.courseManager = {
    async generateCourse(subject, vulgarization, duration, teacher_type) {
      calledWith = { subject, vulgarization, duration, teacher_type };
      return {};
    }
  };

  global.utils = { initializeLucide() {} };

  async function handleGenerateCourse() {
      const subject = document.getElementById('subject').value.trim();
      const { vulgarization, duration, teacher_type } = configManager.getConfig();
      await courseManager.generateCourse(subject, vulgarization, duration, teacher_type);
      utils.initializeLucide();
  }

  const btn = document.querySelector('.decryptage-controls #generateBtn');
  btn.addEventListener('click', handleGenerateCourse);
  btn.dispatchEvent({ type: 'click' });

  assert.deepStrictEqual(calledWith, {
    subject: 'Quantum Mechanics',
    vulgarization: 'expert',
    duration: 'long',
    teacher_type: 'synthetic'
  });
  assert.strictEqual(VULGARIZATION_LABELS[calledWith.vulgarization], 'Expert');
  assert.strictEqual(TEACHER_TYPE_LABELS[calledWith.teacher_type], 'Synthétique');
});
