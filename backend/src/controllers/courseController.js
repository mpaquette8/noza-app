// backend/src/controllers/courseController.js
const { prisma } = require('../config/database');
const { createResponse, validateCourseParams, sanitizeInput, logger, mapLegacyParams } = require('../utils/helpers');
const { HTTP_STATUS, ERROR_MESSAGES, LIMITS, ERROR_CODES, INTENSITY_LEVELS, INTENSITY_TO_CONFIG } = require('../utils/constants');
const anthropicService = require('../services/anthropicService');
const crypto = require('crypto');

class CourseController {
  // Récupérer tous les cours de l'utilisateur
  async getAllCourses(req, res) {
    try {
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), LIMITS.MAX_HISTORY_ITEMS);
      const skip = (page - 1) * limit;

      const [courses, total] = await prisma.$transaction([
        prisma.course.findMany({
          where: { userId: req.user.id },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          select: {
            id: true,
            subject: true,
            detailLevel: true,
            vulgarizationLevel: true,
            vulgarization: true,
            duration: true,
            teacherType: true,
            createdAt: true
          }
        }),
        prisma.course.count({ where: { userId: req.user.id } })
      ]);

      const pagination = {
        page,
        limit,
        total
      };

      const { response } = createResponse(true, { courses, pagination });
      const etag =
        '"' +
        crypto
          .createHash('md5')
          .update(JSON.stringify({ courses, page, limit }))
          .digest('hex') +
        '"';
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
      res.set('ETag', etag);
      res.set('Cache-Control', 'private, max-age=60');
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
      const etag = '"' + crypto.createHash('md5').update(JSON.stringify(course)).digest('hex') + '"';
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
      res.set('ETag', etag);
      res.set('Cache-Control', 'private, max-age=60');
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
        const {
          subject,
          detailLevel,
          vulgarizationLevel,
          teacherType,
          teacher_type,
          duration,
          vulgarization,
          intensity
        } = req.body;

      const deprecatedFields = [];
      if (detailLevel != null) deprecatedFields.push('detailLevel');
      if (vulgarizationLevel != null) deprecatedFields.push('vulgarizationLevel');
      const hasDeprecatedParams = deprecatedFields.length > 0;

      if (hasDeprecatedParams) {
        logger.warn('Utilisation de paramètres dépréciés', { deprecatedFields });
      }

        const isLegacyPayload =
          intensity == null &&
          teacherType == null &&
          teacher_type == null &&
          duration == null &&
          vulgarization == null &&
          hasDeprecatedParams;

      // Conversion et valeurs par défaut
        const params = mapLegacyParams({
          detailLevel,
          vulgarizationLevel,
          teacherType: teacher_type ?? teacherType,
          duration,
          vulgarization,
        });

        let selectedIntensity = intensity;
        if (selectedIntensity) {
          const cfg = INTENSITY_TO_CONFIG[selectedIntensity] || INTENSITY_TO_CONFIG[INTENSITY_LEVELS.BALANCED];
          params.duration = cfg.duration;
          params.vulgarization = cfg.vulgarization;
          const mapped = mapLegacyParams({
            duration: params.duration,
            vulgarization: params.vulgarization,
            teacherType: params.teacherType
          });
          params.detailLevel = mapped.detailLevel;
          params.vulgarizationLevel = mapped.vulgarizationLevel;
        } else {
          selectedIntensity = INTENSITY_LEVELS.BALANCED;
        }

      // Validation
      const validationErrors = validateCourseParams(
        subject,
          params.vulgarization,
          params.duration,
          params.teacherType
        );
      if (validationErrors.length > 0) {
        const { response, statusCode } = createResponse(false, null, validationErrors.join(', '), HTTP_STATUS.BAD_REQUEST);
        return res.status(statusCode).json(response);
      }

      // Sanitisation
      const sanitizedSubject = sanitizeInput(subject, 500);

      // Génération du cours
        const courseContent = await anthropicService.generateCourse(
          sanitizedSubject,
          selectedIntensity,
          params.teacherType
        );

      // Sauvegarde en base
      const savedCourse = await prisma.course.create({
        data: {
          subject: sanitizedSubject,
          content: courseContent,
          detailLevel: parseInt(params.detailLevel),
          vulgarizationLevel: parseInt(params.vulgarizationLevel),
            teacherType: params.teacherType,
            duration: params.duration,
            vulgarization: params.vulgarization,
            userId: req.user.id
          }
        });

      logger.success('Cours généré et sauvegardé', {
        courseId: savedCourse.id,
        userId: req.user.id,
          teacherType: params.teacherType,
          duration: params.duration,
          vulgarization: params.vulgarization,
          intensity: selectedIntensity,
          isLegacyPayload
        });

      const { response, statusCode } = createResponse(true, { course: savedCourse }, null, HTTP_STATUS.CREATED);

      if (hasDeprecatedParams) {
        response.deprecatedParams = deprecatedFields;
        res.set('X-Deprecated-Params', deprecatedFields.join(','));
      }

      res.status(statusCode).json(response);
    } catch (error) {
      logger.error('Erreur génération cours', { error, code: error.code });
      let message = ERROR_MESSAGES.SERVER_ERROR;
      let status = HTTP_STATUS.SERVER_ERROR;
      if (error.code === ERROR_CODES.IA_TIMEOUT) {
        message = 'Temps dépassé lors de la génération du cours';
        status = HTTP_STATUS.SERVICE_UNAVAILABLE;
      } else if (error.code === ERROR_CODES.QUOTA_EXCEEDED) {
        message = 'Quota IA dépassé, réessayez plus tard';
        status = HTTP_STATUS.RATE_LIMIT;
      } else if (error.code === ERROR_CODES.IA_OVERLOADED) {
        message = 'Service IA surchargé, réessayez plus tard';
        status = HTTP_STATUS.SERVICE_UNAVAILABLE;
      }
      const { response, statusCode } = createResponse(false, null, message, status, error.code);
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
