// backend/src/routes/auth.js
const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validation');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

// Routes publiques existantes
router.post('/register', registerValidation, asyncHandler(authController.register));
router.post('/login', loginValidation, asyncHandler(authController.login));

// NOUVELLE ROUTE : Authentification Google
router.post('/google', asyncHandler(authController.googleAuth));

// Routes protégées existantes
router.get('/profile', authenticate, asyncHandler(authController.getProfile));

module.exports = router;