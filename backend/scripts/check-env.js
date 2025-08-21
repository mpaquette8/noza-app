// backend/scripts/check-env.js
// Vérifie la présence des variables d'environnement sensibles et
// s'assure qu'elles ne proviennent pas d'un fichier suivi par git.

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { logger } = require('../src/utils/helpers');

// Vérifie si un fichier est suivi par git
function isTracked(file, cwd) {
  try {
    execSync(`git ls-files --error-unmatch ${file}`, { stdio: 'ignore', cwd });
    return true;
  } catch {
    return false;
  }
}

function checkEnv() {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const backendRoot = path.resolve(__dirname, '..');

  // Refuser si un fichier .env suivi est présent dans le dépôt
  const envFiles = [
    path.join(repoRoot, '.env'),
    path.join(backendRoot, '.env'),
  ];

  for (const file of envFiles) {
    if (fs.existsSync(file) && isTracked(path.relative(repoRoot, file), repoRoot)) {
      logger.error(`Le fichier ${file} est suivi par git. Retirez les secrets du dépôt.`);
      process.exit(1);
    }
  }

  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const allowHttp = process.env.ALLOW_HTTP === 'true';
  if (process.env.NODE_ENV === 'production' && !allowHttp) {
    required.push('TLS_CERT_PATH', 'TLS_KEY_PATH');
  } else if (process.env.NODE_ENV === 'production' && allowHttp) {
    logger.warn('ALLOW_HTTP activé: démarrage sans TLS.');
  }

  const missing = required.filter((v) => !process.env[v]);
  if (missing.length) {
    logger.error(`Variables d'environnement manquantes: ${missing.join(', ')}`);
    process.exit(1);
  }

  const malformed = [];
  if (process.env.DATABASE_URL) {
    try {
      new URL(process.env.DATABASE_URL);
    } catch {
      malformed.push('DATABASE_URL');
    }
  }

  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    malformed.push('JWT_SECRET (32 chars min)');
  }

  if (required.includes('TLS_CERT_PATH') && !fs.existsSync(process.env.TLS_CERT_PATH)) {
    malformed.push('TLS_CERT_PATH (fichier introuvable)');
  }

  if (required.includes('TLS_KEY_PATH') && !fs.existsSync(process.env.TLS_KEY_PATH)) {
    malformed.push('TLS_KEY_PATH (fichier introuvable)');
  }

  if (malformed.length) {
    logger.error(`Variables d'environnement invalides: ${malformed.join(', ')}`);
    process.exit(1);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    logger.warn('ANTHROPIC_API_KEY non défini. Fonctionnalités IA désactivées.');
  }

  logger.success('Variables d\'environnement vérifiées.');
}

if (require.main === module) {
  try {
    checkEnv();
  } catch (err) {
    logger.error('Erreur lors de la vérification des variables d\'environnement', err);
    process.exit(1);
  }
}

module.exports = { checkEnv };

