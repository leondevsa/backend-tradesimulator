const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 600,
  skipSuccessfulRequests: true,
});

module.exports = {
  authLimiter,
  apiLimiter
};
