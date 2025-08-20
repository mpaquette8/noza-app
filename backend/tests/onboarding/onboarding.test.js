const test = require('node:test');
const assert = require('node:assert');
const OnboardingService = require('../../src/services/onboardingService');

test('calculateProfileConfidence computes fraction of answered questions', () => {
  const service = new OnboardingService();
  const emptyProfile = {};
  assert.strictEqual(service.calculateProfileConfidence(emptyProfile), 0);

  const partialProfile = { pedagogicalProfile: 'methodical', learningGoal: 'decouvrir' };
  assert.strictEqual(service.calculateProfileConfidence(partialProfile), 2 / 3);

  const fullProfile = {
    pedagogicalProfile: 'methodical',
    learningGoal: 'decouvrir',
    preferredStyle: 'analogies'
  };
  assert.strictEqual(service.calculateProfileConfidence(fullProfile), 1);
});

test('needsOnboarding returns true when profile is missing fields', () => {
  const service = new OnboardingService();
  const incompleteProfile = { pedagogicalProfile: 'methodical' };
  assert.strictEqual(service.needsOnboarding(incompleteProfile), true);
});

test('needsOnboarding returns false when profile is complete', () => {
  const service = new OnboardingService();
  const fullProfile = {
    pedagogicalProfile: 'methodical',
    learningGoal: 'decouvrir',
    preferredStyle: 'analogies'
  };
  assert.strictEqual(service.needsOnboarding(fullProfile), false);
});

test('needsOnboarding returns true when profile is null', () => {
  const service = new OnboardingService();
  assert.strictEqual(service.needsOnboarding(null), true);
});
