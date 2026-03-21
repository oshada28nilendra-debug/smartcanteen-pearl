const express = require('express');
const { body } = require('express-validator');
const { register, login, refresh, logout, getMe } = require('../controllers/auth.controller');
const { requireAuth }  = require('../middleware/auth.middleware');
const { validate }     = require('../middleware/validate.middleware');
const { authLimiter }  = require('../middleware/rateLimiter.middleware');

const router = express.Router();

/* ── Validation Rules ── */
const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required.')
    .isLength({ min: 2, max: 60 }).withMessage('Name must be 2–60 characters.'),
  body('email').trim().notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Must be a valid email.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter.')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter.')
    .matches(/[0-9]/).withMessage('Password must contain at least one number.')
    .matches(/[^A-Za-z0-9]/).withMessage('Password must contain at least one special character.'),
  body('role').optional().isIn(['student', 'vendor', 'admin']).withMessage('Role must be student or vendor.'),
  body('studentId').optional().trim().isLength({ min: 2, max: 20 }).withMessage('Student ID must be 2–20 chars.'),
  body('businessName').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Business name must be 2–80 chars.'),
  body('contactPhone').optional().trim()
    .matches(/^[+]?[\d\s\-(). ]{7,20}$/).withMessage('Invalid phone number.'),
];

const loginRules = [
  body('email').trim().notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Must be a valid email.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

const refreshRules = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required.'),
];

/* ── Routes ── */
// POST /api/auth/register
router.post('/register', authLimiter, registerRules, validate, register);

// POST /api/auth/login
router.post('/login', authLimiter, loginRules, validate, login);

// POST /api/auth/refresh
router.post('/refresh', refreshRules, validate, refresh);

// POST /api/auth/logout  (protected)
router.post('/logout', requireAuth, logout);

// GET /api/auth/me  (protected)
router.get('/me', requireAuth, getMe);

module.exports = router;