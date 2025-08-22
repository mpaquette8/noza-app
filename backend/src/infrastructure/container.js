// Simple service container implementation

const CourseRepository = require('./repositories/courseRepository');
const { prisma } = require('./database');
const anthropicService = require('../application/services/anthropicService');
const OnboardingService = require('../application/services/onboardingService');
const googleAuthService = require('../application/services/googleAuthService');
const GenerateCourseUseCase = require('../domain/usecases/GenerateCourseUseCase');
const CreateCourseUseCase = require('../domain/usecases/CreateCourseUseCase');

const container = {
  services: {},
  register(name, factory) {
    this.services[name] = factory;
  },
  resolve(name) {
    if (!this.services[name]) {
      throw new Error(`Service ${name} not found in container`);
    }
    return this.services[name];
  }
};

// Register core services
container.register('anthropicService', anthropicService);
container.register('prisma', prisma);

// Register application dependencies
container.register('courseRepository', new CourseRepository(container.resolve('prisma')));
container.register('onboardingService', new OnboardingService(container.resolve('prisma')));
container.register('googleAuthService', googleAuthService);

// Domain use cases
container.register(
  'generateCourseUseCase',
  new GenerateCourseUseCase(
    container.resolve('courseRepository'),
    container.resolve('anthropicService')
  )
);
container.register(
  'createCourseUseCase',
  new CreateCourseUseCase(
    container.resolve('courseRepository'),
    container.resolve('anthropicService')
  )
);

module.exports = container;

