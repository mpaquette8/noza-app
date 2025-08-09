// backend/src/middleware/validation.js
const { body, validationResult } = require('express-validator');
const { createResponse } = require('../utils/helpers');
const { HTTP_STATUS } = require('../utils/constants');

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
    .isLength({ min: 1 })
    .withMessage('Le sujet est requis'),
  body('detailLevel')
    .isInt({ min: 1, max: 3 })
    .withMessage('Niveau de détail invalide'),
  body('vulgarizationLevel')
    .isInt({ min: 1, max: 4 })
    .withMessage('Niveau de vulgarisation invalide'),
  handleValidationErrors
];

module.exports = {
  registerValidation,
  loginValidation,
  courseValidation,
  handleValidationErrors
};