const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

process.env.JWT_SECRET = 'a'.repeat(32);
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';

const { app } = require('../../src/presentation/app');

test('GET /api/config/google returns client ID', async () => {
  const res = await request(app).get('/api/config/google');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { clientId: 'test-client-id' });
});

