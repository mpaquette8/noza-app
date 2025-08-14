// backend/src/routes/ai.js
const express = require('express');
const aiController = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../utils/helpers');
const { questionValidation } = require('../middleware/validation');
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

// Limiteurs pour chaque route
const askQuestionLimiter = createRateLimiter(RATE_LIMITS.AI.ASK_QUESTION);
const generateQuizLimiter = createRateLimiter(RATE_LIMITS.AI.GENERATE_QUIZ);
const suggestQuestionsLimiter = createRateLimiter(RATE_LIMITS.AI.SUGGEST_QUESTIONS);
const randomSubjectLimiter = createRateLimiter(RATE_LIMITS.AI.RANDOM_SUBJECT);
const subjectCategoriesLimiter = createRateLimiter(RATE_LIMITS.AI.SUBJECT_CATEGORIES);

// Toutes les routes nécessitent une authentification
router.use(authenticate);
// Contrôle de blacklist
router.use(checkBlacklist);

// Routes IA
router.post('/ask-question', askQuestionLimiter, questionValidation, asyncHandler(aiController.askQuestion));
router.post('/generate-quiz', generateQuizLimiter, asyncHandler(aiController.generateQuiz));
router.post('/suggest-questions', suggestQuestionsLimiter, asyncHandler(aiController.suggestQuestions));
router.get('/random-subject', randomSubjectLimiter, asyncHandler(aiController.getRandomSubject));
router.get('/subject-categories', subjectCategoriesLimiter, asyncHandler(aiController.getSubjectCategories));

module.exports = router;
