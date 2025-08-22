const { ValidationError } = require('../errors');

class GenerateCourseUseCase {
  constructor(courseRepository, courseGenerationService) {
    this.courseRepository = courseRepository;
    this.courseGenerationService = courseGenerationService;
  }

  async execute({ userId, subject, teacherType, duration, vulgarization }) {
    if (!userId) {
      throw new ValidationError('userId est requis');
    }
    if (!subject) {
      throw new ValidationError('Le sujet est requis');
    }
    const content = await this.courseGenerationService.generateCourse(
      subject,
      vulgarization,
      duration,
      teacherType
    );

    const course = await this.courseRepository.create({
      subject,
      content,
      teacherType,
      duration,
      vulgarization,
      userId,
    });

    return course;
  }
}

module.exports = GenerateCourseUseCase;
