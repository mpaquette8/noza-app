// backend/src/services/googleAuthService.js
const { OAuth2Client } = require('google-auth-library');
const { logger } = require('../utils/helpers');

class GoogleAuthService {
  constructor() {
    if (!process.env.GOOGLE_CLIENT_ID) {
      throw new Error('GOOGLE_CLIENT_ID manquant dans les variables d\'environnement');
    }
    
    this.client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }

  /**
   * Vérifier et décoder un token Google ID
   * @param {string} token - Token ID JWT de Google
   * @returns {Object} Informations utilisateur vérifiées
   */
  async verifyGoogleToken(token) {
    const TIMEOUT_MS = 5000;
    let timeoutId;

    try {
      logger.info('Vérification token Google...');

      const verifyPromise = this.client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          const err = new Error('Timeout vérification token Google');
          err.code = 'TIMEOUT';
          reject(err);
        }, TIMEOUT_MS);
      });

      const ticket = await Promise.race([verifyPromise, timeoutPromise]);
      clearTimeout(timeoutId);

      const payload = ticket.getPayload();

      if (!payload) {
        const invalidError = new Error('Token Google invalide ou expiré');
        invalidError.code = 'INVALID';
        throw invalidError;
      }

      // Extraire les informations utilisateur
      const userInfo = {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
        avatar: payload.picture,
        emailVerified: payload.email_verified
      };

      logger.success('Token Google vérifié', {
        email: userInfo.email,
        googleId: userInfo.googleId
      });

      return userInfo;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.code === 'TIMEOUT') {
        logger.error('Timeout vérification token Google', error);
        throw error;
      }

      if (['ENOTFOUND', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN'].includes(error.code)) {
        logger.error('Erreur réseau lors de la vérification du token Google', error);
        const networkError = new Error('Erreur réseau vérification token Google');
        networkError.code = 'NETWORK';
        throw networkError;
      }

      logger.warn('Token Google invalide ou expiré', error);
      const invalidError = new Error('Token Google invalide ou expiré');
      invalidError.code = 'INVALID';
      throw invalidError;
    }
  }

  /**
   * Valider que l'email est vérifié chez Google
   * @param {Object} userInfo - Informations utilisateur de Google
   * @returns {boolean}
   */
  isEmailVerified(userInfo) {
    return userInfo.emailVerified === true;
  }
}

module.exports = new GoogleAuthService();
