const { verifyToken } = require('../utils/jwt');
const { UnauthorizedError } = require('../utils/customErrors');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');

/**
 * Middleware to protect routes: validates JWT token and attaches authenticated user to req
 */
const protect = catchAsync(async (req, res, next) => {
  let token;

  // 1. Check for token in cookies
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Fallback check for Authorization header (Bearer token)
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // If token is missing, reject request
  if (!token || token === 'none') {
    return next(new UnauthorizedError('Not authorized to access this resource. Please log in.'));
  }

  try {
    // Verify the JWT token
    const decoded = await verifyToken(token);

    // Find the user associated with this token and select essential fields
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return next(new UnauthorizedError('The user belonging to this token no longer exists.'));
    }

    // Attach user payload to request context for downstream controllers
    req.user = currentUser;
    next();
  } catch (error) {
    // If token verification fails, bubble up as UnauthorizedError
    return next(new UnauthorizedError('Session expired or invalid token. Please login again.'));
  }
});

module.exports = { protect };
