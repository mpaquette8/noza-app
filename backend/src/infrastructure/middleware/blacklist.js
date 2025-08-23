// backend/src/infrastructure/middleware/blacklist.js
const { createResponse } = require('../utils/helpers');
const { ERROR_MESSAGES, HTTP_STATUS } = require('../utils/constants');

// Maps pour stocker les IPs et utilisateurs blacklistés avec un timestamp
const blacklistedIPs = new Map();
const blacklistedUserIds = new Map();

// Durée de vie des entrées et intervalle de nettoyage
const ENTRY_TTL_MS = 24 * 60 * 60 * 1000; // 24 heures
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 heure

// Fonction de nettoyage pour supprimer les entrées expirées
const cleanupBlacklist = () => {
  const now = Date.now();

  for (const [ip, timestamp] of blacklistedIPs) {
    if (now - timestamp > ENTRY_TTL_MS) {
      blacklistedIPs.delete(ip);
    }
  }

  for (const [userId, timestamp] of blacklistedUserIds) {
    if (now - timestamp > ENTRY_TTL_MS) {
      blacklistedUserIds.delete(userId);
    }
  }
};

// Nettoyage périodique toutes les heures
setInterval(cleanupBlacklist, CLEANUP_INTERVAL_MS);

// Fonctions utilitaires pour blacklister une IP ou un utilisateur
const blacklistIP = (ip) => {
  if (ip) {
    blacklistedIPs.set(ip, Date.now());
  }
};

const blacklistUser = (userId) => {
  if (userId) {
    blacklistedUserIds.set(userId, Date.now());
  }
};

// Middleware pour vérifier si la requête provient d'une source blacklistée
const checkBlacklist = (req, res, next) => {
  const ip = req.ip;
  const userId = req.user?.id;

  if (blacklistedIPs.has(ip) || (userId && blacklistedUserIds.has(userId))) {
    const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.FORBIDDEN, HTTP_STATUS.FORBIDDEN);
    return res.status(statusCode).json(response);
  }

  next();
};

module.exports = {
  checkBlacklist,
  blacklistIP,
  blacklistUser,
  blacklistedIPs,
  blacklistedUserIds
};

