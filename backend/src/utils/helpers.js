// backend/src/utils/helpers.js
const { ERROR_MESSAGES, HTTP_STATUS, STYLES, DURATIONS, INTENTS } = require('./constants');

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
const validateCourseParams = (subject, style, duration, intent) => {
  const errors = [];

  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    errors.push('Le sujet est requis');
  }

  if (!style || !Object.values(STYLES).includes(style)) {
    errors.push('Style invalide');
  }

  if (!duration || !Object.values(DURATIONS).includes(duration)) {
    errors.push('Durée invalide');
  }

  if (!intent || !Object.values(INTENTS).includes(intent)) {
    errors.push('Intention invalide');
  }

  return errors;
};

// Conversion des anciens paramètres vers les nouveaux
const mapLegacyParams = ({ detailLevel, vulgarizationLevel, style, duration, intent }) => {
  const durationMap = { 1: DURATIONS.SHORT, 2: DURATIONS.MEDIUM, 3: DURATIONS.LONG };
  const intentMap = { 1: INTENTS.DISCOVER, 2: INTENTS.LEARN, 3: INTENTS.MASTER, 4: INTENTS.EXPERT };

  const finalStyle = style || STYLES.NEUTRAL;
  const finalDuration = duration || durationMap[detailLevel] || DURATIONS.MEDIUM;
  const finalIntent = intent || intentMap[vulgarizationLevel] || INTENTS.LEARN;

  const finalDetail = detailLevel || parseInt(Object.keys(durationMap).find(key => durationMap[key] === finalDuration));
  const finalVulgarization = vulgarizationLevel || parseInt(Object.keys(intentMap).find(key => intentMap[key] === finalIntent));

  return {
    style: finalStyle,
    duration: finalDuration,
    intent: finalIntent,
    detailLevel: finalDetail,
    vulgarizationLevel: finalVulgarization
  };
};

// Sanitisation des entrées avec whitelist
const sanitizeInput = (input, maxLength = 10000) => {
  if (typeof input !== 'string') return input;

  return input
    .trim()
    .replace(/[^a-zA-Z0-9 _\n\r.,!?;:'"()\[\]{}-]/g, '')
    .substring(0, maxLength);
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
  mapLegacyParams,
  sanitizeInput,
  asyncHandler,
  logger
};