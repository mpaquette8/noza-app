// backend/server.js
const fs = require('fs');
const http = require('http');
const https = require('https');
const { app, initializeApp } = require('./src/presentation/app');
const { logger } = require('./src/infrastructure/utils/helpers');
const { disconnectDatabase } = require('./src/infrastructure/database');
const { checkEnv } = require('./scripts/check-env');
const { app: appConfig } = require('./src/config');
// const { ensureMigrations } = require('./scripts/check-migrations');

const HTTP_PORT = appConfig.port;
const HTTPS_PORT = appConfig.httpsPort;
let server;
let httpRedirectServer;
const allowHttp = appConfig.allowHttp;

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

    if (appConfig.env === 'production' && !allowHttp) {
      const certPath = appConfig.tlsCertPath;
      const keyPath = appConfig.tlsKeyPath;

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
      if (appConfig.env === 'production' && allowHttp) {
        logger.warn('ALLOW_HTTP activé: serveur démarré en HTTP sans TLS.');
      }
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
