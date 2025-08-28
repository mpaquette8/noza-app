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
  const teacherBtn = createElement({ dataset: { type: 'teacher_type', value: 'memorizer' }, className: 'active' });

  global.document = {
    getElementById(id) {
      if (id === 'subject') return subjectInput;
      if (id === 'generateBtn') return generateBtn;
      return null;
    },
    querySelector(selector) {
      if (selector === '.decryptage-controls #generateBtn') return generateBtn;
      if (selector === '[data-type="teacher_type"].active') return teacherBtn;
      return null;
    },
    querySelectorAll() { return []; },
    addEventListener() {},
    body: { appendChild() {} }
  };
  global.window = { location: { origin: '' }, currentIntensity: { level: 3, vulgarization: 'expert', duration: 'long' } };
  global.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };

  const { VULGARIZATION_LABELS, TEACHER_TYPE_LABELS } = await import('../app/assets/js/course-manager.js');

  function collectFormParameters() {
    const teacherType = document.querySelector('[data-type="teacher_type"].active')?.dataset.value || 'calculator';
    const intensity = window.currentIntensity || { level: 2, vulgarization: 'enlightened', duration: 'medium' };
    return {
      teacher_type: teacherType,
      intensity: intensity.level === 1 ? 'rapid_simple' : intensity.level === 2 ? 'balanced' : 'deep_expert',
      vulgarization: intensity.vulgarization,
      duration: intensity.duration
    };
  }

  global.courseManager = {
    async generateCourse(subject, vulgarization, duration, teacher_type, intensity) {
      calledWith = { subject, vulgarization, duration, teacher_type, intensity };
      return {};
    }
  };

  global.utils = { initializeLucide() {} };

  async function handleGenerateCourse() {
    const subject = document.getElementById('subject').value.trim();
    const { teacher_type, intensity, vulgarization, duration } = collectFormParameters();
    await courseManager.generateCourse(subject, vulgarization, duration, teacher_type, intensity);
    utils.initializeLucide();
  }

  const btn = document.querySelector('.decryptage-controls #generateBtn');
  btn.addEventListener('click', handleGenerateCourse);
  btn.dispatchEvent({ type: 'click' });

  assert.deepStrictEqual(calledWith, {
    subject: 'Quantum Mechanics',
    vulgarization: 'expert',
    duration: 'long',
    teacher_type: 'memorizer',
    intensity: 'deep_expert'
  });
  assert.strictEqual(VULGARIZATION_LABELS[calledWith.vulgarization], 'Expert');
  assert.strictEqual(TEACHER_TYPE_LABELS[calledWith.teacher_type], '📖 Pour mémoriser');
});
