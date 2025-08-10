process.env.ANTHROPIC_API_KEY = 'test-key';

const test = require('node:test');
const assert = require('node:assert');
const anthropicService = require('../../src/services/anthropicService');
const { STYLES, DURATIONS, INTENTS } = require('../../src/utils/constants');

test('createPrompt includes duration word counts', () => {
  const mapping = {
    [DURATIONS.SHORT]: 750,
    [DURATIONS.MEDIUM]: 2250,
    [DURATIONS.LONG]: 4200
  };
  for (const [duration, count] of Object.entries(mapping)) {
    const prompt = anthropicService.createPrompt('Sujet', STYLES.NEUTRAL, duration, INTENTS.LEARN);
    assert.match(prompt, new RegExp(`${count} mots`));
  }
});

test('createPrompt includes distinct style instructions', () => {
  const promptPedago = anthropicService.createPrompt('Sujet', STYLES.PEDAGOGICAL, DURATIONS.MEDIUM, INTENTS.LEARN);
  const promptStory = anthropicService.createPrompt('Sujet', STYLES.STORYTELLING, DURATIONS.MEDIUM, INTENTS.LEARN);

  assert.match(promptPedago, /ton pédagogique, clair et structuré/);
  assert.match(promptStory, /récit engageant/);
  assert.notStrictEqual(promptPedago, promptStory);
});
