const { validationResult } = require('express-validator');
const { BadRequestError } = require('../utils/customErrors');

/**
 * Middleware to intercept express-validator results and throw custom BadRequestError
 */
const validateResults = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Format error messages into a single readable string or list
    const errorDetails = errors.array().map((err) => `${err.path}: ${err.msg}`).join(', ');
    return next(new BadRequestError(`Validation failed - ${errorDetails}`));
  }
  next();
};

module.exports = validateResults;
