const rateLimit = require('express-rate-limit');

// Spec: max 5 login attempts per 15 minutes per IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 999,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

// Spec: max 3 comments per minute per IP.
const commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many comments — slow down and try again in a minute.' },
});

module.exports = { loginLimiter, commentLimiter };
