// backend/src/routes/auth.js
const express = require('express');
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { registerValidation, loginValidation } = require('../middleware/validation');
const { asyncHandler } = require('../utils/helpers');
const rateLimit = require('express-rate-limit');
const { RATE_LIMITS, ERROR_MESSAGES } = require('../utils/constants');
const { checkBlacklist } = require('../middleware/blacklist');

const router = express.Router();

// Créateur de limiteur de requêtes
const createRateLimiter = ({ WINDOW_MS, MAX }) => rateLimit({
  windowMs: WINDOW_MS,
  max: MAX,
  message: ERROR_MESSAGES.RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false
});

// Limiteurs spécifiques aux routes d'authentification
const loginLimiter = createRateLimiter(RATE_LIMITS.AUTH.LOGIN);
const googleLimiter = createRateLimiter(RATE_LIMITS.AUTH.GOOGLE);

// Contrôle de blacklist pour toutes les routes d'authentification
router.use(checkBlacklist);

// Routes publiques existantes
router.post('/register', registerValidation, asyncHandler(authController.register));
router.post('/login', loginLimiter, loginValidation, asyncHandler(authController.login));

// NOUVELLE ROUTE : Authentification Google
router.post('/google', googleLimiter, asyncHandler(authController.googleAuth));

// Routes protégées existantes
router.get('/profile', authenticate, asyncHandler(authController.getProfile));

module.exports = router;
