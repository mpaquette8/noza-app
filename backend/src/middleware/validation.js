// backend/src/middleware/validation.js
const { body, validationResult } = require('express-validator');
const { createResponse } = require('../utils/helpers');
const { HTTP_STATUS, DURATIONS, VULGARIZATION_LEVELS, INTENSITY_LEVELS } = require('../utils/constants');

// Middleware pour gérer les erreurs de validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    const { response, statusCode } = createResponse(false, null, errorMessages.join(', '), HTTP_STATUS.BAD_REQUEST);
    return res.status(statusCode).json(response);
  }
  next();
};

// Règles de validation pour l'inscription
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Le nom doit contenir au moins 2 caractères'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  handleValidationErrors
];

// Règles de validation pour la connexion
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('password')
    .exists()
    .withMessage('Mot de passe requis'),
  handleValidationErrors
];

// Règles de validation pour les cours
const courseValidation = [
  body('subject')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Le sujet doit faire entre 1 et 500 caractères'),
  body('intensity')
    .optional()
    .isIn(Object.values(INTENSITY_LEVELS))
    .withMessage("Niveau d'intensité invalide"),
  body('teacher_type')
    .optional()
    .isIn(['calculator', 'experimenter', 'memorizer', 'spark', 'builder', 'storyteller', 'lightning'])
    .withMessage("Type d'enseignant invalide"),
  body('vulgarization')
    .optional()
    .isIn(Object.values(VULGARIZATION_LEVELS))
    .withMessage('Niveau de vulgarisation invalide'),
  body('duration')
    .optional()
    .isIn(Object.values(DURATIONS))
    .withMessage('Durée invalide'),

  // Alias de compatibilité
  body('teacherType')
    .optional()
    .isIn(['calculator', 'experimenter', 'memorizer', 'spark', 'builder', 'storyteller', 'lightning'])
    .withMessage("Type d'enseignant invalide"),
  body('vulgarizationLevel')
    .optional()
    .isInt({ min: 1, max: 4 })
    .withMessage('Niveau de vulgarisation legacy invalide'),
  body('detailLevel')
    .optional()
    .isInt({ min: 1, max: 3 })
    .withMessage('Niveau de détail invalide'),
  handleValidationErrors
];

// Règles de validation pour les questions
const questionValidation = [
  body('question')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('La question doit faire entre 1 et 2000 caractères'),
  handleValidationErrors
];

module.exports = {
  registerValidation,
  loginValidation,
  courseValidation,
  questionValidation,
  handleValidationErrors
};
