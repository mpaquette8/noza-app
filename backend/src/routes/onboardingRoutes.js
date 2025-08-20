// backend/src/routes/onboardingRoutes.js
const express = require('express');
const onboardingController = require('../controllers/onboardingController');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Routes d'onboarding
router.get('/config', asyncHandler(onboardingController.getConfig));
router.post('/complete', asyncHandler(onboardingController.complete));
router.get('/profile', asyncHandler(onboardingController.getProfile));
router.get('/status', asyncHandler(onboardingController.getStatus));
router.post('/preference', asyncHandler(onboardingController.addPreference));

module.exports = router;
