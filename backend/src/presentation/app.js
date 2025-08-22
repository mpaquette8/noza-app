// backend/src/presentation/app.js
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const compression = require('../infrastructure/middleware/compression');
const { connectDatabase } = require('../infrastructure/database');
const { logger } = require('../infrastructure/utils/helpers');
const { LIMITS } = require('../infrastructure/utils/constants');
const { app: appConfig, api: apiConfig, cors: corsConfig } = require('../config');

// Importer les routes
const apiRoutes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Permet de faire confiance aux en-têtes du proxy (utile pour HTTPS derrière un proxy)
if (appConfig.env === 'production') {
  app.set('trust proxy', 1); // trust first proxy only
} else {
  app.set('trust proxy', false); // disable trust proxy in dev
}

// Redirection HTTP -> HTTPS en production
app.use((req, res, next) => {
  if (appConfig.env === 'production' && !appConfig.allowHttp && !req.secure) {
    return res.redirect(`https://${req.headers.host}${req.url}`);
  }
  next();
});

// ⭐ MODIFIÉ : Configuration Helmet avec CSP personnalisé
app.use(
  helmet({
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
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false
  })
);

app.use((_, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

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
  try {
    const clientId = apiConfig.googleClientId;

    if (!clientId) {
      return res.status(500).json({
        error: 'Google Client ID not configured'
      });
    }

    res.json({ clientId });
  } catch (err) {
    logger.error('Erreur récupération config Google', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.use('/api/', limiter);

// Middleware pour parser JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS configuration
const corsOptionsDelegate = (req, callback) => {
  const origin = req.header('Origin');
  const allowed =
    !origin ||
    corsConfig.origins.includes('*') ||
    corsConfig.origins.includes(origin);
  callback(null, {
    origin: allowed,
    credentials: allowed && corsConfig.credentials,
  });
};
app.use(cors(corsOptionsDelegate));
app.options('*', cors(corsOptionsDelegate));

// Cross-origin policies
app.use((_, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

// Compression
app.use(compression);

// Servir les fichiers statiques pour l'application et le marketing
app.use('/app', express.static(path.join(__dirname, '../../../frontend/app')));
app.use('/', express.static(path.join(__dirname, '../../../frontend/marketing')));

// Routes pour les applications frontend
app.get('/app*', (_, res) =>
  res.sendFile(path.join(__dirname, '../../../frontend/app/index.html'))
);
app.get('/', (_, res) =>
  res.sendFile(path.join(__dirname, '../../../frontend/marketing/index.html'))
);

// Routes API
app.use('/api', apiRoutes);

// Client-side logs endpoint
app.post('/api/logs', (req, res) => {
  try {
    const { level, message, data, timestamp } = req.body || {};
    const payload = { message, data, timestamp };

    switch (level) {
      case 'error':
        console.error(payload);
        break;
      case 'warn':
        console.warn(payload);
        break;
      default:
        console.log(payload);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Failed to log client message', err);
    res.status(500).json({ success: false });
  }
});

// Middleware de gestion des erreurs globales
app.use(errorHandler);

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
