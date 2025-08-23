const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const request = require('supertest');

const rootDir = path.join(__dirname, '../../..');
const manifestPath = path.join(rootDir, 'backend/public/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const { app } = require('../../src/presentation/app');

test('manifest has entries and built files are served', async () => {
  assert.ok(Object.keys(manifest).length > 0, 'manifest should not be empty');
  const [original, hashed] = Object.entries(manifest)[0];
  const resAsset = await request(app).get(`/${hashed}`);
  assert.strictEqual(resAsset.status, 200);
  const htmlRes = await request(app).get('/app').set('Accept', 'text/html');
  assert.strictEqual(htmlRes.status, 200);
  assert.ok(htmlRes.text.includes(hashed));
});
