// backend/src/app.js
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cookieParser = require('cookie-parser');
const { connectDatabase } = require('./config/database');
const { logger } = require('./utils/helpers');
const { LIMITS } = require('./utils/constants');

// Importer les routes
const apiRoutes = require('./routes');

const app = express();

// Permet de faire confiance aux en-têtes du proxy (utile pour HTTPS derrière un proxy)
app.enable('trust proxy');

// Redirection HTTP -> HTTPS en production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
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
    const clientId = process.env.GOOGLE_CLIENT_ID;

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

// Cross-origin headers and CORS handling
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,POST,PUT,PATCH,DELETE,OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    req.headers['access-control-request-headers'] ||
      'Content-Type, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Servir les fichiers statiques pour l'application et le marketing
app.use('/app', express.static(path.join(__dirname, '../../frontend/app')));
app.use('/', express.static(path.join(__dirname, '../../frontend/marketing')));

// Routes pour les applications frontend
app.get('/app*', (_, res) =>
  res.sendFile(path.join(__dirname, '../../frontend/app/index.html'))
);
app.get('/', (_, res) =>
  res.sendFile(path.join(__dirname, '../../frontend/marketing/index.html'))
);

// Routes API
app.use('/api', apiRoutes);

// Nouvelle route pour la visualisation
app.post('/api/visualize', async (req, res) => {
  try {
    const { content, courseId } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: "Contenu requis pour l'analyse"
      });
    }

    const { VisualizationService } = require('./services/visualizationService');
    const visualizations = VisualizationService.analyzeContentForVisualizations(content);

    const enrichedVisualizations = visualizations.map(viz => ({
      ...viz,
      data: VisualizationService.extractDataForVisualization(content, viz.type),
      id: `viz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }));

    res.json({
      success: true,
      visualizations: enrichedVisualizations,
      totalDetected: visualizations.length
    });
  } catch (error) {
    logger.error('Erreur génération visualisations:', error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de l'analyse pour visualisations"
    });
  }
});

// Nouvelle route pour les analytics de visualisation
app.post('/api/analytics/visualization', (req, res) => {
  try {
    const { eventType, visualizationType, courseId, metadata } = req.body;

    const { AnalyticsService } = require('./services/analyticsService');
    AnalyticsService.logVisualizationEvent(eventType, {
      visualizationType,
      courseId,
      metadata,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Erreur analytics:', error);
    res.status(500).json({ success: false, error: 'Erreur analytics' });
  }
});

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
