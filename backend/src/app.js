require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('./config/passport');
const sequelize = require('./config/database');
const authRoutes = require('./routes/auth');
const reviewRoutes = require('./routes/reviews');

const app = express();

// ── Middleware ──
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,             // required for cookies
}));
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());

// ── Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/reviews', reviewRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ── Start ──
const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      console.log('✅ Models synced');
    }

    app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
  } catch (err) {
    console.error('❌ Startup failed:', err);
    process.exit(1);
  }
};

start();
