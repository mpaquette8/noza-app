// backend/src/middleware/blacklist.js
const { createResponse } = require('../utils/helpers');
const { ERROR_MESSAGES, HTTP_STATUS } = require('../utils/constants');

// Ensembles pour stocker les IPs et utilisateurs blacklistés
const blacklistedIPs = new Set();
const blacklistedUserIds = new Set();

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
  blacklistedIPs,
  blacklistedUserIds
};

