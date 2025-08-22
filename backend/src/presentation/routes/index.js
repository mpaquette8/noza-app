// backend/src/presentation/routes/index.js
const express = require('express');
const authRoutes = require('./auth');
const coursesRoutes = require('./courses');
const aiRoutes = require('./ai');
const onboardingRoutes = require('./onboardingRoutes');
const { api: apiConfig, jwt: jwtConfig, database: dbConfig } = require('../../config');

const router = express.Router();

// Monter les routes
router.use('/auth', authRoutes);
router.use('/courses', coursesRoutes);
router.use('/ai', aiRoutes);
router.use('/onboarding', onboardingRoutes);

// Route de santé
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    hasAnthropicKey: !!apiConfig.anthropicApiKey,
    hasJwtSecret: !!jwtConfig.secret,
    hasDatabaseUrl: !!dbConfig.url
  });
});

module.exports = router;
