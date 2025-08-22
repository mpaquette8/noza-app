// backend/src/presentation/controllers/authController.js
const { hashPassword, comparePassword, generateToken } = require('../../infrastructure/utils/auth');
const { createResponse, sanitizeInput, logger } = require('../../infrastructure/utils/helpers');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../../infrastructure/utils/constants');
const container = require('../../infrastructure/container');

class AuthController {
  constructor() {
    this.prisma = container.resolve('prisma');
    this.googleAuthService = container.resolve('googleAuthService');
  }

  handleError(res, error, context) {
    logger.error(context, error.message);

    if (error.code === 'P1013' || error.name === 'PrismaClientInitializationError') {
      const { response, statusCode } = createResponse(
        false,
        null,
        'DATABASE_URL invalide',
        HTTP_STATUS.SERVER_ERROR
      );
      return res.status(statusCode).json(response);
    }

    if (
      error.name === 'JsonWebTokenError' &&
      error.message.includes('secret or private key must have a value')
    ) {
      const { response, statusCode } = createResponse(
        false,
        null,
        'JWT_SECRET manquant',
        HTTP_STATUS.SERVER_ERROR
      );
      return res.status(statusCode).json(response);
    }

    const { response, statusCode } = createResponse(
      false,
      null,
      ERROR_MESSAGES.SERVER_ERROR,
      HTTP_STATUS.SERVER_ERROR
    );
    return res.status(statusCode).json(response);
  }

  // Inscription classique (existant)
  async register(req, res) {
    try {
      const { email, name, password } = req.body;

      const sanitizedEmail = sanitizeInput(email);
      const sanitizedName = sanitizeInput(name);

      const existingUser = await this.prisma.user.findUnique({
        where: { email: sanitizedEmail }
      });

      if (existingUser) {
        const { response, statusCode } = createResponse(false, null, 'Cet email est déjà utilisé', HTTP_STATUS.BAD_REQUEST);
        return res.status(statusCode).json(response);
      }

      const hashedPassword = await hashPassword(password);
      const user = await this.prisma.user.create({
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

      // Définir le cookie d'authentification avec les attributs sécurisés
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      logger.success('Nouvel utilisateur créé', { userId: user.id, email: user.email });

      const { response, statusCode } = createResponse(true, {
        message: 'Compte créé avec succès',
        user,
        token,
      }, null, HTTP_STATUS.CREATED);

      res.status(statusCode).json(response);
    } catch (error) {
      return this.handleError(res, error, 'Erreur inscription');
    }
  }

  // Connexion classique (existant)
  async login(req, res) {
    try {
      const { email, password } = req.body;

      const sanitizedEmail = sanitizeInput(email);

      const user = await this.prisma.user.findUnique({
        where: { email: sanitizedEmail }
      });

      if (!user || !user.password || !(await comparePassword(password, user.password))) {
        const { response, statusCode } = createResponse(false, null, 'Email ou mot de passe incorrect', HTTP_STATUS.BAD_REQUEST);
        return res.status(statusCode).json(response);
      }

      const token = generateToken(user.id);

      // Définir le cookie d'authentification avec les attributs sécurisés
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

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
      return this.handleError(res, error, 'Erreur connexion');
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
      const googleUserInfo = await this.googleAuthService.verifyGoogleToken(credential);

      // Vérifier que l'email est vérifié chez Google
      if (!this.googleAuthService.isEmailVerified(googleUserInfo)) {
        const { response, statusCode } = createResponse(false, null, 'Email non vérifié chez Google', HTTP_STATUS.BAD_REQUEST);
        return res.status(statusCode).json(response);
      }

      // Chercher un utilisateur existant
      let user = await this.prisma.user.findUnique({
        where: { email: googleUserInfo.email }
      });

      if (user) {
        // Utilisateur existant
        if (user.provider === 'email' && !user.googleId) {
          // Cas 1: Compte email existant → Lier le compte Google
          user = await this.prisma.user.update({
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
        user = await this.prisma.user.create({
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

      // Définir le cookie d'authentification avec les attributs sécurisés
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      });

      const { response } = createResponse(true, {
        message: 'Connexion Google réussie',
        user,
        token
      });

      res.json(response);
    } catch (error) {
      if (error.code === 'INVALID') {
        logger.error('Erreur authentification Google', error.message);
        const { response, statusCode } = createResponse(
          false,
          null,
          'Token expiré',
          HTTP_STATUS.UNAUTHORIZED
        );
        return res.status(statusCode).json(response);
      }

      if (error.code === 'TIMEOUT' || error.code === 'NETWORK') {
        logger.error('Erreur authentification Google', error.message);
        const { response, statusCode } = createResponse(
          false,
          null,
          'Google indisponible',
          503
        );
        return res.status(statusCode).json(response);
      }

      return this.handleError(res, error, 'Erreur authentification Google');
    }
  }

  // Profil utilisateur (existant)
  async getProfile(req, res) {
    try {
      const { response } = createResponse(true, { user: req.user });
      res.json(response);
    } catch (error) {
      return this.handleError(res, error, 'Erreur profil');
    }
  }
}

module.exports = new AuthController();
