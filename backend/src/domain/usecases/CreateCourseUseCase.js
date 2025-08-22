class CreateCourseUseCase {
  constructor(courseRepository, courseGenerationService) {
    this.courseRepository = courseRepository;
    this.courseGenerationService = courseGenerationService;
  }

  async execute({ userId, subject, options }) {
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
