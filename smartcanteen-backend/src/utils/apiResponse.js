/**
 * Standardised API Response Helpers
 * All responses: { success, message, data?, errors? }
 */

const sendSuccess = (res, { statusCode = 200, message = 'Success', data = null } = {}) => {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  return res.status(statusCode).json(body);
};

const sendError = (res, { statusCode = 500, message = 'Internal Server Error', errors = null } = {}) => {
  const body = { success: false, message };
  if (errors !== null) body.errors = errors;
  return res.status(statusCode).json(body);
};

const sendCreated       = (res, opts = {}) => sendSuccess(res, { statusCode: 201, ...opts });
const sendUnauthorized  = (res, message = 'Unauthorized') => sendError(res, { statusCode: 401, message });
const sendForbidden     = (res, message = 'Forbidden') => sendError(res, { statusCode: 403, message });
const sendNotFound      = (res, message = 'Not found') => sendError(res, { statusCode: 404, message });
const sendValidationError = (res, errors) =>
  sendError(res, { statusCode: 422, message: 'Validation failed', errors });

module.exports = {
  sendSuccess, sendError, sendCreated,
  sendUnauthorized, sendForbidden, sendNotFound, sendValidationError,
};