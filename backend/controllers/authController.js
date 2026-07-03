const authService = require('../services/authService');
const { signToken } = require('../utils/jwt');
const catchAsync = require('../utils/catchAsync');

/**
 * Helper function to generate token, set HttpOnly cookie, and send response
 */
const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);

  // Cookie expiration configuration (defaults to 7 days if not defined)
  const cookieDays = parseInt(process.env.JWT_COOKIE_EXPIRES_IN, 10) || 7;
  const cookieOptions = {
    expires: new Date(Date.now() + cookieDays * 24 * 60 * 60 * 1000),
    httpOnly: true, // Prevents client-side script access (protects against XSS)
    secure: process.env.NODE_ENV === 'production', // Sent only over HTTPS in prod
    sameSite: 'lax' // Mitigates CSRF vulnerability
  };

  res.cookie('token', token, cookieOptions);

  res.status(statusCode).json({
    success: true,
    message: 'Authentication successful',
    token,
    data: {
      user
    }
  });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;
  const newUser = await authService.register({ name, email, password });
  
  sendTokenResponse(newUser, 201, res);
});

/**
 * @desc    Log in an existing user
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  const authenticatedUser = await authService.login(email, password);
  
  sendTokenResponse(authenticatedUser, 200, res);
});

/**
 * @desc    Log out user / Clear cookie
 * @route   POST /api/auth/logout
 * @access  Private (or Public, but typically called from authenticated session)
 */
const logout = catchAsync(async (req, res, next) => {
  // Clear the token cookie
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000), // Expiries in 10 seconds
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  res.status(200).json({
    success: true,
    message: 'User logged out successfully.'
  });
});

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getProfile = catchAsync(async (req, res, next) => {
  // User is already attached to req.user by protect middleware
  res.status(200).json({
    success: true,
    data: {
      user: req.user
    }
  });
});

module.exports = {
  register,
  login,
  logout,
  getProfile
};
