const { ValidationError, BusinessRuleError, DomainError } = require('../../domain/errors');
const { logger } = require('../../infrastructure/utils/helpers');

module.exports = (err, req, res, next) => {
  if (err instanceof ValidationError) {
    return res.status(400).json({ success: false, error: err.message });
  }

  if (err instanceof BusinessRuleError) {
    return res.status(409).json({ success: false, error: err.message });
  }

  if (err instanceof DomainError) {
    return res.status(400).json({ success: false, error: err.message });
  }

  logger.error('Erreur serveur non gérée', err);
  res.status(500).json({
    success: false,
    error:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Erreur serveur interne'
  });
};
