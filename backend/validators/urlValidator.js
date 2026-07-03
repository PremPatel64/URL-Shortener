const { body } = require('express-validator');
const validateResults = require('../middleware/validationMiddleware');

/**
 * Validation rules for creating a short URL
 */
const validateUrlCreate = [
  body('originalUrl')
    .trim()
    .notEmpty()
    .withMessage('Original URL is required')
    .isURL({
      protocols: ['http', 'https'],
      require_protocol: true,
      require_valid_protocol: true
    })
    .withMessage('Please provide a valid URL starting with http:// or https://'),

  body('customAlias')
    .optional({ checkFalsy: true }) // Allow empty string as optional
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Custom alias must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Custom alias can only contain alphanumeric characters, hyphens, and underscores'),

  body('expiresAt')
    .optional({ checkFalsy: true })
    .trim()
    .isISO8601()
    .withMessage('Expiration date must be a valid ISO 8601 date format')
    .custom((value) => {
      const inputDate = new Date(value);
      if (inputDate <= new Date()) {
        throw new Error('Expiration date must be in the future');
      }
      return true;
    }),

  validateResults
];

/**
 * Validation rules for updating custom alias
 */
const validateAliasUpdate = [
  body('customAlias')
    .trim()
    .notEmpty()
    .withMessage('Custom alias is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Custom alias must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Custom alias can only contain alphanumeric characters, hyphens, and underscores'),

  validateResults
];

module.exports = {
  validateUrlCreate,
  validateAliasUpdate
};
