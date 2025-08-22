const { ValidationError } = require('../errors');

class CreateCourseUseCase {
  constructor(courseRepository, courseGenerationService) {
    this.courseRepository = courseRepository;
    this.courseGenerationService = courseGenerationService;
  }

  async execute({ userId, subject, options }) {
    if (!userId) {
      throw new ValidationError('userId est requis');
    }
    if (!subject) {
      throw new ValidationError('Le sujet est requis');
    }
    const content = await this.courseGenerationService.generateCourse(subject, options);
    const course = await this.courseRepository.create({
      subject,
      content,
      userId,
      ...options,
    });
    return course;
  }
}

module.exports = CreateCourseUseCase;
