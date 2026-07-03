/**
 * Base Application Error class extending native JavaScript Error
 * Used for handling operational errors (errors we can predict and handle)
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Marks error as operational (predictable system behavior)

    // Capture stack trace, excluding this constructor call
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request Error
 */
class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(message, 400);
  }
}

/**
 * 401 Unauthorized Error (Authentication required)
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized access. Please login.') {
    super(message, 401);
  }
}

/**
 * 403 Forbidden Error (Authenticated but unauthorized for action)
 */
class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message, 403);
  }
}

/**
 * 404 Not Found Error
 */
class NotFoundError extends AppError {
  constructor(message = 'Requested resource not found.') {
    super(message, 404);
  }
}

/**
 * 409 Conflict Error (e.g. Unique resource already exists)
 */
class ConflictError extends AppError {
  constructor(message = 'Resource already exists.') {
    super(message, 409);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError
};
