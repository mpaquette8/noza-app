const test = require('node:test');
const assert = require('node:assert');
const { mapLegacyParams } = require('../../src/utils/helpers');
const { DURATIONS, INTENTS } = require('../../src/utils/constants');

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

test('vulgarizationLevel numeric values map to intents', () => {
  const mapping = {
    1: INTENTS.DISCOVER,
    2: INTENTS.LEARN,
    3: INTENTS.MASTER,
    4: INTENTS.EXPERT
  };
  for (const [level, expected] of Object.entries(mapping)) {
    const result = mapLegacyParams({ vulgarizationLevel: Number(level) });
    assert.strictEqual(result.intent, expected);
  }
});

test('applies default duration and intent when none provided', () => {
  const result = mapLegacyParams({});
  assert.strictEqual(result.duration, DURATIONS.MEDIUM);
  assert.strictEqual(result.intent, INTENTS.LEARN);
});
