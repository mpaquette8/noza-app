const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');;
require('dotenv').config();

const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de sécurité
app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://hermes-ai-app.vercel.app'
  ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limite de 100 requêtes par fenêtre
});
app.use('/api/', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.static('../frontend'));

// Routes API
app.use('/api', apiRoutes);

// Route pour servir le frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur 0.0.0.0:${PORT}`);
  console.log(`🔧 API disponible sur le port ${PORT}`);
});
