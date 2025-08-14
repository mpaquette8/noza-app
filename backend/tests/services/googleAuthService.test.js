process.env.GOOGLE_CLIENT_ID = 'test-client-id';

const test = require('node:test');
const assert = require('node:assert');
const { OAuth2Client } = require('google-auth-library');
const googleAuthService = require('../../src/services/googleAuthService');
const { mock } = test;

test.afterEach(() => {
  mock.restoreAll();
});

test('verifyGoogleToken resolves with user info on success', async () => {
  const payload = {
    sub: '123',
    email: 'user@example.com',
    name: 'Test User',
    picture: 'avatar.png',
    email_verified: true
  };
  mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => ({
    getPayload: () => payload
  }));

  const user = await googleAuthService.verifyGoogleToken('valid-token');
  assert.deepStrictEqual(user, {
    googleId: '123',
    email: 'user@example.com',
    name: 'Test User',
    avatar: 'avatar.png',
    emailVerified: true
  });
});

test('verifyGoogleToken throws INVALID for invalid tokens', async () => {
  mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => {
    throw new Error('invalid');
  });

  await assert.rejects(
    googleAuthService.verifyGoogleToken('bad-token'),
    err => err.code === 'INVALID'
  );
});

test('verifyGoogleToken throws NETWORK on network errors', async () => {
  mock.method(OAuth2Client.prototype, 'verifyIdToken', async () => {
    const error = new Error('network');
    error.code = 'ENOTFOUND';
    throw error;
  });

  await assert.rejects(
    googleAuthService.verifyGoogleToken('token'),
    err => err.code === 'NETWORK'
  );
});

test('verifyGoogleToken throws TIMEOUT on timeout', async () => {
  mock.method(OAuth2Client.prototype, 'verifyIdToken', () => new Promise(() => {}));
  const realSetTimeout = global.setTimeout;
  global.setTimeout = (fn, ms) => realSetTimeout(fn, 0);
  try {
    await assert.rejects(
      googleAuthService.verifyGoogleToken('token'),
      err => err.code === 'TIMEOUT'
    );
  } finally {
    global.setTimeout = realSetTimeout;
  }
});

