// backend/src/controllers/profileController.js
const { createResponse, logger } = require('../utils/helpers');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');
const ProfileService = require('../services/profileService');

class ProfileController {
  constructor() {
    this.profileService = new ProfileService();
  }

  async getProfile(req, res) {
    try {
      const data = await this.profileService.getProfile(req.user.id);
      const { response } = createResponse(true, data);
      res.json(response);
    } catch (error) {
      logger.error('Erreur récupération profil', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }

  async updatePreferences(req, res) {
    try {
      const profile = await this.profileService.updatePreferences(req.user.id, req.body || {});
      const { response } = createResponse(true, { profile });
      res.json(response);
    } catch (error) {
      logger.error('Erreur mise à jour préférences', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }

  async updateInfo(req, res) {
    try {
      const user = await this.profileService.updateInfo(req.user.id, req.body || {});
      const { response } = createResponse(true, { user });
      res.json(response);
    } catch (error) {
      logger.error('Erreur mise à jour informations utilisateur', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }

  async uploadAvatar(req, res) {
    try {
      const user = await this.profileService.uploadAvatar(req.user.id, req.file);
      const { response } = createResponse(true, { user });
      res.json(response);
    } catch (error) {
      logger.error('Erreur upload avatar', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }

  async getStats(req, res) {
    try {
      const stats = await this.profileService.getUsageStats(req.user.id);
      const { response } = createResponse(true, { stats });
      res.json(response);
    } catch (error) {
      logger.error('Erreur récupération statistiques', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }

  async getActivity(req, res) {
    try {
      const limit = parseInt(req.query.limit, 10) || 10;
      const activity = await this.profileService.getActivity(req.user.id, limit);
      const { response } = createResponse(true, { activity });
      res.json(response);
    } catch (error) {
      logger.error('Erreur récupération activité', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }

  async deleteData(req, res) {
    try {
      await this.profileService.deleteData(req.user.id);
      const { response } = createResponse(true, { message: 'Données supprimées' });
      res.json(response);
    } catch (error) {
      logger.error('Erreur suppression données utilisateur', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }
}

module.exports = new ProfileController();

