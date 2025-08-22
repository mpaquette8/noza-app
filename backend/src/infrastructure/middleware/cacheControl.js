// backend/src/infrastructure/middleware/cacheControl.js
const { createHash } = require('crypto');

const STATIC_ASSET_REGEX = /\.(?:js|css|png|jpe?g|gif|svg|ico|woff2?|ttf)$/i;

module.exports = (req, res, next) => {
  if (STATIC_ASSET_REGEX.test(req.url)) {
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    return next();
  }

  if (req.path.startsWith('/api')) {
    res.set('Cache-Control', 'private, max-age=0, must-revalidate');
  }

  const originalJson = res.json.bind(res);

  res.json = (body) => {
    try {
      const jsonString = JSON.stringify(body);
      const etag = createHash('md5').update(jsonString).digest('hex');
      res.set('ETag', etag);

      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
    } catch (err) {
      // If hashing fails, continue without ETag
    }

    return originalJson(body);
  };

  next();
};

