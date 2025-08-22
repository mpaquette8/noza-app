class IAIService {
  async sendWithTimeout(options, timeoutMs, retryDelays) {
    throw new Error('Method not implemented');
  }

  isOffline() {
    throw new Error('Method not implemented');
  }

  getOfflineMessage() {
    throw new Error('Method not implemented');
  }

  async recoverIfOffline() {
    throw new Error('Method not implemented');
  }

  categorizeError(error) {
    throw new Error('Method not implemented');
  }

  setOffline(value) {
    throw new Error('Method not implemented');
  }
}

module.exports = IAIService;
