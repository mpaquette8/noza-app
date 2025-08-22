const anthropicService = require('../application/services/anthropicService');
const CourseRepository = require('./repositories/courseRepository');
const GenerateCourseUseCase = require('../domain/usecases/GenerateCourseUseCase');

class Container {
  constructor() {
    const courseRepository = new CourseRepository();
    this.dependencies = {
      generateCourseUseCase: new GenerateCourseUseCase(courseRepository, anthropicService),
    };
  }

  resolve(name) {
    return this.dependencies[name];
  }
}

module.exports = new Container();
