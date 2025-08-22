// backend/src/presentation/controllers/aiController.js
const { createResponse, sanitizeInput, logger } = require('../../infrastructure/utils/helpers');
const { HTTP_STATUS, ERROR_MESSAGES, ERROR_CODES, AI_ERROR_MESSAGES, LIMITS } = require('../../infrastructure/utils/constants');
const { prisma } = require('../../infrastructure/database');
const anthropicService = require('../../application/services/anthropicService');

class AiController {
  // Répondre à une question
  async askQuestion(req, res) {
    if (anthropicService.isOffline()) {
      const { response, statusCode } = createResponse(false, null, 'Service IA indisponible, réessayez plus tard', HTTP_STATUS.SERVICE_UNAVAILABLE);
      return res.status(statusCode).json(response);
    }
    try {
      const { question, courseContent, level = 'intermediate', questionType = 'auto' } = req.body;

      if (!question) {
        const { response, statusCode } = createResponse(false, null, 'Question requise', HTTP_STATUS.BAD_REQUEST);
        return res.status(statusCode).json(response);
      }

      // Sanitisation
      const sanitizedQuestion = sanitizeInput(question, 2000);

      // Générer la réponse
      const result = await anthropicService.answerQuestion(
        sanitizedQuestion,
        courseContent,
        level
      );

      logger.info('Question traitée', { 
        userId: req.user.id, 
        questionType: result.questionType,
        level 
      });

      const { response } = createResponse(true, {
        answer: result.answer,
        questionType: result.questionType,
        level: level
      });

      res.json(response);
    } catch (error) {
      logger.error('Erreur réponse question', { error, code: error.code });
      if (error.offline) {
        const { response, statusCode } = createResponse(false, null, 'Service IA indisponible, réessayez plus tard', HTTP_STATUS.SERVICE_UNAVAILABLE);
        return res.status(statusCode).json(response);
      }
      let message = AI_ERROR_MESSAGES[error.code] || ERROR_MESSAGES.SERVER_ERROR;
      let status = HTTP_STATUS.SERVER_ERROR;
      if (error.code === ERROR_CODES.IA_TIMEOUT) {
        status = HTTP_STATUS.SERVICE_UNAVAILABLE;
      } else if (error.code === ERROR_CODES.QUOTA_EXCEEDED) {
        status = HTTP_STATUS.RATE_LIMIT;
      }
      const { response, statusCode } = createResponse(false, null, message, status, error.code);
      res.status(statusCode).json(response);
    }
  }

  // Générer un quiz
  async generateQuiz(req, res) {
    if (anthropicService.isOffline()) {
      const { response, statusCode } = createResponse(false, null, 'Service IA indisponible, réessayez plus tard', HTTP_STATUS.SERVICE_UNAVAILABLE);
      return res.status(statusCode).json(response);
    }
    try {
      const { courseContent } = req.body;

      if (!courseContent) {
        const { response, statusCode } = createResponse(false, null, 'Contenu du cours requis', HTTP_STATUS.BAD_REQUEST);
        return res.status(statusCode).json(response);
      }

      // Générer le quiz
      const quiz = await anthropicService.generateQuiz(courseContent);

      logger.info('Quiz généré', { 
        userId: req.user.id, 
        questionsCount: quiz.questions.length 
      });

      const { response } = createResponse(true, { quiz });
      res.json(response);
    } catch (error) {
      logger.error('Erreur génération quiz', { error, code: error.code });
      if (error.offline) {
        const { response, statusCode } = createResponse(false, null, 'Service IA indisponible, réessayez plus tard', HTTP_STATUS.SERVICE_UNAVAILABLE);
        return res.status(statusCode).json(response);
      }
      let message = AI_ERROR_MESSAGES[error.code] || ERROR_MESSAGES.SERVER_ERROR;
      let status = HTTP_STATUS.SERVER_ERROR;
      if (error.code === ERROR_CODES.IA_TIMEOUT) {
        status = HTTP_STATUS.SERVICE_UNAVAILABLE;
      } else if (error.code === ERROR_CODES.QUOTA_EXCEEDED) {
        status = HTTP_STATUS.RATE_LIMIT;
      }
      const { response, statusCode } = createResponse(false, null, message, status, error.code);
      res.status(statusCode).json(response);
    }
  }

