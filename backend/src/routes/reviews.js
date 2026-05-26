const express = require('express');
const authMiddleware = require('../middleware/auth');
const {
  createReview, getReviews, getReview, getSharedReview, postToGithub,
} = require('../controllers/reviewController');

const router = express.Router();

router.post('/', authMiddleware, createReview);
router.get('/', authMiddleware, getReviews);
router.get('/share/:shareToken', getSharedReview);          // public — no auth
router.get('/:id', authMiddleware, getReview);
router.post('/:id/post-to-github', authMiddleware, postToGithub);

module.exports = router;
