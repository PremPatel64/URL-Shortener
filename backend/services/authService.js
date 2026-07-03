const User = require('../models/userModel');
const { ConflictError, UnauthorizedError, NotFoundError } = require('../utils/customErrors');

/**
 * Handles business logic for user registration
 * @param {object} userData - { name, email, password }
 * @returns {Promise<object>} - Registered user object (without password)
 */
const register = async (userData) => {
  const { name, email, password } = userData;

  // Check if email is already registered
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ConflictError('A user with this email address already exists.');
  }

  // Create new user (password is automatically hashed by Mongoose schema pre-save hook)
  const user = await User.create({
    name,
    email,
    password
  });

  // Convert to object and delete password field to avoid returning it
  const userObj = user.toObject();
  delete userObj.password;

  return userObj;
};

/**
 * Handles business logic for user login
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} - Authenticated user object (without password)
 */
const login = async (email, password) => {
  // Find user and explicitly select password field
  const user = await User.findOne({ email }).select('+password');
  
  if (!user) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  // Check password correctness
  const isMatch = await user.comparePassword(password, user.password);
  if (!isMatch) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  // Convert to object and remove password before returning
  const userObj = user.toObject();
  delete userObj.password;

  return userObj;
};

/**
 * Retrieves a user by their database ID
 * @param {string} userId
 * @returns {Promise<object>} - User object
 */
const getUserById = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User not found.');
  }
  return user;
};

module.exports = {
  register,
  login,
  getUserById
};
