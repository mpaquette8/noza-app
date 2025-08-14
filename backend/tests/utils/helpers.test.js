const test = require('node:test');
const assert = require('node:assert');
const { sanitizeInput } = require('../../src/utils/helpers');

test('sanitizeInput preserves accented letters', () => {
  const input = 'Café élève déjà naïve';
  const result = sanitizeInput(input);
  assert.strictEqual(result, input);
});

test('sanitizeInput removes disallowed characters', () => {
  const input = 'Bonjour! 😊';
  const result = sanitizeInput(input);
  assert.strictEqual(result, 'Bonjour! ');
});

test('sanitizeInput respects maxLength with unicode', () => {
  const input = 'É'.repeat(10);
  const result = sanitizeInput(input, 5);
  assert.strictEqual(result, 'É'.repeat(5));
});
