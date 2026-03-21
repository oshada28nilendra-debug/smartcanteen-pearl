const express = require('express');
const { body, param } = require('express-validator');
const {
  getMenuByVendor, getMenuItemById, createMenuItem,
  updateMenuItem, toggleAvailability, deleteMenuItem,
} = require('../controllers/menu.controller');
const { requireAuth, requireRole, requireVendorApproved } = require('../middleware/auth.middleware');
const { validate }   = require('../middleware/validate.middleware');
const { CATEGORIES } = require('../models/MenuItem');
const { ROLES }      = require('../models/User');

const router = express.Router();

/* ── Validation ── */
const createItemRules = [
  body('name').trim().notEmpty().isLength({ min: 2, max: 100 }).withMessage('Name 2–100 chars.'),
  body('description').trim().notEmpty().isLength({ min: 5, max: 500 }).withMessage('Description 5–500 chars.'),
  body('price').isFloat({ min: 0.01 }).withMessage('Price must be > 0.'),
  body('category').notEmpty().isIn(CATEGORIES).withMessage(`Category must be one of: ${CATEGORIES.join(', ')}`),
  // FIX: removed .isURL() — imageUrl can be a base64 data URI from file upload
  body('imageUrl').optional(),
];

const updateItemRules = [
  body('name').optional().trim().isLength({ min: 2, max: 100 }),
  body('description').optional().trim().isLength({ min: 5, max: 500 }),
  body('price').optional().isFloat({ min: 0.01 }),
  body('category').optional().isIn(CATEGORIES),
  // FIX: removed .isURL() here too
  body('imageUrl').optional(),
  body('isAvailable').optional().isBoolean(),
];

/* ── Public routes ── */
router.get('/:vendorId',
  [param('vendorId').isMongoId().withMessage('Invalid vendor ID.')],
  validate, getMenuByVendor
);

router.get('/:vendorId/:itemId',
  [param('vendorId').isMongoId(), param('itemId').isMongoId()],
  validate, getMenuItemById
);

/* ── Vendor-only routes ── */
const vendorGuard = [requireAuth, requireRole(ROLES.VENDOR), requireVendorApproved];

router.post('/', vendorGuard, createItemRules, validate, createMenuItem);

router.put('/:itemId',
  vendorGuard,
  [param('itemId').isMongoId(), ...updateItemRules],
  validate, updateMenuItem
);

router.patch('/:itemId/availability',
  vendorGuard,
  [param('itemId').isMongoId()],
  validate, toggleAvailability
);

router.delete('/:itemId',
  vendorGuard,
  [param('itemId').isMongoId()],
  validate, deleteMenuItem
);

module.exports = router;