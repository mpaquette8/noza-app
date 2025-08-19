// backend/src/utils/helpers.js
const { ERROR_MESSAGES, HTTP_STATUS, DURATIONS, TEACHER_TYPES, VULGARIZATION_LEVELS, LEGACY_VULGARIZATION_LEVELS } = require('./constants');
const sanitizeHtml = require('sanitize-html');

// Formatage de réponse standardisé
const createResponse = (success, data = null, error = null, statusCode = HTTP_STATUS.OK, code = null) => {
  const response = { success };
  
  if (success && data) {
    if (typeof data === 'object' && !Array.isArray(data)) {
      Object.assign(response, data);
    } else {
      response.data = data;
    }
  }
  
  if (!success) {
    if (error) {
      response.error = error;
    }
    if (code) {
      response.code = code;
    }
  }

  return { response, statusCode };
};

// Validation des paramètres
const validateCourseParams = (subject, teacherType, duration, vulgarizationLevel) => {
  const errors = [];

  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    errors.push('Le sujet est requis');
  }

  if (!teacherType || !Object.values(TEACHER_TYPES).includes(teacherType)) {
    errors.push("Type d'enseignant invalide");
  }

  if (!duration || !Object.values(DURATIONS).includes(duration)) {
    errors.push('Durée invalide');
  }

  if (!vulgarizationLevel || !Object.values(VULGARIZATION_LEVELS).includes(vulgarizationLevel)) {
    errors.push('Niveau de vulgarisation invalide');
  }

  return errors;
};

// Conversion des anciens paramètres vers les nouveaux
const mapLegacyParams = ({ detailLevel, legacyVulgarizationLevel, teacherType, duration, vulgarizationLevel }) => {
  const durationMap = { 1: DURATIONS.SHORT, 2: DURATIONS.MEDIUM, 3: DURATIONS.LONG };
  const vulgarizationMap = {
    [LEGACY_VULGARIZATION_LEVELS.GENERAL_PUBLIC]: VULGARIZATION_LEVELS.GENERAL_PUBLIC,
    [LEGACY_VULGARIZATION_LEVELS.ENLIGHTENED]: VULGARIZATION_LEVELS.ENLIGHTENED,
    [LEGACY_VULGARIZATION_LEVELS.KNOWLEDGEABLE]: VULGARIZATION_LEVELS.KNOWLEDGEABLE,
    [LEGACY_VULGARIZATION_LEVELS.EXPERT]: VULGARIZATION_LEVELS.EXPERT
  };

  const finalTeacherType = teacherType || TEACHER_TYPES.METHODICAL;
  const finalDuration = duration || durationMap[detailLevel] || DURATIONS.MEDIUM;
  const finalVulgarization = vulgarizationLevel || vulgarizationMap[legacyVulgarizationLevel] || VULGARIZATION_LEVELS.ENLIGHTENED;

  const finalDetail = detailLevel || parseInt(Object.keys(durationMap).find(key => durationMap[key] === finalDuration));
  const finalLegacyVulgarization = legacyVulgarizationLevel || parseInt(Object.keys(vulgarizationMap).find(key => vulgarizationMap[key] === finalVulgarization));

  return {
    teacherType: finalTeacherType,
    duration: finalDuration,
    vulgarizationLevel: finalVulgarization,
    detailLevel: finalDetail,
    legacyVulgarizationLevel: finalLegacyVulgarization
  };
};

// Sanitisation des entrées avec une bibliothèque dédiée.
// This mirrors frontend/assets/js/shared/sanitize.js to maintain
// consistent behavior across client and server. Update both places
// if the allowed character set or processing steps change.
const sanitizeInput = (input, maxLength = 10000) => {
  if (typeof input !== 'string') return input;

  const clean = sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  });

  return clean
    .trim()
    .replace(/[^\p{L}\p{N}\p{P}\p{Zs}\n\r]/gu, '')
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
