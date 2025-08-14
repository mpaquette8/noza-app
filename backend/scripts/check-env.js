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

