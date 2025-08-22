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

const anthropicService = require('../../src/application/services/anthropicService');
const AnthropicService = require('../../src/infrastructure/external/AnthropicService');
const AnthropicAIService = require('../../src/domain/services/AnthropicAIService');
Module._load = originalLoad;
const { TEACHER_TYPES, DURATIONS, VULGARIZATION_LEVELS, ERROR_CODES } = require('../../src/infrastructure/utils/constants');

test('createPrompt creates flexible educational content', () => {
  const prompt = anthropicService.createPrompt(
    'Sujet',
    VULGARIZATION_LEVELS.GENERAL_PUBLIC,
    DURATIONS.MEDIUM,
    TEACHER_TYPES.METHODICAL
  );

  assert.match(prompt, /PHILOSOPHIE PÉDAGOGIQUE/);
  assert.match(prompt, /Pour aller plus loin/);
});

test('createPrompt allows pedagogical freedom', () => {
  const prompt = anthropicService.createPrompt(
    'Sujet',
    VULGARIZATION_LEVELS.GENERAL_PUBLIC,
    DURATIONS.MEDIUM,
    TEACHER_TYPES.METHODICAL
  );

  assert.doesNotMatch(prompt, /STRUCTURE REQUISE/);
});

test('sendWithTimeout retries on overload errors', async () => {
  const api = new AnthropicService();
  let callCount = 0;
  api.client = {
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

  const result = await api.sendWithTimeout({}, 100, [1, 2]);
  assert.strictEqual(callCount, 3);
  assert.deepStrictEqual(result, { content: [{ text: 'ok' }] });
});

test('categorizeError returns IA_OVERLOADED for 529', () => {
  const api = new AnthropicService();
  const error = { response: { status: 529 } };
  const code = api.categorizeError(error);
  assert.strictEqual(code, ERROR_CODES.IA_OVERLOADED);
});

test('categorizeError detects APIUserAbortError as IA_TIMEOUT', () => {
  const api = new AnthropicService();
  const err = new Error('APIUserAbortError: aborted by user');
  err.name = 'APIUserAbortError';
  const code = api.categorizeError(err);
  assert.strictEqual(code, ERROR_CODES.IA_TIMEOUT);
});

test('APIUserAbortError does not trigger offline mode', async () => {
  const api = new AnthropicService();
  const orchestrator = new AnthropicAIService(api);
  const originalSend = api.sendWithTimeout;
  api.setOffline(false);
  api.sendWithTimeout = async () => {
    const err = new Error('Request aborted by the user');
    err.name = 'APIUserAbortError';
    throw err;
  };

  try {
    await orchestrator.generateCourse('Sujet', VULGARIZATION_LEVELS.ENLIGHTENED, DURATIONS.SHORT, TEACHER_TYPES.METHODICAL);
    assert.fail('generateCourse should throw');
  } catch (err) {
    assert.strictEqual(err.code, ERROR_CODES.IA_TIMEOUT);
    assert.strictEqual(api.isOffline(), false);
  } finally {
    api.sendWithTimeout = originalSend;
  }
});
