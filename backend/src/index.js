/**
 * SkillShare Backend — Main Entry Point
 * Express server with MongoDB, Firebase Admin, and all routes
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { connectDB } = require('./config/db');

// Route imports
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const sessionRoutes = require('./routes/sessions');
const testRoutes = require('./routes/tests');
const certificateRoutes = require('./routes/certificates');
const notificationRoutes = require('./routes/notifications');
const paymentRoutes = require('./routes/payments');
const { startReminderCron } = require('./services/reminderService');

const app = express();

// ─── Security & Logging Middleware ────────────────────────────────────────────
app.use(helmet());
app.use(morgan('dev'));

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [process.env.FRONTEND_URL || 'http://localhost:3000'],
  credentials: true,
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
// Stripe webhooks need raw body — must be before express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

(async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 SkillShare API running on http://localhost:${PORT}`);
    startReminderCron();
  });
})();

module.exports = app;
