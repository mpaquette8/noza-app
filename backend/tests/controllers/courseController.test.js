const test = require('node:test');
const assert = require('node:assert');
const { mapLegacyParams } = require('../../src/utils/helpers');
const { DURATIONS, VULGARIZATION_LEVELS, LEGACY_VULGARIZATION_LEVELS } = require('../../src/utils/constants');

test('detailLevel numeric values map to durations', () => {
  const mapping = {
    1: DURATIONS.SHORT,
    2: DURATIONS.MEDIUM,
    3: DURATIONS.LONG
  };
  for (const [level, expected] of Object.entries(mapping)) {
    const result = mapLegacyParams({ detailLevel: Number(level) });
    assert.strictEqual(result.duration, expected);
  }
});

test('legacyVulgarizationLevel numeric values map to new vulgarization levels', () => {
  const mapping = {
    [LEGACY_VULGARIZATION_LEVELS.GENERAL_PUBLIC]: VULGARIZATION_LEVELS.GENERAL_PUBLIC,
    [LEGACY_VULGARIZATION_LEVELS.ENLIGHTENED]: VULGARIZATION_LEVELS.ENLIGHTENED,
    [LEGACY_VULGARIZATION_LEVELS.KNOWLEDGEABLE]: VULGARIZATION_LEVELS.KNOWLEDGEABLE,
    [LEGACY_VULGARIZATION_LEVELS.EXPERT]: VULGARIZATION_LEVELS.EXPERT
  };
  for (const [level, expected] of Object.entries(mapping)) {
    const result = mapLegacyParams({ legacyVulgarizationLevel: Number(level) });
    assert.strictEqual(result.vulgarizationLevel, expected);
  }
});

test('applies default duration and vulgarization level when none provided', () => {
  const result = mapLegacyParams({});
  assert.strictEqual(result.duration, DURATIONS.MEDIUM);
  assert.strictEqual(result.vulgarizationLevel, VULGARIZATION_LEVELS.ENLIGHTENED);
});
