const logger = require('../utils/logger');
const { sendError } = require('../utils/apiResponse');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Internal Server Error';

  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
  }
  if (err.name === 'ValidationError') {
    statusCode = 422;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }
  if (err.name === 'CastError') { statusCode = 400; message = `Invalid ${err.path}: ${err.value}`; }
  if (err.name === 'JsonWebTokenError') { statusCode = 401; message = 'Invalid token.'; }
  if (err.name === 'TokenExpiredError') { statusCode = 401; message = 'Token expired.'; }

  if (statusCode >= 500) logger.error(`${statusCode} ${req.method} ${req.originalUrl} — ${err.stack || err.message}`);
  else logger.warn(`${statusCode} ${req.method} ${req.originalUrl} — ${message}`);

  const body = { success: false, message };
  if (process.env.NODE_ENV === 'development' && err.stack) body.stack = err.stack;

  return res.status(statusCode).json(body);
};

const notFoundHandler = (req, res) =>
  sendError(res, { statusCode: 404, message: `Route ${req.method} ${req.originalUrl} not found.` });

module.exports = { errorHandler, notFoundHandler };