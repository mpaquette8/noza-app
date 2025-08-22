const AnthropicAIService = require('../../domain/services/AnthropicAIService');
const AnthropicService = require('../../infrastructure/external/AnthropicService');

module.exports = new AnthropicAIService(new AnthropicService());
