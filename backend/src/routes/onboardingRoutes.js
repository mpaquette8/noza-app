// backend/src/routes/onboardingRoutes.js
const express = require('express');
const onboardingController = require('../controllers/onboardingController');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Routes d'onboarding
router.get('/config', asyncHandler(onboardingController.getConfig.bind(onboardingController)));
router.post('/complete', asyncHandler(onboardingController.complete.bind(onboardingController)));
router.get('/profile', asyncHandler(onboardingController.getProfile.bind(onboardingController)));
router.get('/status', asyncHandler(onboardingController.getStatus.bind(onboardingController)));
router.post('/preference', asyncHandler(onboardingController.addPreference.bind(onboardingController)));

module.exports = router;
