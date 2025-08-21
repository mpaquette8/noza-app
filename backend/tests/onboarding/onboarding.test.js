const test = require('node:test');
const assert = require('node:assert');
const OnboardingService = require('../../src/services/onboardingService');

test('calculateProfileConfidence computes fraction of answered questions', () => {
  const service = new OnboardingService();
  const emptyProfile = {};
  assert.strictEqual(service.calculateProfileConfidence(emptyProfile), 0);

  const partialProfile = { teacherType: 'methodical', vulgarization: 'general_public' };
  assert.strictEqual(service.calculateProfileConfidence(partialProfile), 2 / 3);

  const fullProfile = {
    teacherType: 'methodical',
    vulgarization: 'general_public',
    duration: 'short'
  };
  assert.strictEqual(service.calculateProfileConfidence(fullProfile), 1);
});

test('needsOnboarding returns true when profile is missing fields', () => {
  const service = new OnboardingService();
  const incompleteProfile = { teacherType: 'methodical' };
  assert.strictEqual(service.needsOnboarding(incompleteProfile), true);
});

test('needsOnboarding returns false when profile is complete', () => {
  const service = new OnboardingService();
  const fullProfile = {
    teacherType: 'methodical',
    vulgarization: 'general_public',
    duration: 'short'
  };
  assert.strictEqual(service.needsOnboarding(fullProfile), false);
});

test('needsOnboarding returns true when profile is null', () => {
  const service = new OnboardingService();
  assert.strictEqual(service.needsOnboarding(null), true);
});

test('saveAnswers rejects when mandatory fields are missing', async () => {
  const prismaMock = {
    user: {
      findUnique: async () => ({
        vulgarization: null,
        teacherType: null,
        duration: null,
        interests: null,
        learningContext: null,
        usageFrequency: null,
      }),
      update: async () => {
        throw new Error('should not update');
      },
    },
    userData: {
      upsert: async () => {
        throw new Error('should not upsert');
      },
    },
  };
  const service = new OnboardingService(prismaMock);
  await assert.rejects(
    service.saveAnswers('u1', { teacherType: 'methodical' }),
    /Champs obligatoires manquants/
  );
});
