/**
 * Wraps an asynchronous Express handler to automatically catch rejected promises
 * and pass them to the global error handling middleware.
 * Eliminates repetitive try-catch blocks.
 * 
 * @param {Function} fn - Asynchronous route handler
 * @returns {Function} - Express middleware wrapper
 */
module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};
