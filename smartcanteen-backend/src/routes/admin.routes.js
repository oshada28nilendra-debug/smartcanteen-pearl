const express = require('express');
const { body, param, query } = require('express-validator');
const {
  getUsers, getUserById, deactivateUser, activateUser,
  updateVendorStatus, deleteUser,
  getStats, getActivity, getReports, search,
  getAdminNotifications,
} = require('../controllers/admin.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { ROLES, User }  = require('../models/User');
const { sendSuccess } = require('../utils/apiResponse');
const bcrypt = require('bcryptjs');

const router = express.Router();

router.use(requireAuth, requireRole(ROLES.ADMIN));

// ── Stats / activity / reports / search / notifications ──
router.get('/stats',         getStats);
router.get('/activity',      getActivity);
router.get('/reports',       getReports);
router.get('/search',        search);
router.get('/notifications', getAdminNotifications);

// ── Admin profile — GET ──
router.get('/profile', async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshToken');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return sendSuccess(res, { data: { user } });
  } catch (err) { next(err); }
});

// ── Admin profile — PATCH (name, email, optional password) ──
router.patch('/profile', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (name)  user.name  = name.trim();
    if (email) {
      // Check email not taken by another user
      const exists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
      if (exists) return res.status(400).json({ success: false, message: 'Email already in use by another account.' });
      user.email = email.toLowerCase().trim();
    }
    if (password) {
      if (password.length < 8) return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
      // Password will be hashed by the pre-save hook
      user.password = password;
    }

    await user.save();

    const safe = user.toObject();
    delete safe.password;
    delete safe.refreshToken;

    return sendSuccess(res, { message: 'Profile updated successfully.', data: { user: safe } });
  } catch (err) { next(err); }
});

// ── Users ──
router.get('/users',
  [
    query('role').optional().isIn(['student','vendor','admin']),
    query('accountStatus').optional().isIn(['active','inactive','banned']),
    query('vendorStatus').optional().isIn(['pending','approved','rejected']),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate, getUsers
);
router.get('/users/:id',    [param('id').isMongoId()], validate, getUserById);
router.patch('/users/:id/deactivate', [param('id').isMongoId()], validate, deactivateUser);
router.patch('/users/:id/activate',   [param('id').isMongoId()], validate, activateUser);
router.delete('/users/:id',           [param('id').isMongoId()], validate, deleteUser);

router.patch('/vendors/:id/status',
  [
    param('id').isMongoId(),
    body('status').notEmpty().isIn(['approved','rejected']),
  ],
  validate, updateVendorStatus
);

module.exports = router;