// Container with WeakMap-backed lazy loading and proper memory management

const container = {
  // Store factory functions instead of instances
  services: new Map(),
  
  // WeakMap for caching resolved instances
  instances: new WeakMap(),
  
  // Map to track singleton instances (for factories that should be cached)
  singletonKeys: new Map(),
  
  /**
   * Register a service factory
   * @param {string} name - Service identifier
   * @param {Function|any} factory - Factory function or direct value
   */
  register(name, factory) {
    if (!name || typeof name !== 'string') {
      throw new Error(`Invalid service name: ${name}`);
    }
    
    // If factory is a function, store it as-is
    // Otherwise, wrap the value in a factory function
    const factoryFn = typeof factory === 'function' 
      ? factory 
      : () => factory;
    
    this.services.set(name, factoryFn);
    
    // Create a unique key for this service to use with WeakMap
    this.singletonKeys.set(name, { serviceName: name });
  },
  
  /**
   * Resolve a service, instantiating it if necessary
   * @param {string} name - Service identifier
   * @returns {any} The resolved service instance
   */
  resolve(name) {
    if (!this.services.has(name)) {
      throw new Error(`Service "${name}" not found in container`);
    }
    
    const factory = this.services.get(name);
    const singletonKey = this.singletonKeys.get(name);
    
    // Check if we already have a cached instance
    if (this.instances.has(singletonKey)) {
      return this.instances.get(singletonKey);
    }
    
    // Create new instance using the factory
    try {
      // Pass the container itself to allow dependency injection
      const instance = factory(this);
      
      // Cache the instance using the singleton key
      this.instances.set(singletonKey, instance);
      
      return instance;
    } catch (error) {
      throw new Error(`Failed to resolve service "${name}": ${error.message}`);
    }
  },
  
  /**
   * Clear all cached instances
   * Useful for testing or when you need fresh instances
   */
  clear() {
    // Create new WeakMap to clear all references
    this.instances = new WeakMap();
    
    // Recreate singleton keys to ensure WeakMap references are broken
    for (const [name] of this.singletonKeys) {
      this.singletonKeys.set(name, { serviceName: name });
    }
  },
  
  /**
   * Check if a service is registered
   * @param {string} name - Service identifier
   * @returns {boolean}
   */
  has(name) {
    return this.services.has(name);
  },
  
  /**
   * Get list of all registered service names
   * @returns {string[]}
   */
  list() {
    return Array.from(this.services.keys());
  }
};

// Register core services with lazy loading factories
container.register('anthropicService', () => {
  // Only require when needed
  return require('../application/services/anthropicService');
});

container.register('prisma', () => {
  // Lazy load database connection
  const { prisma } = require('./database');
  return prisma;
});

// Register repositories with dependency injection
container.register('courseRepository', (containerInstance) => {
  const CourseRepository = require('./repositories/courseRepository');
  return new CourseRepository(containerInstance.resolve('prisma'));
});

// Register application services
container.register('onboardingService', (containerInstance) => {
  const OnboardingService = require('../application/services/onboardingService');
  return new OnboardingService(containerInstance.resolve('prisma'));
});

container.register('googleAuthService', () => {
  return require('../application/services/googleAuthService');
});

// Register domain use cases with lazy dependency resolution
container.register('generateCourseUseCase', (containerInstance) => {
  const GenerateCourseUseCase = require('../domain/usecases/GenerateCourseUseCase');
  return new GenerateCourseUseCase(
    containerInstance.resolve('courseRepository'),
    containerInstance.resolve('anthropicService')
  );
});

container.register('createCourseUseCase', (containerInstance) => {
  const CreateCourseUseCase = require('../domain/usecases/CreateCourseUseCase');
  return new CreateCourseUseCase(
    containerInstance.resolve('courseRepository'),
    containerInstance.resolve('anthropicService')
  );
});

// Export the container instance
module.exports = container;

// For testing purposes, also export the container class
module.exports.Container = container;

