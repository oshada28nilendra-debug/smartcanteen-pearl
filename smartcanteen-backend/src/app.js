require('dotenv').config();

const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const morgan  = require('morgan');

const { apiLimiter } = require('./middleware/rateLimiter.middleware');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const logger = require('./utils/logger');

// Routes
const authRoutes         = require('./routes/auth.routes');
const adminRoutes        = require('./routes/admin.routes');
const vendorRoutes       = require('./routes/vendor.routes');
const studentRoutes      = require('./routes/student.routes');
const menuRoutes         = require('./routes/menu.routes');
const orderRoutes        = require('./routes/order.routes');
const paymentRoutes      = require('./routes/payment.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();

/* ── Security headers ── */
app.use(helmet());

/* ── CORS ── */
const allowedOrigins = [
  'http://localhost:3000',
  'https://smartcanteen-pearl-svcs.vercel.app',
  'https://pearll.lk',
  'https://www.pearll.lk',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    true,
}));

// Must be BEFORE routes — handles all OPTIONS preflight requests
app.options('*', cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    true,
}));

/* ── Body parsing ──
   FIX: increased limit from 10kb to 10mb to allow base64 image uploads
   Base64 images are ~1.37x the original file size, so a 2MB image = ~2.7MB of base64 text
── */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

/* ── HTTP logging ── */
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: (msg) => logger.http(msg.trim()) } }));
}

/* ── Global rate limiter ── */
app.use('/api', apiLimiter);

/* ── Health check ── */
app.get('/api/health', (req, res) => {
  res.json({
    success:     true,
    message:     'PEARL Smart Canteen API is running.',
    environment: process.env.NODE_ENV,
    timestamp:   new Date().toISOString(),
  });
});

/* ── API Routes ── */
app.use('/api/auth',          authRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/vendor',        vendorRoutes);
app.use('/api/student',       studentRoutes);
app.use('/api/menu',          menuRoutes);
app.use('/api/orders',        orderRoutes);
app.use('/api/payment',       paymentRoutes);
app.use('/api/notifications', notificationRoutes);

/* ── 404 + Error handler ── */
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;