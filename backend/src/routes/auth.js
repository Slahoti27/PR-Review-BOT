const express = require('express');
const passport = require('passport');
const { githubCallback, getMe, logout } = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Redirect to GitHub OAuth
router.get('/github', passport.authenticate('github', { session: false }));

// GitHub OAuth callback
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed` }),
  githubCallback
);

// Get current logged-in user
router.get('/me', authMiddleware, getMe);

// Logout
router.post('/logout', logout);

module.exports = router;
