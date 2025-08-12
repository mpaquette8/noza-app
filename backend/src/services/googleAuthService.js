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
    try {
      logger.info('Vérification token Google...');
      
      const ticket = await this.client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      
      if (!payload) {
        throw new Error('Token Google invalide');
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
      logger.error('Erreur vérification token Google', error);
      throw new Error('Token Google invalide ou expiré');
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