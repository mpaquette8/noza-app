// backend/server.js
require('dotenv').config();
const { app, initializeApp } = require('./src/app');
const { logger } = require('./src/utils/helpers');
const { disconnectDatabase } = require('./src/config/database');
const { ensureMigrations } = require('./scripts/check-migrations');

const PORT = process.env.PORT || 3000;
let server;

// Vérification des variables d'environnement requises
const validateEnv = () => {
  let hasError = false;

  if (!process.env.DATABASE_URL) {
    logger.error('DATABASE_URL non défini. Impossible de démarrer le serveur.');
    hasError = true;
  }
  if (!process.env.JWT_SECRET) {
    logger.error('JWT_SECRET non défini. Impossible de démarrer le serveur.');
    hasError = true;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    logger.warn('ANTHROPIC_API_KEY non défini. Fonctionnalités IA désactivées.');
  }

  if (hasError) {
    process.exit(1);
  }
};

// Gestion propre de l'arrêt
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} reçu. Arrêt en cours...`);

  if (server) {
    server.close(async () => {
      logger.info('Serveur HTTP fermé');
      await disconnectDatabase();
      process.exit(0);
    });
  } else {
    await disconnectDatabase();
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Démarrage du serveur
const startServer = async () => {
  try {
    validateEnv();

    // Vérifier et appliquer les migrations
    logger.info('Vérification des migrations de base de données...');
    await ensureMigrations();

    // Initialiser l'application (DB, etc.)
    await initializeApp();

    // Démarrer le serveur
    server = app.listen(PORT, '0.0.0.0', () => {
      logger.success(`🚀 Serveur démarré sur 0.0.0.0:${PORT}`);
      logger.info(`🔧 API disponible sur le port ${PORT}`);
      logger.info(`📚 Routes disponibles:`);
      logger.info(`   - GET  /api/health`);
      logger.info(`   - POST /api/auth/register`);
      logger.info(`   - POST /api/auth/login`);
      logger.info(`   - GET  /api/auth/profile`);
      logger.info(`   - GET  /api/courses`);
      logger.info(`   - POST /api/courses`);
      logger.info(`   - GET  /api/courses/:id`);
      logger.info(`   - DELETE /api/courses/:id`);
      logger.info(`   - POST /api/ai/ask-question`);
      logger.info(`   - POST /api/ai/generate-quiz`);
      logger.info(`   - POST /api/ai/suggest-questions`);
    });
  } catch (error) {
    logger.error('Erreur démarrage serveur', error);
    process.exit(1);
  }
};

startServer();
