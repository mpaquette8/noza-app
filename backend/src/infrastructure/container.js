const { createContainer, asFunction, asValue } = require('awilix');
const { prisma } = require('./database');
const CourseRepository = require('./repositories/courseRepository');
const anthropicService = require('../application/services/anthropicService');
const OnboardingService = require('../application/services/onboardingService');
const googleAuthService = require('../application/services/googleAuthService');
const GenerateCourseUseCase = require('../domain/usecases/GenerateCourseUseCase');
const CreateCourseUseCase = require('../domain/usecases/CreateCourseUseCase');

const container = createContainer();

container.register({
  prisma: asValue(prisma),
  courseRepository: asFunction(({ prisma }) => new CourseRepository(prisma)).singleton(),
  anthropicService: asValue(anthropicService),
  onboardingService: asFunction(({ prisma }) => new OnboardingService(prisma)).singleton(),
  googleAuthService: asValue(googleAuthService),
  generateCourseUseCase: asFunction(({ courseRepository, anthropicService }) =>
    new GenerateCourseUseCase(courseRepository, anthropicService)
  ).scoped(),
  createCourseUseCase: asFunction(({ courseRepository, anthropicService }) =>
    new CreateCourseUseCase(courseRepository, anthropicService)
  ).scoped(),
});

module.exports = container;
