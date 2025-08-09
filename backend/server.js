const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Importer toutes les routes
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');        // NOUVEAU
const coursesRoutes = require('./routes/courses');  // NOUVEAU

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de sécurité
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));

// Route de test santé
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
    hasJwtSecret: !!process.env.JWT_SECRET,           // NOUVEAU
    hasDatabaseUrl: !!process.env.DATABASE_URL        // NOUVEAU
  });
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limite de 100 requêtes par fenêtre
});
app.use('/api/', limiter);

// Middleware pour parser JSON
app.use(express.json({ limit: '10mb' }));

// Servir les fichiers statiques du frontend
app.use(express.static('../frontend'));

// Routes API
app.use('/api', apiRoutes);
app.use('/api/auth', authRoutes);        // NOUVEAU - Routes d'authentification
app.use('/api/courses', coursesRoutes);  // NOUVEAU - Routes des cours

// Route pour servir le frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Gestion des erreurs globales (NOUVEAU)
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({
    success: false,
    error: 'Erreur serveur interne'
  });
});

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur 0.0.0.0:${PORT}`);
  console.log(`🔧 API disponible sur le port ${PORT}`);
  console.log(`📚 Routes disponibles:`);
  console.log(`   - GET  /health`);
  console.log(`   - POST /api/auth/register`);
  console.log(`   - POST /api/auth/login`);
  console.log(`   - GET  /api/auth/profile`);
  console.log(`   - GET  /api/courses`);
  console.log(`   - POST /api/courses`);
  console.log(`   - GET  /api/courses/:id`);
  console.log(`   - DELETE /api/courses/:id`);
  console.log(`   - POST /api/generate-course`);
  console.log(`   - POST /api/ask-question`);
  console.log(`   - POST /api/generate-quiz`);
});