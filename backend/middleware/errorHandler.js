const { AppError } = require('../utils/customErrors');

/**
 * Formats MongoDB Cast Error (invalid ObjectId)
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

/**
 * Formats MongoDB Duplicate Key Error (11000)
 */
const handleDuplicateKeyDB = (err) => {
  // Extract duplicate field value from error message
  const value = err.errmsg.match(/(["'])(\\?.)*?\1/)?.[0] || 'Unknown value';
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 409);
};

/**
 * Formats Mongoose Validation Errors
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join(' ')}`;
  return new AppError(message, 400);
};

/**
 * Formats JWT signature verification errors
 */
const handleJWTError = () => new AppError('Invalid token. Please log in again.', 401);

/**
 * Formats JWT expired errors
 */
const handleJWTExpiredError = () => new AppError('Your token has expired. Please log in again.', 401);

/**
 * Dev Error Responder: Includes full stack trace and error details
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    error: err,
    stack: err.stack
  });
};

/**
 * Prod Error Responder: Excludes internal error details for non-operational errors
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send clean message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: err.status // 'fail' or 'error'
    });
  } else {
    // Programming or other unknown error: don't leak details to user
    console.error('[CRITICAL ERROR]', err);
    res.status(500).json({
      success: false,
      message: 'Something went very wrong on our end.',
      error: 'error'
    });
  }
};

/**
 * Centralized Express Error Handling Middleware
 */
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    // Create a copy of the error to safely modify
    let error = Object.create(err);
    error.message = err.message;
    error.stack = err.stack;

    // Handle specific DB and auth errors
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateKeyDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};
