require('dotenv').config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

const nodeEnv = requireEnv('NODE_ENV');
const allowHttp = requireEnv('ALLOW_HTTP') === 'true';

const app = {
  env: nodeEnv,
  port: parseInt(requireEnv('PORT'), 10),
  httpsPort: parseInt(process.env.HTTPS_PORT || '3443', 10),
  allowHttp,
  tlsCertPath: nodeEnv === 'production' && !allowHttp ? requireEnv('TLS_CERT_PATH') : process.env.TLS_CERT_PATH,
  tlsKeyPath: nodeEnv === 'production' && !allowHttp ? requireEnv('TLS_KEY_PATH') : process.env.TLS_KEY_PATH,
};

const database = {
  url: requireEnv('DATABASE_URL'),
};

const jwt = {
  secret: requireEnv('JWT_SECRET'),
  expiresIn: requireEnv('JWT_EXPIRES_IN'),
};

const devOrigins = ['http://localhost:3000', 'http://localhost:3001'];
const prodOrigins = ['https://app.noza.dev', 'https://api.noza.dev'];

const cors = {
  origins: nodeEnv === 'development' ? devOrigins : [...devOrigins, ...prodOrigins],
  credentials: true,
};

const api = {
  googleClientId: requireEnv('GOOGLE_CLIENT_ID'),
  anthropicApiKey: requireEnv('ANTHROPIC_API_KEY'),
};

const redis = {
  url: requireEnv('REDIS_URL'),
};

module.exports = { app, database, jwt, cors, api, redis };
