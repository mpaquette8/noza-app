const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const fs = require('fs');
const path = require('path');

process.env.JWT_SECRET = 'a'.repeat(32);
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';

const rootDir = path.join(__dirname, '../../..');
const jsDir = path.join(rootDir, 'frontend/app/assets/js');
const original = path.join(jsDir, 'main.js');
const hashed = path.join(jsDir, 'main.12345678.js');

fs.copyFileSync(original, hashed);

const { app } = require('../../src/presentation/app');

test('hashed static asset has long cache headers', async () => {
  const res = await request(app).get('/app/assets/js/main.12345678.js');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers['cache-control'], 'public, max-age=31536000, immutable');
  assert.ok(res.headers.etag);
  assert.ok(res.headers.vary.includes('Accept-Encoding'));
});

test('HTML route has hour cache headers', async () => {
  const res = await request(app).get('/app').set('Accept', 'text/html');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers['cache-control'], 'public, max-age=3600');
  assert.ok(res.headers.etag);
  assert.ok(res.headers.vary.includes('Accept-Encoding'));
});

process.on('exit', () => {
  try { fs.unlinkSync(hashed); } catch {}
});
