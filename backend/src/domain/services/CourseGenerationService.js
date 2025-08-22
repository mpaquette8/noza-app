const { DomainError } = require('../errors');

class CourseGenerationService {
  async generateCourse(subject, options) {
    throw new DomainError('Method not implemented');
  }
}

module.exports = CourseGenerationService;
