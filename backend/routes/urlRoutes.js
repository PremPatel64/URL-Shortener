const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { create, getAllByUser, getById, updateAlias, deleteShortUrl, toggleFavorite } = require('../controllers/urlController');
const { validateUrlCreate, validateAliasUpdate } = require('../validators/urlValidator');

const router = express.Router();

// Protect all routes within this router since URL management is user-specific
router.use(protect);

// CRUD routes for short URLs
router.route('/')
  .post(validateUrlCreate, create)
  .get(getAllByUser);

router.route('/:id')
  .get(getById)
  .put(validateAliasUpdate, updateAlias)
  .delete(deleteShortUrl);

router.patch('/:id/favorite', toggleFavorite);

module.exports = router;
