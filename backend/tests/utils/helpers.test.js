const test = require('node:test');
const assert = require('node:assert');
const { sanitizeInput } = require('../../src/utils/helpers');

test('sanitizeInput preserves accented letters', () => {
  const input = 'Café élève déjà naïve';
  const result = sanitizeInput(input);
  assert.strictEqual(result, input);
});

test('sanitizeInput preserves multilingual scripts and punctuation', () => {
  const input = '你好，世界! — Привет! Café';
  const result = sanitizeInput(input);
  assert.strictEqual(result, input);
});

test('sanitizeInput strips HTML tags', () => {
  const input = '<strong>Bold</strong> text';
  const result = sanitizeInput(input);
  assert.strictEqual(result, 'Bold text');
});

test('sanitizeInput removes emoji characters', () => {
  const input = 'Bonjour! 😊';
  const result = sanitizeInput(input);
  assert.strictEqual(result, 'Bonjour! ');
});

test('sanitizeInput respects maxLength with unicode', () => {
  const input = 'É'.repeat(10);
  const result = sanitizeInput(input, 5);
  assert.strictEqual(result, 'É'.repeat(5));
});
