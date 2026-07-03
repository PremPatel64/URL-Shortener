const jwt = require('jsonwebtoken');

/**
 * Signs a new JWT token containing user ID
 * @param {string} id - The MongoDB User ID
 * @returns {string} - Signed JWT token
 */
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

/**
 * Verifies and decodes a JWT token
 * @param {string} token - The raw JWT token string
 * @returns {Promise<object>} - Decoded token payload
 */
const verifyToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
};

module.exports = {
  signToken,
  verifyToken
};
