// backend/src/infrastructure/middleware/compression.js
const compression = require('compression');

const shouldCompress = (req) => {
  if (req.headers['content-encoding']) return false;
  if (req.path.match(/\.(?:png|jpe?g|gif|webp|zip)$/)) return false;
  const accept = req.headers.accept || '';
  return /(json|text|javascript)/.test(accept);
};

module.exports = compression({
  threshold: 100,
  level: 9,
  filter: shouldCompress
});
