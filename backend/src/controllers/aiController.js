// backend/src/controllers/aiController.js
const { createResponse, sanitizeInput, logger } = require('../utils/helpers');
const { HTTP_STATUS, ERROR_MESSAGES, ERROR_CODES } = require('../utils/constants');
const anthropicService = require('../services/anthropicService');

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
      let message = ERROR_MESSAGES.SERVER_ERROR;
      let status = HTTP_STATUS.SERVER_ERROR;
      if (error.code === ERROR_CODES.IA_TIMEOUT) {
        message = 'Temps dépassé lors de la réponse de l\'IA';
        status = HTTP_STATUS.SERVICE_UNAVAILABLE;
      } else if (error.code === ERROR_CODES.QUOTA_EXCEEDED) {
        message = 'Quota IA dépassé, réessayez plus tard';
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
      let message = ERROR_MESSAGES.SERVER_ERROR;
      let status = HTTP_STATUS.SERVER_ERROR;
      if (error.code === ERROR_CODES.IA_TIMEOUT) {
        message = 'Temps dépassé lors de la génération du quiz';
        status = HTTP_STATUS.SERVICE_UNAVAILABLE;
      } else if (error.code === ERROR_CODES.QUOTA_EXCEEDED) {
        message = 'Quota IA dépassé, réessayez plus tard';
        status = HTTP_STATUS.RATE_LIMIT;
      }
      const { response, statusCode } = createResponse(false, null, message, status, error.code);
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
      let message = ERROR_MESSAGES.SERVER_ERROR;
      let status = HTTP_STATUS.SERVER_ERROR;
      if (error.code === ERROR_CODES.IA_TIMEOUT) {
        message = 'Temps dépassé lors de la génération des suggestions';
        status = HTTP_STATUS.SERVICE_UNAVAILABLE;
      } else if (error.code === ERROR_CODES.QUOTA_EXCEEDED) {
        message = 'Quota IA dépassé, réessayez plus tard';
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

module.exports = new AiController();
