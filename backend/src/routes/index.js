// backend/src/routes/index.js
const express = require('express');
const authRoutes = require('./auth');
const coursesRoutes = require('./courses');
const aiRoutes = require('./ai');
const onboardingRoutes = require('./onboardingRoutes');

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
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    hasJwtSecret: !!process.env.JWT_SECRET,
    hasDatabaseUrl: !!process.env.DATABASE_URL
  });
});

module.exports = router;
