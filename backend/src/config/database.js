// backend/src/config/database.js
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/helpers');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Test de connexion au démarrage
async function connectDatabase() {
  logger.info('🔄 Attempting to connect to the database...');
  try {
    await prisma.$connect();
    logger.success('✅ Base de données connectée');

    // List tables in the public schema
    const tables = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    if (!tables || tables.length === 0) {
      logger.warn('⚠️ Aucune table trouvée dans la base de données');
    } else {
      logger.info(`📋 Tables détectées: ${tables.map(t => t.tablename).join(', ')}`);
    }
  } catch (error) {
    if (error.code === 'P1001') {
      logger.error('❌ P1001: Le serveur de base de données est injoignable. Vérifiez la connexion.', error);
    } else if (error.code === 'P1010') {
      logger.error('❌ P1010: Accès refusé. Vérifiez les droits et les identifiants de connexion.', error);
    } else if (error.code === 'P1003') {
      logger.error('❌ P1003: La base de données spécifiée est introuvable.', error);
    } else {
      logger.error('❌ Erreur connexion base de données:', error);
    }
    process.exit(1);
  }
}

// Fermeture propre
async function disconnectDatabase() {
  logger.info('🔄 Fermeture de la connexion à la base de données...');
  await prisma.$disconnect();
  logger.success('🔌 Base de données déconnectée');
}

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase
};
