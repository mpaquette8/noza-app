const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

process.env.NODE_ENV = 'development';
process.env.ALLOW_HTTP = 'true';
process.env.PORT = '3000';
process.env.JWT_SECRET = 'a'.repeat(32);
process.env.JWT_EXPIRES_IN = '1h';
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.ANTHROPIC_API_KEY = 'test';
process.env.REDIS_URL = 'redis://localhost:6379';

const { app } = require('../../src/presentation/app');

test('helmet sets security headers', async () => {
  const res = await request(app).get('/api/config/google');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers['x-content-type-options'], 'nosniff');
  assert.strictEqual(res.headers['referrer-policy'], 'strict-origin-when-cross-origin');
});
