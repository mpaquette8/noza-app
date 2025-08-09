// backend/src/routes/ai.js
const express = require('express');
const aiController = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// Routes IA
router.post('/ask-question', asyncHandler(aiController.askQuestion));
router.post('/generate-quiz', asyncHandler(aiController.generateQuiz));
router.post('/suggest-questions', asyncHandler(aiController.suggestQuestions));
router.get('/random-subject', asyncHandler(aiController.getRandomSubject));
router.get('/subject-categories', asyncHandler(aiController.getSubjectCategories));

module.exports = router;