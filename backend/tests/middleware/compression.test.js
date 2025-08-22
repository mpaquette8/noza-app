const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { URL } = require('url');

const compression = require('../../src/infrastructure/middleware/compression');

function createServer(handler) {
  const mw = compression;
  return http.createServer((req, res) => {
    req.path = new URL(req.url, 'http://localhost').pathname;
    mw(req, res, () => handler(req, res));
  });
}

async function request(path) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      if (req.path === '/small') {
        res.end('hello');
      } else if (req.path === '/image.png' || req.path === '/large') {
        res.end('a'.repeat(2000));
      }
    });
    server.listen(0, () => {
      const { port } = server.address();
      const options = {
        hostname: 'localhost',
        port,
        path,
        headers: { 'Accept-Encoding': 'gzip' }
      };
      http.get(options, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          server.close();
          resolve(res);
        });
      });
    });
  });
}

test('responses smaller than 1kb remain uncompressed', async () => {
  const res = await request('/small');
  assert.strictEqual(res.headers['content-encoding'], undefined);
});

test('images are excluded from compression', async () => {
  const res = await request('/image.png');
  assert.strictEqual(res.headers['content-encoding'], undefined);
});

test('responses larger than 1kb are compressed', async () => {
  const res = await request('/large');
  assert.strictEqual(res.headers['content-encoding'], 'gzip');
});
