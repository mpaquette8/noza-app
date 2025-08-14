// backend/src/utils/auth.js (copier depuis backend/utils-old/auth.js)
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Générer un token JWT (ticket de connexion)
const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    process.env.JWT_SECRET, 
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Vérifier un token JWT
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
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
