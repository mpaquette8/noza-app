const DomainError = require('./DomainError');

class ValidationError extends DomainError {}

module.exports = ValidationError;
