process.env.ANTHROPIC_API_KEY = 'test-key';

const test = require('node:test');
const assert = require('node:assert');
const Module = require('module');

// Mock external dependencies so tests can run without installing packages
const originalLoad = Module._load;
Module._load = (request, parent, isMain) => {
  if (request === '@anthropic-ai/sdk') {
    return function Anthropic() { return {}; };
  }
  if (request === 'sanitize-html') {
    return input => input;
  }
  return originalLoad(request, parent, isMain);
};

const anthropicService = require('../../src/services/anthropicService');
Module._load = originalLoad;
const { TEACHER_TYPES, DURATIONS, VULGARIZATION_LEVELS, ERROR_CODES } = require('../../src/utils/constants');

test('createPrompt includes duration word counts', () => {
  const mapping = {
    [DURATIONS.SHORT]: 750,
    [DURATIONS.MEDIUM]: 2250,
    [DURATIONS.LONG]: 4200
  };
  for (const [duration, count] of Object.entries(mapping)) {
    const prompt = anthropicService.createPrompt('Sujet', TEACHER_TYPES.METHODICAL, duration, VULGARIZATION_LEVELS.ENLIGHTENED);
    assert.match(prompt, new RegExp(`${count} mots`));
  }
});

test('createPrompt includes distinct teacher type instructions', () => {
  const promptMethod = anthropicService.createPrompt('Sujet', TEACHER_TYPES.METHODICAL, DURATIONS.MEDIUM, VULGARIZATION_LEVELS.ENLIGHTENED);
  const promptPassion = anthropicService.createPrompt('Sujet', TEACHER_TYPES.PASSIONATE, DURATIONS.MEDIUM, VULGARIZATION_LEVELS.ENLIGHTENED);

  assert.match(promptMethod, /approche méthodique et structurée/);
  assert.match(promptPassion, /passion et enthousiasme/);
  assert.notStrictEqual(promptMethod, promptPassion);
});

test('sendWithTimeout retries on overload errors', async () => {
  const originalClient = anthropicService.client;
  let callCount = 0;
  anthropicService.client = {
    messages: {
      create: async () => {
        callCount++;
        if (callCount < 3) {
          const err = new Error('overloaded');
          err.response = { status: 529, data: { type: 'overloaded_error' } };
          throw err;
        }
        return { content: [{ text: 'ok' }] };
      }
    }
  };

  const result = await anthropicService.sendWithTimeout({}, 100, [1, 2]);
  assert.strictEqual(callCount, 3);
  assert.deepStrictEqual(result, { content: [{ text: 'ok' }] });

  anthropicService.client = originalClient;
});

test('categorizeError returns IA_OVERLOADED for 529', () => {
  const error = { response: { status: 529 } };
  const code = anthropicService.categorizeError(error);
  assert.strictEqual(code, ERROR_CODES.IA_OVERLOADED);
});

test('categorizeError detects APIUserAbortError as IA_TIMEOUT', () => {
  const err = new Error('APIUserAbortError: aborted by user');
  err.name = 'APIUserAbortError';
  const code = anthropicService.categorizeError(err);
  assert.strictEqual(code, ERROR_CODES.IA_TIMEOUT);
});

test('APIUserAbortError does not trigger offline mode', async () => {
  const originalSend = anthropicService.sendWithTimeout;
  anthropicService.offline = false;
  anthropicService.sendWithTimeout = async () => {
    const err = new Error('Request aborted by the user');
    err.name = 'APIUserAbortError';
    throw err;
  };

  try {
    await anthropicService.generateCourse('Sujet', TEACHER_TYPES.METHODICAL, DURATIONS.SHORT, VULGARIZATION_LEVELS.ENLIGHTENED);
    assert.fail('generateCourse should throw');
  } catch (err) {
    assert.strictEqual(err.code, ERROR_CODES.IA_TIMEOUT);
    assert.strictEqual(anthropicService.isOffline(), false);
  } finally {
    anthropicService.sendWithTimeout = originalSend;
  }
});
