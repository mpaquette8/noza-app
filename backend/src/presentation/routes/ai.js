// backend/src/presentation/routes/ai.js
const express = require('express');
const aiController = require('../controllers/aiController');
const { authenticate } = require('../../infrastructure/middleware/auth');
const { asyncHandler } = require('../../infrastructure/utils/helpers');
const { questionValidation } = require('../../infrastructure/middleware/validation');
const rateLimit = require('express-rate-limit');
const { RATE_LIMITS, ERROR_MESSAGES } = require('../../infrastructure/utils/constants');
const { checkBlacklist } = require('../../infrastructure/middleware/blacklist');

const router = express.Router();

// Créateur de limiteur de requêtes
const createRateLimiter = ({ WINDOW_MS, MAX }) => rateLimit({
  windowMs: WINDOW_MS,
  max: MAX,
  message: ERROR_MESSAGES.RATE_LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
  validate: process.env.NODE_ENV === 'production'
});

// Limiteurs pour chaque route
const askQuestionLimiter = createRateLimiter(RATE_LIMITS.AI.ASK_QUESTION);
const generateQuizLimiter = createRateLimiter(RATE_LIMITS.AI.GENERATE_QUIZ);
const suggestQuestionsLimiter = createRateLimiter(RATE_LIMITS.AI.SUGGEST_QUESTIONS);
const randomSubjectLimiter = createRateLimiter(RATE_LIMITS.AI.RANDOM_SUBJECT);
const subjectCategoriesLimiter = createRateLimiter(RATE_LIMITS.AI.SUBJECT_CATEGORIES);
const generateOnDemandQuizLimiter = createRateLimiter(RATE_LIMITS.AI.GENERATE_QUIZ);
const quizHistoryLimiter = createRateLimiter(RATE_LIMITS.AI.SUGGEST_QUESTIONS);

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
router.post('/generate-ondemand-quiz', generateOnDemandQuizLimiter, asyncHandler(aiController.generateOnDemandQuiz));
router.get('/quiz-history', quizHistoryLimiter, asyncHandler(aiController.getQuizHistory));

module.exports = router;
