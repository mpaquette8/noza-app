const { DomainError } = require('../errors');

class IAIService {
  async sendWithTimeout(options, timeoutMs, retryDelays) {
    throw new DomainError('Method not implemented');
  }

  isOffline() {
    throw new DomainError('Method not implemented');
  }

  getOfflineMessage() {
    throw new DomainError('Method not implemented');
  }

  async recoverIfOffline() {
    throw new DomainError('Method not implemented');
  }

  categorizeError(error) {
    throw new DomainError('Method not implemented');
  }

  setOffline(value) {
    throw new DomainError('Method not implemented');
  }
}

module.exports = IAIService;
