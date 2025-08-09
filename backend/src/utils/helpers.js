// backend/src/utils/helpers.js
const { ERROR_MESSAGES, HTTP_STATUS } = require('./constants');

// Formatage de réponse standardisé
const createResponse = (success, data = null, error = null, statusCode = HTTP_STATUS.OK) => {
  const response = { success };
  
  if (success && data) {
    if (typeof data === 'object' && !Array.isArray(data)) {
      Object.assign(response, data);
    } else {
      response.data = data;
    }
  }
  
  if (!success && error) {
    response.error = error;
  }
  
  return { response, statusCode };
};

// Validation des paramètres
const validateCourseParams = (subject, detailLevel, vulgarizationLevel) => {
  const errors = [];
  
  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    errors.push('Le sujet est requis');
  }
  
  if (!detailLevel || ![1, 2, 3].includes(parseInt(detailLevel))) {
    errors.push('Niveau de détail invalide (1-3)');
  }
  
  if (!vulgarizationLevel || ![1, 2, 3, 4].includes(parseInt(vulgarizationLevel))) {
    errors.push('Niveau de vulgarisation invalide (1-4)');
  }
  
  return errors;
};

// Sanitisation des entrées
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/<script[^>]*>.*?<\/script>/gi, '') // Supprimer les scripts
    .replace(/<[^>]*>/g, '') // Supprimer les balises HTML
    .substring(0, 10000); // Limiter la taille
};

// Gestion des erreurs async
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Logger amélioré
const logger = {
  info: (message, data = null) => {
    console.log(`ℹ️  [${new Date().toISOString()}] ${message}`, data || '');
  },
  error: (message, error = null) => {
    console.error(`❌ [${new Date().toISOString()}] ${message}`, error || '');
  },
  warn: (message, data = null) => {
    console.warn(`⚠️  [${new Date().toISOString()}] ${message}`, data || '');
  },
  success: (message, data = null) => {
    console.log(`✅ [${new Date().toISOString()}] ${message}`, data || '');
  }
};

module.exports = {
  createResponse,
  validateCourseParams,
  sanitizeInput,
  asyncHandler,
  logger
};