// backend/src/infrastructure/database/index.js
const { PrismaClient } = require('@prisma/client');
const { logger } = require('../utils/helpers');
const { attachQueryOptimizers } = require('./queryOptimizer');
const { app: appConfig, database: dbConfig } = require('../../config');

const dbUrl = new URL(dbConfig.url);
dbUrl.searchParams.set('connection_limit', dbUrl.searchParams.get('connection_limit') || '10');
dbUrl.searchParams.set('pool_timeout', dbUrl.searchParams.get('pool_timeout') || '30');

const prisma = new PrismaClient({
  log: appConfig.env === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
  datasources: {
    db: {
      url: dbUrl.toString(),
    },
  },
});

attachQueryOptimizers(prisma);

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
