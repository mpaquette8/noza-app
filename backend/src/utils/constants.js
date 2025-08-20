// backend/src/utils/constants.js

// Niveaux de détail
const DETAIL_LEVELS = {
  SYNTHESIS: 1,
  DETAILED: 2,
  EXHAUSTIVE: 3
};

// Niveaux de vulgarisation (nouveau format)
const VULGARIZATION_LEVELS = {
  GENERAL_PUBLIC: 'general_public',
  ENLIGHTENED: 'enlightened',
  KNOWLEDGEABLE: 'knowledgeable',
  EXPERT: 'expert'
};

// Ancien mapping numérique conservé pour rétrocompatibilité
const LEGACY_VULGARIZATION_LEVELS = {
  GENERAL_PUBLIC: 1,
  ENLIGHTENED: 2,
  KNOWLEDGEABLE: 3,
  EXPERT: 4
};

// Types d'enseignants
const TEACHER_TYPES = {
  METHODICAL: 'methodical',
  PASSIONATE: 'passionate',
  ANALOGIST: 'analogist',
  PRAGMATIC: 'pragmatic',
  BENEVOLENT: 'benevolent',
  SYNTHETIC: 'synthetic'
};

// Durées estimées des cours
const DURATIONS = {
  SHORT: 'short',
  MEDIUM: 'medium',
  LONG: 'long'
};

// Types de questions
const QUESTION_TYPES = {
  COURSE_RELATED: 'course-related',
  GENERAL: 'general',
  AUTO: 'auto'
};

// Limites
const LIMITS = {
  MAX_COURSE_LENGTH: 6000,
  MAX_QUESTION_LENGTH: 500,
  MAX_QUIZ_QUESTIONS: 10,
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: 100,
  MAX_HISTORY_ITEMS: 50
};

// Codes d'erreur spécifiques à l'IA
const ERROR_CODES = {
  IA_TIMEOUT: 'IA_TIMEOUT',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  IA_ERROR: 'IA_ERROR',
  IA_OVERLOADED: 'IA_OVERLOADED'
};

// Libellés conviviaux pour les erreurs IA
const AI_ERROR_MESSAGES = {
  [ERROR_CODES.IA_TIMEOUT]: "Temps de réponse de l'IA dépassé",
  [ERROR_CODES.QUOTA_EXCEEDED]: 'Quota IA dépassé, réessayez plus tard',
  [ERROR_CODES.IA_ERROR]: 'Erreur du service IA, réessayez plus tard',
  [ERROR_CODES.IA_OVERLOADED]: 'Service IA surchargé, réessayez plus tard'
};

// Quotas de rate limiting par type de route
const RATE_LIMITS = {
  AI: {
    ASK_QUESTION: { WINDOW_MS: 60 * 60 * 1000, MAX: 5 }, // 5 requêtes/heure
    GENERATE_QUIZ: { WINDOW_MS: 60 * 60 * 1000, MAX: 5 },
    SUGGEST_QUESTIONS: { WINDOW_MS: 60 * 60 * 1000, MAX: 5 },
    RANDOM_SUBJECT: { WINDOW_MS: 60 * 60 * 1000, MAX: 5 },
    SUBJECT_CATEGORIES: { WINDOW_MS: 60 * 60 * 1000, MAX: 5 }
  },
  AUTH: {
    LOGIN: { WINDOW_MS: 60 * 60 * 1000, MAX: 15 },
    GOOGLE: { WINDOW_MS: 60 * 60 * 1000, MAX: 5 }
  }
};

// Messages d'erreur standardisés
const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Non autorisé',
  FORBIDDEN: 'Accès interdit',
  NOT_FOUND: 'Ressource non trouvée',
  VALIDATION_ERROR: 'Données invalides',
  SERVER_ERROR: 'Erreur serveur interne',
  RATE_LIMIT: 'Trop de requêtes',
  COURSE_NOT_FOUND: 'Cours non trouvé',
  INVALID_PARAMETERS: 'Paramètres invalides'
};

// Statuts HTTP
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMIT: 429,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};


module.exports = {
  DETAIL_LEVELS,
  VULGARIZATION_LEVELS,
  LEGACY_VULGARIZATION_LEVELS,
  TEACHER_TYPES,
  QUESTION_TYPES,
  LIMITS,
  RATE_LIMITS,
  ERROR_MESSAGES,
  HTTP_STATUS,
  ERROR_CODES,
  AI_ERROR_MESSAGES,
  DURATIONS
};
