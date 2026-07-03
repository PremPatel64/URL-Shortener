const express = require('express');
const { register, login, logout, getProfile } = require('../controllers/authController');
const { validateRegister, validateLogin } = require('../validators/authValidator');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Public auth routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', logout);

// Protected routes
router.get('/profile', protect, getProfile);

module.exports = router;
