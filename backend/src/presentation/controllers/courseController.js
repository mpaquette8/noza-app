// backend/src/presentation/controllers/courseController.js
const { createResponse, logger } = require('../../infrastructure/utils/helpers');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../../infrastructure/utils/constants');
const { GenerateCourseDTO } = require('../../application/dto/courseDto');
const { validateGenerateCourseDTO } = require('../../application/validators/courseValidator');
const container = require('../../infrastructure/container');

class CourseController {
  async getAllCourses(req, res) {
    try {
      const page = req.query.page || 1;
      const limit = req.query.limit || 10;
      const skip = (page - 1) * limit;
      const repository = container.resolve('courseRepository');
      const courses = await repository.findAllByUserId(req.user.id, { skip, take: limit });
      const { response, statusCode } = createResponse(true, { courses }, null, HTTP_STATUS.OK);
      res.status(statusCode).json(response);
    } catch (error) {
      logger.error('Erreur récupération cours', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }

  async getCourse(req, res) {
    try {
      const { id } = req.params;
      const repository = container.resolve('courseRepository');
      const course = await repository.findById(id);
      if (!course || course.userId !== req.user.id) {
        const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.COURSE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
        return res.status(statusCode).json(response);
      }
      const { response, statusCode } = createResponse(true, { course }, null, HTTP_STATUS.OK);
      res.status(statusCode).json(response);
    } catch (error) {
      logger.error('Erreur récupération cours', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }

  async deleteCourse(req, res) {
    try {
      const { id } = req.params;
      const repository = container.resolve('courseRepository');
      const course = await repository.findById(id);
      if (!course || course.userId !== req.user.id) {
        const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.COURSE_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
        return res.status(statusCode).json(response);
      }
      await repository.delete(id);
      const { response, statusCode } = createResponse(true, null, null, HTTP_STATUS.OK);
      res.status(statusCode).json(response);
    } catch (error) {
      logger.error('Erreur suppression cours', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }

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

