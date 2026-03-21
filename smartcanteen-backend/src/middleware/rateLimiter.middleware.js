const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV === 'development';

// In development: effectively unlimited requests
// In production: strict limits apply
const apiLimiter = rateLimit({
  windowMs: isDev ? 1 * 60 * 1000 : parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max:      isDev ? 10000          : parseInt(process.env.RATE_LIMIT_MAX)        || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many requests. Please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: isDev ? 1 * 60 * 1000 : 15 * 60 * 1000,
  max:      isDev ? 10000          : parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});

module.exports = { apiLimiter, authLimiter };