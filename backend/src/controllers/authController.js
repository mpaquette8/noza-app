// backend/src/controllers/authController.js
const { prisma } = require('../config/database');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');
const { createResponse, sanitizeInput, logger } = require('../utils/helpers');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');
const googleAuthService = require('../services/googleAuthService');

class AuthController {
  // Inscription classique (existant)
  async register(req, res) {
    try {
      const { email, name, password } = req.body;

      const sanitizedEmail = sanitizeInput(email);
      const sanitizedName = sanitizeInput(name);

      const existingUser = await prisma.user.findUnique({
        where: { email: sanitizedEmail }
      });

      if (existingUser) {
        const { response, statusCode } = createResponse(false, null, 'Cet email est déjà utilisé', HTTP_STATUS.BAD_REQUEST);
        return res.status(statusCode).json(response);
      }

      const hashedPassword = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email: sanitizedEmail,
          name: sanitizedName,
          password: hashedPassword,
          provider: 'email'
        },
        select: { 
          id: true, 
          email: true, 
          name: true, 
          avatar: true,
          provider: true,
          createdAt: true 
        }
      });

      const token = generateToken(user.id);

      logger.success('Nouvel utilisateur créé', { userId: user.id, email: user.email });

      const { response, statusCode } = createResponse(true, {
        message: 'Compte créé avec succès',
        user,
        token
      }, null, HTTP_STATUS.CREATED);

      res.status(statusCode).json(response);
    } catch (error) {
      logger.error('Erreur inscription', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }

  // Connexion classique (existant)
  async login(req, res) {
    try {
      const { email, password } = req.body;

      const sanitizedEmail = sanitizeInput(email);

      const user = await prisma.user.findUnique({
        where: { email: sanitizedEmail }
      });

      if (!user || !user.password || !(await comparePassword(password, user.password))) {
        const { response, statusCode } = createResponse(false, null, 'Email ou mot de passe incorrect', HTTP_STATUS.BAD_REQUEST);
        return res.status(statusCode).json(response);
      }

      const token = generateToken(user.id);

      logger.info('Connexion utilisateur', { userId: user.id, email: user.email });

      const { response } = createResponse(true, {
        message: 'Connexion réussie',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          provider: user.provider,
          createdAt: user.createdAt
        },
        token
      });

      res.json(response);
    } catch (error) {
      logger.error('Erreur connexion', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }

  // NOUVELLE MÉTHODE : Authentification Google
  async googleAuth(req, res) {
    try {
      const { credential } = req.body;

      if (!credential) {
        const { response, statusCode } = createResponse(false, null, 'Token Google requis', HTTP_STATUS.BAD_REQUEST);
        return res.status(statusCode).json(response);
      }

      // Vérifier le token auprès de Google
      const googleUserInfo = await googleAuthService.verifyGoogleToken(credential);

      // Vérifier que l'email est vérifié chez Google
      if (!googleAuthService.isEmailVerified(googleUserInfo)) {
        const { response, statusCode } = createResponse(false, null, 'Email non vérifié chez Google', HTTP_STATUS.BAD_REQUEST);
        return res.status(statusCode).json(response);
      }

      // Chercher un utilisateur existant
      let user = await prisma.user.findUnique({
        where: { email: googleUserInfo.email }
      });

      if (user) {
        // Utilisateur existant
        if (user.provider === 'email' && !user.googleId) {
          // Cas 1: Compte email existant → Lier le compte Google
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              googleId: googleUserInfo.googleId,
              avatar: googleUserInfo.avatar,
              provider: 'google' // Changer le provider principal
            },
            select: {
              id: true,
              email: true,
              name: true,
              avatar: true,
              provider: true,
              createdAt: true
            }
          });

          logger.info('Compte email lié à Google', { userId: user.id, email: user.email });
        } else if (user.googleId === googleUserInfo.googleId) {
          // Cas 2: Compte Google existant → Connexion normale
          logger.info('Connexion Google utilisateur existant', { userId: user.id, email: user.email });
        } else {
          // Cas 3: Conflit (même email, différent Google ID)
          const { response, statusCode } = createResponse(false, null, 'Conflit de compte détecté', HTTP_STATUS.CONFLICT);
          return res.status(statusCode).json(response);
        }
      } else {
        // Nouvel utilisateur → Créer le compte
        user = await prisma.user.create({
          data: {
            email: googleUserInfo.email,
            name: googleUserInfo.name,
            googleId: googleUserInfo.googleId,
            avatar: googleUserInfo.avatar,
            provider: 'google'
            // password reste null pour les comptes Google
          },
          select: {
            id: true,
            email: true,
            name: true,
            avatar: true,
            provider: true,
            createdAt: true
          }
        });

        logger.success('Nouveau compte Google créé', { userId: user.id, email: user.email });
      }

      // Générer notre JWT
      const token = generateToken(user.id);

      const { response } = createResponse(true, {
        message: 'Connexion Google réussie',
        user,
        token
      });

      res.json(response);
    } catch (error) {
      logger.error('Erreur authentification Google', error);
      
      // Gestion des erreurs spécifiques
      if (error.code === 'INVALID') {
        const { response, statusCode } = createResponse(false, null, 'Token expiré', HTTP_STATUS.UNAUTHORIZED);
        return res.status(statusCode).json(response);
      }

      if (error.code === 'TIMEOUT' || error.code === 'NETWORK') {
        const { response, statusCode } = createResponse(false, null, 'Google indisponible', 503);
        return res.status(statusCode).json(response);
      }

      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }

  // Profil utilisateur (existant)
  async getProfile(req, res) {
    try {
      const { response } = createResponse(true, { user: req.user });
      res.json(response);
    } catch (error) {
      logger.error('Erreur profil', error);
      const { response, statusCode } = createResponse(false, null, ERROR_MESSAGES.SERVER_ERROR, HTTP_STATUS.SERVER_ERROR);
      res.status(statusCode).json(response);
    }
  }
}

module.exports = new AuthController();
