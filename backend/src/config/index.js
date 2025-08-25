require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'test';
const allowHttp = process.env.ALLOW_HTTP === 'true';

const app = {
  env: nodeEnv,
  port: parseInt(process.env.PORT || '3000', 10),
  httpsPort: parseInt(process.env.HTTPS_PORT || '3443', 10),
  allowHttp,
  tlsCertPath: process.env.TLS_CERT_PATH,
  tlsKeyPath: process.env.TLS_KEY_PATH,
};

const database = {
  url: process.env.DATABASE_URL || '',
};

const jwt = {
  secret: process.env.JWT_SECRET || 'test-secret',
  expiresIn: process.env.JWT_EXPIRES_IN || '1d',
};

const devOrigins = ['http://localhost:3000', 'http://localhost:3001'];
const prodOrigins = ['https://app.noza.dev', 'https://api.noza.dev'];

const cors = {
  origins: nodeEnv === 'development' ? devOrigins : [...devOrigins, ...prodOrigins],
  credentials: true,
};

const api = {
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
};

const redis = {
  url: process.env.REDIS_URL || '',
};

module.exports = { app, database, jwt, cors, api, redis };
