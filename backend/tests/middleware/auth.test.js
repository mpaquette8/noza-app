process.env.JWT_SECRET = 'test-secret';
process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';

const test = require('node:test');
const assert = require('node:assert');

const { prisma } = require('../../src/infrastructure/database');
const { generateToken } = require('../../src/infrastructure/utils/auth');
const { authenticate } = require('../../src/infrastructure/middleware/auth');

test('authenticate uses token from cookies when Authorization header missing', async () => {
  const fakeUser = { id: 1, email: 'user@example.com', name: 'Test User' };
  prisma.user.findUnique = async () => fakeUser;

  const token = generateToken(fakeUser.id);

  const req = {
    header: () => undefined,
    cookies: { token }
  };

  const res = {
    statusCode: 0,
    status(code) { this.statusCode = code; return this; },
    json() { }
  };

  let called = false;
  const next = () => { called = true; };

  await authenticate(req, res, next);

  assert.strictEqual(called, true);
  assert.deepStrictEqual(req.user, fakeUser);
});

test('authenticate rejects when no token provided in header or cookies', async () => {
  const req = {
    header: () => undefined,
    cookies: {}
  };

  let jsonBody;
  const res = {
    statusCode: 0,
    status(code) { this.statusCode = code; return this; },
    json(body) { jsonBody = body; }
  };

  let called = false;
  const next = () => { called = true; };

  await authenticate(req, res, next);

  assert.strictEqual(called, false);
  assert.strictEqual(res.statusCode, 401);
  assert.ok(jsonBody.error);
});

