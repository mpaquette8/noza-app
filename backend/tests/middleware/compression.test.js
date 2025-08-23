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

async function request(path, accept = 'text/plain') {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      if (req.path === '/small') {
        res.setHeader('Content-Type', 'text/plain');
        res.end('hello');
      } else if (req.path === '/image.png') {
        res.setHeader('Content-Type', 'image/png');
        res.end('a'.repeat(2000));
      } else if (req.path === '/large') {
        res.setHeader('Content-Type', 'text/plain');
        res.end('a'.repeat(2000));
      } else if (req.path === '/html') {
        res.setHeader('Content-Type', 'text/html');
        res.end('<html>' + 'a'.repeat(2000) + '</html>');
      } else if (req.path === '/json') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ data: 'a'.repeat(200) }));
      }
    });
    server.listen(0, () => {
      const { port } = server.address();
      const options = {
        hostname: 'localhost',
        port,
        path,
        headers: { 'Accept-Encoding': 'gzip', Accept: accept }
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

test('responses smaller than 100 bytes remain uncompressed', async () => {
  const res = await request('/small');
  assert.strictEqual(res.headers['content-encoding'], undefined);
});

test('images are excluded from compression', async () => {
  const res = await request('/image.png', 'image/png');
  assert.strictEqual(res.headers['content-encoding'], undefined);
});

test('responses larger than 100 bytes are compressed', async () => {
  const res = await request('/large');
  assert.strictEqual(res.headers['content-encoding'], 'gzip');
});

test('text/html responses are compressed', async () => {
  const res = await request('/html', 'text/html');
  assert.strictEqual(res.headers['content-encoding'], 'gzip');
});

test('application/json responses are compressed', async () => {
  const res = await request('/json', 'application/json');
  assert.strictEqual(res.headers['content-encoding'], 'gzip');
});