  // Générer un quiz à la demande
  async generateOnDemandQuiz(req, res) {
    if (anthropicService.isOffline()) {
      const { response, statusCode } = createResponse(false, null, 'Service IA indisponible, réessayez plus tard', HTTP_STATUS.SERVICE_UNAVAILABLE);
      return res.status(statusCode).json(response);
    }
    try {
      const { subject, level = 'intermediate', questionCount = 5 } = req.body;

      if (!subject) {
        const { response, statusCode } = createResponse(false, null, 'Sujet requis', HTTP_STATUS.BAD_REQUEST);
        return res.status(statusCode).json(response);
      }

      const allowedLevels = ['beginner', 'intermediate', 'expert', 'hybrid', 'hybridExpert'];
      if (!allowedLevels.includes(level)) {
        const { response, statusCode } = createResponse(false, null, 'Niveau invalide', HTTP_STATUS.BAD_REQUEST);
        return res.status(statusCode).json(response);
      }

      const count = parseInt(questionCount, 10);
      if (isNaN(count) || count < 1 || count > LIMITS.MAX_QUIZ_QUESTIONS) {
        const { response, statusCode } = createResponse(false, null, 'Nombre de questions invalide', HTTP_STATUS.BAD_REQUEST);
        return res.status(statusCode).json(response);
      }

      const sanitizedSubject = sanitizeInput(subject, 200);
      const questions = await anthropicService.generateOnDemandQuiz(sanitizedSubject, level, count);

      await prisma.quiz.create({
        data: {
          subject: sanitizedSubject,
          level,
          type: 'ondemand',
          questions,
          userId: req.user.id
        }
      });

      logger.info('Quiz à la demande généré', {
        userId: req.user.id,
        subject: sanitizedSubject,
        level,
        questionsCount: questions.length
      });

      const { response } = createResponse(true, { quiz: { questions } });
      res.json(response);
    } catch (error) {
      logger.error('Erreur génération quiz à la demande', { error, code: error.code });
      if (error.offline) {
        const { response, statusCode } = createResponse(false, null, 'Service IA indisponible, réessayez plus tard', HTTP_STATUS.SERVICE_UNAVAILABLE);
        return res.status(statusCode).json(response);
      }
      let message = AI_ERROR_MESSAGES[error.code] || ERROR_MESSAGES.SERVER_ERROR;
      let status = HTTP_STATUS.SERVER_ERROR;
      if (error.code === ERROR_CODES.IA_TIMEOUT) {
        status = HTTP_STATUS.SERVICE_UNAVAILABLE;
      } else if (error.code === ERROR_CODES.QUOTA_EXCEEDED) {
        status = HTTP_STATUS.RATE_LIMIT;
      }
      const { response, statusCode } = createResponse(false, null, message, status, error.code);
      res.status(statusCode).json(response);
    }
  }

  // Récupérer l'historique des quiz
  async getQuizHistory(req, res) {
    try {
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), LIMITS.MAX_HISTORY_ITEMS);
      const skip = (page - 1) * limit;
      const { type } = req.query;

      const where = { userId: req.user.id };
      if (type) {
        where.type = type;
      }

      const [quizzes, total] = await prisma.$transaction([
        prisma.quiz.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            subject: true,
            level: true,
            type: true,
            questions: true,
            createdAt: true
          }
        }),
        prisma.quiz.count({ where })
      ]);

      const formatted = quizzes.map((q) => ({
        id: q.id,
        subject: q.subject,
        level: q.level,
        type: q.type,
        questionCount: Array.isArray(q.questions)
          ? q.questions.length
          : Array.isArray(q.questions?.questions)
          ? q.questions.questions.length
          : 0,
        createdAt: q.createdAt
      }));

      const pagination = {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      };

      const { response } = createResponse(true, { quizzes: formatted, pagination });
      res.json(response);
    } catch (error) {
      logger.error('Erreur récupération historique quiz', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }

  // Suggérer des questions
  async suggestQuestions(req, res) {
    if (anthropicService.isOffline()) {
      const { response, statusCode } = createResponse(false, null, 'Service IA indisponible, réessayez plus tard', HTTP_STATUS.SERVICE_UNAVAILABLE);
      return res.status(statusCode).json(response);
    }
    try {
      const { courseContent, level = 'intermediate' } = req.body;

      if (!courseContent) {
        const { response, statusCode } = createResponse(false, null, 'Contenu du cours requis', HTTP_STATUS.BAD_REQUEST);
        return res.status(statusCode).json(response);
      }

      // Générer les suggestions
      const suggestions = await anthropicService.suggestQuestions(courseContent, level);

      logger.info('Suggestions générées', { 
        userId: req.user.id, 
        suggestionsCount: suggestions.length 
      });

      const { response } = createResponse(true, { suggestions });
      res.json(response);
    } catch (error) {
      logger.error('Erreur suggestions questions', { error, code: error.code });
      if (error.offline) {
        const { response, statusCode } = createResponse(false, null, 'Service IA indisponible, réessayez plus tard', HTTP_STATUS.SERVICE_UNAVAILABLE);
        return res.status(statusCode).json(response);
      }
      let message = AI_ERROR_MESSAGES[error.code] || ERROR_MESSAGES.SERVER_ERROR;
      let status = HTTP_STATUS.SERVER_ERROR;
      if (error.code === ERROR_CODES.IA_TIMEOUT) {
        status = HTTP_STATUS.SERVICE_UNAVAILABLE;
      } else if (error.code === ERROR_CODES.QUOTA_EXCEEDED) {
        status = HTTP_STATUS.RATE_LIMIT;
      }
      const { response, statusCode } = createResponse(false, null, message, status, error.code);
      res.status(statusCode).json(response);
    }
  }

  // Obtenir un sujet aléatoire
  async getRandomSubject(req, res) {
    try {
      const { category } = req.query;
      
      const result = anthropicService.getRandomSubject(category);

      logger.info('Sujet aléatoire généré', { 
        userId: req.user.id, 
        category: result.category 
      });

      const { response } = createResponse(true, {
        subject: result.subject,
        category: result.category,
        totalSubjects: result.totalSubjects
      });

      res.json(response);
    } catch (error) {
      logger.error('Erreur génération sujet aléatoire', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }

  // Obtenir toutes les catégories disponibles
  async getSubjectCategories(req, res) {
    try {
      const result = anthropicService.getSubjectCategories();

      const { response } = createResponse(true, {
        categories: result.categories,
        stats: result.stats
      });

      res.json(response);
    } catch (error) {
      logger.error('Erreur récupération catégories', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }
}
const aiController = new AiController();

// Vérifie périodiquement si le service Anthropic est de nouveau disponible
const RECOVERY_INTERVAL = 60 * 1000; // 1 minute
setInterval(() => {
  if (anthropicService.isOffline()) {
    anthropicService.recoverIfOffline();
  }
}, RECOVERY_INTERVAL);

module.exports = aiController;
