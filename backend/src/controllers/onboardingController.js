// backend/src/controllers/onboardingController.js
const { createResponse, logger } = require('../utils/helpers');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');
const OnboardingService = require('../services/onboardingService');

class OnboardingController {
  constructor() {
    this.onboardingService = new OnboardingService();
  }

  getConfig(req, res) {
    try {
      const config = this.onboardingService.getQuestionConfig();
      logger.info('Raw onboarding config', config);
      const questions = config.map((q) => ({
        id: q.id,
        question: q.label,
        type: q.type || (q.options?.length ? 'select' : 'text'),
        options: q.options || [],
        multiple: q.multiple || false,
        label: q.label
      }));
      logger.info('Transformed onboarding questions', questions);
      const { response } = createResponse(true, { questions });
      res.json(response);
    } catch (error) {
      logger.error('Erreur récupération configuration onboarding', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }

  async complete(req, res) {
    try {
      const rawAnswers = req.body || {};
      const answers = Object.fromEntries(
        Object.entries(rawAnswers).map(([key, value]) => [
          key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
          value
        ])
      );
      const profile = await this.onboardingService.saveAnswers(req.user.id, answers);
      const { response } = createResponse(true, { profile });
      res.json(response);
    } catch (error) {
      logger.error('Erreur sauvegarde réponses onboarding', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }

  async getProfile(req, res) {
    try {
      const profile = await this.onboardingService.getUserProfile(req.user.id);
      if (!profile) {
        const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
        return res.status(statusCode).json(response);
      }
      const { response } = createResponse(true, { profile });
      res.json(response);
    } catch (error) {
      logger.error('Erreur récupération profil onboarding', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }

  async getStatus(req, res) {
    try {
      const profile = await this.onboardingService.getUserProfile(req.user.id);
      const status = profile
        ? { onboardingCompleted: profile.onboardingCompleted, profileConfidence: profile.profileConfidence }
        : { onboardingCompleted: false, profileConfidence: 0 };
      const { response } = createResponse(true, { status });
      res.json(response);
    } catch (error) {
      logger.error('Erreur récupération statut onboarding', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }

  async addPreference(req, res) {
    try {
      const { key, value } = req.body || {};
      const camelKey = key?.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
      if (!camelKey) {
        const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.INVALID_PARAMETERS, HTTP_STATUS.BAD_REQUEST);
        return res.status(statusCode).json(response);
      }
      const profile = await this.onboardingService.saveAnswers(req.user.id, { [camelKey]: value });
      const { response } = createResponse(true, { profile });
      res.json(response);
    } catch (error) {
      logger.error('Erreur ajout préférence onboarding', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }
}

module.exports = new OnboardingController();
