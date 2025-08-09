// backend/routes/auth.js

const express = require('express');
const { body, validationResult } = require('express-validator');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth');
const { authenticate } = require('../middleware/auth');
const prisma = require('../utils/prisma');
const router = express.Router();

// Règles de validation
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Le nom doit contenir au moins 2 caractères'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email invalide'),
  body('password')
    .exists()
    .withMessage('Mot de passe requis')
];

// INSCRIPTION
router.post('/register', registerValidation, async (req, res) => {
  try {
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { email, name, password } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        error: 'Cet email est déjà utilisé' 
      });
    }

    // Crypter le mot de passe et créer l'utilisateur
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        name,
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

    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      user,
      token
    });
  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur lors de l\'inscription' 
    });
  }
});

// CONNEXION
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { email, password } = req.body;

    // Chercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Vérifier utilisateur et mot de passe
    if (!user || !(await comparePassword(password, user.password))) {
      return res.status(400).json({ 
        success: false,
        error: 'Email ou mot de passe incorrect' 
      });
    }

    // Générer un token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Connexion réussie',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      },
      token
    });
  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur serveur lors de la connexion' 
    });
  }
});

// PROFIL UTILISATEUR
router.get('/profile', authenticate, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = router;