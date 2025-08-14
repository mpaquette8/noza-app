// backend/src/controllers/courseController.js
const { prisma } = require('../config/database');
const { createResponse, validateCourseParams, sanitizeInput, logger, mapLegacyParams } = require('../utils/helpers');
const { HTTP_STATUS, ERROR_MESSAGES, LIMITS } = require('../utils/constants');
const anthropicService = require('../services/anthropicService');

class CourseController {
  // Récupérer tous les cours de l'utilisateur
  async getAllCourses(req, res) {
    try {
      const courses = await prisma.course.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: LIMITS.MAX_HISTORY_ITEMS,
        select: {
          id: true,
          subject: true,
          detailLevel: true,
          vulgarizationLevel: true,
          style: true,
          duration: true,
          intent: true,
          createdAt: true
        }
      });

      const { response } = createResponse(true, { courses });
      res.json(response);
    } catch (error) {
      logger.error('Erreur récupération cours', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }

  // Récupérer un cours spécifique
  async getCourse(req, res) {
    try {
      const { id } = req.params;
      
      const course = await prisma.course.findFirst({
        where: {
          id,
          userId: req.user.id
        }
      });

      if (!course) {
        const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.COURSE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
        return res.status(statusCode).json(response);
      }

      const { response } = createResponse(true, { course });
      res.json(response);
    } catch (error) {
      logger.error('Erreur récupération cours', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }

  // Générer un nouveau cours
  async generateCourse(req, res) {
    try {
      const { subject, detailLevel, vulgarizationLevel, style, duration, intent } = req.body;

      const deprecatedFields = [];
      if (detailLevel != null) deprecatedFields.push('detailLevel');
      if (vulgarizationLevel != null) deprecatedFields.push('vulgarizationLevel');
      const hasDeprecatedParams = deprecatedFields.length > 0;

      if (hasDeprecatedParams) {
        logger.warn('Utilisation de paramètres dépréciés', { deprecatedFields });
      }

      const isLegacyPayload = (style == null && duration == null && intent == null) && hasDeprecatedParams;

      // Conversion et valeurs par défaut
      const params = mapLegacyParams({ detailLevel, vulgarizationLevel, style, duration, intent });

      // Validation
      const validationErrors = validateCourseParams(subject, params.style, params.duration, params.intent);
      if (validationErrors.length > 0) {
        const { response, statusCode } = createResponse(false, null, validationErrors.join(', '), HTTP_STATUS.BAD_REQUEST);
        return res.status(statusCode).json(response);
      }

      // Sanitisation
      const sanitizedSubject = sanitizeInput(subject, 500);

      // Génération du cours
      const courseContent = await anthropicService.generateCourse(
        sanitizedSubject,
        params.style,
        params.duration,
        params.intent
      );

      // Sauvegarde en base
      const savedCourse = await prisma.course.create({
        data: {
          subject: sanitizedSubject,
          content: courseContent,
          detailLevel: parseInt(params.detailLevel),
          vulgarizationLevel: parseInt(params.vulgarizationLevel),
          style: params.style,
          duration: params.duration,
          intent: params.intent,
          userId: req.user.id
        }
      });

      logger.success('Cours généré et sauvegardé', {
        courseId: savedCourse.id,
        userId: req.user.id,
        style: params.style,
        duration: params.duration,
        intent: params.intent,
        isLegacyPayload
      });

      const { response, statusCode } = createResponse(true, { course: savedCourse }, null, HTTP_STATUS.CREATED);

      if (hasDeprecatedParams) {
        response.deprecatedParams = deprecatedFields;
        res.set('X-Deprecated-Params', deprecatedFields.join(','));
      }

      res.status(statusCode).json(response);
    } catch (error) {
      logger.error('Erreur génération cours', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }

  // Supprimer un cours
  async deleteCourse(req, res) {
    try {
      const { id } = req.params;

      const course = await prisma.course.findFirst({
        where: {
          id,
          userId: req.user.id
        }
      });

      if (!course) {
        const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.COURSE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
        return res.status(statusCode).json(response);
      }

      await prisma.course.delete({
        where: { id }
      });

      logger.info('Cours supprimé', { courseId: id, userId: req.user.id });

      const { response } = createResponse(true, { message: 'Cours supprimé' });
      res.json(response);
    } catch (error) {
      logger.error('Erreur suppression cours', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }
}

module.exports = new CourseController();