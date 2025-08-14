// backend/src/middleware/auth.js
const { verifyToken } = require('../utils/auth');
const { prisma } = require('../config/database');
const { createResponse, logger } = require('../utils/helpers');
const { ERROR_MESSAGES, HTTP_STATUS } = require('../utils/constants');

// Middleware pour vérifier si l'utilisateur est connecté
const authenticate = async (req, res, next) => {
  try {
    // Récupérer le token depuis l'en-tête Authorization
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
      return res.status(statusCode).json(response);
    }

    // Vérifier le token
    const decoded = verifyToken(token);
    
    // Chercher l'utilisateur dans la base
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
      return res.status(statusCode).json(response);
    }

    // Attacher l'utilisateur à la requête
    req.user = user;
    next();
  } catch (error) {
    logger.error('Erreur authentification', error);
    const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
    res.status(statusCode).json(response);
  }
};

module.exports = { authenticate };
