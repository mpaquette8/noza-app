const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../app/assets/js/shared/sanitize.js');

test('sanitizeInput preserves multilingual scripts and punctuation', async () => {
  const { sanitizeInput } = await load();
  const input = '你好，世界! — Привет! Café';
  const result = sanitizeInput(input);
  assert.strictEqual(result, input);
});

test('sanitizeInput strips HTML tags', async () => {
  const { sanitizeInput } = await load();
  const input = '<em>Italic</em> text';
  const result = sanitizeInput(input);
  assert.strictEqual(result, 'Italic text');
});

test('sanitizeInput removes emoji characters', async () => {
  const { sanitizeInput } = await load();
  const input = 'Bonjour! 😊';
  const result = sanitizeInput(input);
  assert.strictEqual(result, 'Bonjour! ');
});

test('sanitizeInput respects maxLength with unicode', async () => {
  const { sanitizeInput } = await load();
  const input = 'É'.repeat(10);
  const result = sanitizeInput(input, 5);
  assert.strictEqual(result, 'É'.repeat(5));
});

test('sanitizeHTML removes script tags but keeps markup', async () => {
  const { sanitizeHTML } = await load();
  const input = '<p>Hello</p><script>alert(1)</script>';
  const result = sanitizeHTML(input);
  assert.strictEqual(result, '<p>Hello</p>');
});
