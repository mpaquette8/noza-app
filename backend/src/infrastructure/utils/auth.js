// backend/src/infrastructure/utils/auth.js (copier depuis backend/utils-old/auth.js)
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { jwt: jwtConfig } = require('../../config');

// Générer un token JWT (ticket de connexion)
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn || '7d' }
  );
};

// Vérifier un token JWT
const verifyToken = (token) => {
  return jwt.verify(token, jwtConfig.secret);
};

// Crypter un mot de passe
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 12);
};

// Comparer un mot de passe avec sa version cryptée
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

module.exports = {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword
};
