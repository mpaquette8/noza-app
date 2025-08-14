const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('child_process');
const path = require('path');

test('allows startup without TLS when ALLOW_HTTP is set', () => {
  const result = spawnSync('node', [path.join(__dirname, '../../scripts/check-env.js')], {
    cwd: path.join(__dirname, '../../'),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://user:pass@localhost:5432/db',
      JWT_SECRET: 'secret',
      ALLOW_HTTP: 'true',
      NODE_PATH: path.join(__dirname, '../../node_modules')
    },
  });
  assert.strictEqual(result.status, 0, result.stderr.toString());
});
