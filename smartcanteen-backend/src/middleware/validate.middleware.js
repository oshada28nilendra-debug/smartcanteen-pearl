const { validationResult } = require('express-validator');
const { sendValidationError } = require('../utils/apiResponse');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({ field: e.path || e.param, message: e.msg }));
    return sendValidationError(res, formatted);
  }
  next();
};

module.exports = { validate };