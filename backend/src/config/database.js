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
  try {
    await prisma.$connect();
    console.log('✅ Base de données connectée');
  } catch (error) {
    console.error('❌ Erreur connexion base de données:', error);
    process.exit(1);
  }
}

// Fermeture propre
async function disconnectDatabase() {
  await prisma.$disconnect();
  console.log('🔌 Base de données déconnectée');
}

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase
};