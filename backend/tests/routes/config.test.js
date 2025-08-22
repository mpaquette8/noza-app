const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
process.env.JWT_SECRET = 'a'.repeat(32);
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
process.env.GOOGLE_CLIENT_ID = 'dummy';
const { app } = require('../../src/presentation/app');

test('GET /api/config/google returns client ID when configured', async () => {
  const originalClientId = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = 'test-client-id';

  const res = await request(app).get('/api/config/google');

  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { clientId: 'test-client-id' });

  if (originalClientId === undefined) {
    delete process.env.GOOGLE_CLIENT_ID;
  } else {
    process.env.GOOGLE_CLIENT_ID = originalClientId;
  }
});

test('GET /api/config/google returns error when client ID missing', async () => {
  const originalClientId = process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_ID;

  const res = await request(app).get('/api/config/google');

  assert.strictEqual(res.status, 500);
  assert.deepStrictEqual(res.body, { error: 'Google Client ID not configured' });

  if (originalClientId !== undefined) {
    process.env.GOOGLE_CLIENT_ID = originalClientId;
  }
});

