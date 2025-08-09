// backend/server.js
require('dotenv').config();
const { app, initializeApp } = require('./src/app');
const { logger } = require('./src/utils/helpers');
const { disconnectDatabase } = require('./src/config/database');

const PORT = process.env.PORT || 3000;

// Démarrage du serveur
const startServer = async () => {
  try {
    // Initialiser l'application (DB, etc.)
    await initializeApp();
    
    // Démarrer le serveur
    const server = app.listen(PORT, '0.0.0.0', () => {
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

    // Gestion propre de l'arrêt
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} reçu. Arrêt en cours...`);
      
      server.close(async () => {
        logger.info('Serveur HTTP fermé');
        await disconnectDatabase();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Erreur démarrage serveur', error);
    process.exit(1);
  }
};

startServer();