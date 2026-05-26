const jwt = require('jsonwebtoken');

const generateToken = (user) =>
  jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });

const setTokenCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// Called after GitHub OAuth success — set cookie and redirect to frontend
const githubCallback = (req, res) => {
  const token = generateToken(req.user);
  setTokenCookie(res, token);
  res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
};

// Return current user info
const getMe = (req, res) => {
  const { id, username, displayName, avatarUrl } = req.user;
  res.json({ id, username, displayName, avatarUrl });
};

// Logout — clear cookie
const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
};

module.exports = { githubCallback, getMe, logout };
