const Anthropic = require('@anthropic-ai/sdk');
const IAIService = require('../../domain/services/IAIService');
const { logger } = require('../utils/helpers');
const { ERROR_CODES } = require('../utils/constants');
const { api: apiConfig } = require('../../config');

const OFFLINE_MESSAGE = 'Service IA indisponible';
const REQUEST_TIMEOUT = 30 * 1000; // 30s timeout for IA requests

class AnthropicService extends IAIService {
  constructor() {
    super();
    this.offline = false;
    if (!apiConfig.anthropicApiKey) {
      logger.warn('ANTHROPIC_API_KEY manquante, mode offline activé');
      this.offline = true;
      return;
    }
    try {
      this.client = new Anthropic({ apiKey: apiConfig.anthropicApiKey });
    } catch (error) {
      logger.error('Échec de connexion au service Anthropic', error);
      this.offline = true;
    }
  }

  isOffline() {
    return this.offline;
  }

  getOfflineMessage() {
    return OFFLINE_MESSAGE;
  }

  async recoverIfOffline() {
    if (!this.offline || !this.client) {
      return false;
    }
    try {
      await this.sendWithTimeout({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }]
      }, 5000);
      this.offline = false;
      logger.success('Service Anthropic rétabli');
      return true;
    } catch (error) {
      logger.warn('Tentative de reconnexion Anthropic échouée');
      return false;
    }
  }

  async sendWithTimeout(options, timeoutMs = REQUEST_TIMEOUT, retryDelays = [1000, 2000, 4000]) {
    for (let attempt = 0; ; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        return await this.client.messages.create(options, { signal: controller.signal });
      } catch (error) {
        const isOverloaded =
          error?.response?.status === 529 ||
          error?.response?.data?.type === 'overloaded_error';
        if (attempt < retryDelays.length && isOverloaded) {
          await new Promise(res => setTimeout(res, retryDelays[attempt]));
          continue;
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }
  }

  categorizeError(error) {
    if (error?.response?.status === 529 || error?.response?.data?.type === 'overloaded_error') {
      return ERROR_CODES.IA_OVERLOADED;
    }
    if (error?.response?.status === 429) {
      return ERROR_CODES.QUOTA_EXCEEDED;
    }
    const message = error?.message?.toLowerCase() || '';
    if (
      error?.name === 'AbortError' ||
      error?.name === 'APIUserAbortError' ||
      error?.code === 'ETIMEDOUT' ||
      message.includes('timeout') ||
      message.includes('abort')
    ) {
      return ERROR_CODES.IA_TIMEOUT;
    }
    return ERROR_CODES.IA_ERROR;
  }

  setOffline(value) {
    this.offline = value;
  }
}

module.exports = AnthropicService;
