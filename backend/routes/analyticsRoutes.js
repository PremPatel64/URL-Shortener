const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getUrlStats, getDashboardStats, exportCsv } = require('../controllers/analyticsController');

const router = express.Router();

// Secure all analytics routes with JWT authentication
router.use(protect);

// Dashboard wide analytics
router.get('/', getDashboardStats);

// CSV Export for a specific URL
router.get('/:id/csv', exportCsv);

// Single URL specific analytics
router.get('/:id', getUrlStats);

module.exports = router;
