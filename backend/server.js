// backend/server.js
require('dotenv').config();
const fs = require('fs');
const http = require('http');
const https = require('https');
const { app, initializeApp } = require('./src/app');
const { logger } = require('./src/utils/helpers');
const { disconnectDatabase } = require('./src/config/database');
const { checkEnv } = require('./scripts/check-env');
// const { ensureMigrations } = require('./scripts/check-migrations');

const HTTP_PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
let server;
let httpRedirectServer;

// Gestion propre de l'arrêt
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} reçu. Arrêt en cours...`);

  const closeServer = (srv, name) =>
    new Promise((resolve) => {
      if (!srv) return resolve();
      srv.close(() => {
        logger.info(`Serveur ${name} fermé`);
        resolve();
      });
    });

  await Promise.all([
    closeServer(server, 'principal HTTPS'),
    closeServer(httpRedirectServer, 'HTTP'),
  ]);

  await disconnectDatabase();
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Démarrage du serveur
const startServer = async () => {
  try {
    // Vérifier les variables d'environnement
    checkEnv();

    // Vérifier et appliquer les migrations
    logger.info('Vérification des migrations de base de données...');
    // await ensureMigrations();

    // Initialiser l'application (DB, etc.)
    await initializeApp();

    if (process.env.NODE_ENV === 'production') {
      const certPath = process.env.TLS_CERT_PATH;
      const keyPath = process.env.TLS_KEY_PATH;

      const credentials = {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
      };

      server = https.createServer(credentials, app).listen(HTTPS_PORT, '0.0.0.0', () => {
        logger.success(`🚀 Serveur HTTPS démarré sur 0.0.0.0:${HTTPS_PORT}`);
      });

      httpRedirectServer = http
        .createServer((req, res) => {
          res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
          res.end();
        })
        .listen(HTTP_PORT, '0.0.0.0', () => {
          logger.info(`Redirection HTTP active sur le port ${HTTP_PORT}`);
        });
    } else {
      server = app.listen(HTTP_PORT, '0.0.0.0', () => {
        logger.success(`🚀 Serveur démarré sur 0.0.0.0:${HTTP_PORT}`);
      });
    }
  } catch (error) {
    logger.error('Erreur démarrage serveur', error);
    process.exit(1);
  }
};

startServer();
