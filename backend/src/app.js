// backend/src/app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { connectDatabase } = require('./config/database');
const { logger } = require('./utils/helpers');
const { LIMITS } = require('./utils/constants');

// Importer les routes
const apiRoutes = require('./routes');

const app = express();

// ⭐ MODIFIÉ : Configuration Helmet avec CSP personnalisé
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Pour les scripts inline (temporaire)
        "https://unpkg.com", // Pour Lucide icons
        "https://accounts.google.com", // Pour Google Auth
        "https://apis.google.com" // Pour Google APIs
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Pour les styles inline
        "https://fonts.googleapis.com", // Pour Google Fonts
        "https://accounts.google.com" // Pour les styles Google Auth
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com" // Pour Google Fonts
      ],
      connectSrc: [
        "'self'",
        "https://accounts.google.com", // Pour Google Auth
        "https://apis.google.com" // Pour Google APIs
      ],
      frameSrc: [
        "'self'",
        "https://accounts.google.com" // Pour les popups Google
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https://lh3.googleusercontent.com", // Pour les avatars Google
        "https://*.googleusercontent.com" // Autres images Google
      ]
    },
  },
}));

app.use(cors({
  origin: true,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: LIMITS.RATE_LIMIT_WINDOW,
  max: LIMITS.RATE_LIMIT_MAX,
  message: {
    success: false,
    error: 'Trop de requêtes, veuillez réessayer plus tard'
  }
});

// Exposer la config Google au front
app.get('/api/config/google', (req, res) => {
  res.json({ clientId: process.env.GOOGLE_CLIENT_ID || '' });
});


app.use('/api/', limiter);

// Middleware pour parser JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques du frontend
app.use(express.static(path.join(__dirname, '../../frontend')));

// Routes API
app.use('/api', apiRoutes);

// Route pour servir le frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// Middleware de gestion des erreurs globales
app.use((err, req, res, next) => {
  logger.error('Erreur serveur non gérée', err);
  
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Erreur serveur interne'
  });
});

// Middleware pour les routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée'
  });
});

// Initialisation de la base de données
const initializeApp = async () => {
  try {
    await connectDatabase();
    logger.success('Application initialisée avec succès');
  } catch (error) {
    logger.error('Erreur initialisation application', error);
    process.exit(1);
  }
};

module.exports = { app, initializeApp };