// backend/src/controllers/authController.js
const { prisma } = require('../config/database');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');
const { createResponse, sanitizeInput, logger } = require('../utils/helpers');
const { HTTP_STATUS, ERROR_MESSAGES } = require('../utils/constants');
const { asyncHandler } = require('../utils/helpers');

class AuthController {
  // Inscription
  async register(req, res) {
    try {
      const { email, name, password } = req.body;

      // Sanitisation
      const sanitizedEmail = sanitizeInput(email);
      const sanitizedName = sanitizeInput(name);

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await prisma.user.findUnique({
        where: { email: sanitizedEmail }
      });

      if (existingUser) {
        const { response, statusCode } = createResponse(false, null, 'Cet email est déjà utilisé', HTTP_STATUS.BAD_REQUEST);
        return res.status(statusCode).json(response);
      }

      // Crypter le mot de passe et créer l'utilisateur
      const hashedPassword = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          email: sanitizedEmail,
          name: sanitizedName,
          password: hashedPassword
        },
        select: { 
          id: true, 
          email: true, 
          name: true, 
          createdAt: true 
        }
      });

      // Générer un token
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

  // Connexion
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Sanitisation
      const sanitizedEmail = sanitizeInput(email);

      // Chercher l'utilisateur
      const user = await prisma.user.findUnique({
        where: { email: sanitizedEmail }
      });

      // Vérifier utilisateur et mot de passe
      if (!user || !(await comparePassword(password, user.password))) {
        const { response, statusCode } = createResponse(false, null, 'Email ou mot de passe incorrect', HTTP_STATUS.BAD_REQUEST);
        return res.status(statusCode).json(response);
      }

      // Générer un token
      const token = generateToken(user.id);

      logger.info('Connexion utilisateur', { userId: user.id, email: user.email });

      const { response } = createResponse(true, {
        message: 'Connexion réussie',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
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

  // Profil utilisateur
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