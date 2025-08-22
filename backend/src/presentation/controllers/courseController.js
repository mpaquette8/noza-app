// backend/src/presentation/controllers/courseController.js
const { createResponse, logger } = require('../../infrastructure/utils/helpers');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../../infrastructure/utils/constants');
const { GenerateCourseDTO } = require('../../application/dto/courseDto');
const { validateGenerateCourseDTO } = require('../../application/validators/courseValidator');
const container = require('../../infrastructure/container');

class CourseController {
  async generateCourse(req, res) {
    try {
      const dto = new GenerateCourseDTO(req.body);
      const errors = validateGenerateCourseDTO(dto);
      if (errors.length) {
        const { response, statusCode } = createResponse(false, null, errors.join(', '), HTTP_STATUS.BAD_REQUEST);
        return res.status(statusCode).json(response);
      }

      const useCase = container.resolve('generateCourseUseCase');
      const course = await useCase.execute({ userId: req.user.id, ...dto });
      const { response, statusCode } = createResponse(true, { course }, null, HTTP_STATUS.CREATED);
      res.status(statusCode).json(response);
    } catch (error) {
      logger.error('Erreur génération cours', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }
}

module.exports = new CourseController();
