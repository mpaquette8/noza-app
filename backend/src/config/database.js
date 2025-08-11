// backend/src/config/database.js
const { PrismaClient } = require('@prisma/client');

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
  console.log('🔄 Attempting to connect to the database...');
  try {
    await prisma.$connect();
    console.log('✅ Base de données connectée');

    // List tables in the public schema
    const tables = await prisma.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
    if (!tables || tables.length === 0) {
      console.warn('⚠️ Aucune table trouvée dans la base de données');
    } else {
      console.log(`📋 Tables détectées: ${tables.map(t => t.tablename).join(', ')}`);
    }
  } catch (error) {
    if (error.code === 'P1001') {
      console.error('❌ P1001: Le serveur de base de données est injoignable. Vérifiez la connexion.', error);
    } else if (error.code === 'P1010') {
      console.error('❌ P1010: Accès refusé. Vérifiez les droits et les identifiants de connexion.', error);
    } else if (error.code === 'P1003') {
      console.error('❌ P1003: La base de données spécifiée est introuvable.', error);
    } else {
      console.error('❌ Erreur connexion base de données:', error);
    }
    process.exit(1);
  }
}

// Fermeture propre
async function disconnectDatabase() {
  console.log('🔄 Fermeture de la connexion à la base de données...');
  await prisma.$disconnect();
  console.log('🔌 Base de données déconnectée');
}

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase
};