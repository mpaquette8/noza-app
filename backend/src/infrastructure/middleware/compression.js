// backend/src/infrastructure/middleware/compression.js
const compression = require('compression');

module.exports = compression({
  threshold: '1kb',
  level: 6,
  filter: (req, res) =>
    !req.headers['content-encoding'] &&
    !req.path.match(/\.(?:png|jpe?g|gif|webp|zip)$/)
});
