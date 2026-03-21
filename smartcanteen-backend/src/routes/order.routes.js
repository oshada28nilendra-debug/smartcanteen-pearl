const express = require('express');
const { body, param, query } = require('express-validator');
const {
  createOrderIntent, confirmPayment, getAvailableSlots,
  getMyOrders, getOrderById, getVendorOrders, updateOrderStatus,
} = require('../controllers/order.controller');
const { requireAuth, requireRole, requireVendorApproved } = require('../middleware/auth.middleware');
const { validate }    = require('../middleware/validate.middleware');
const { ROLES }       = require('../models/User');
const { ORDER_STATUS } = require('../models/Order');

const router = express.Router();

/* ── Student routes ── */
const studentGuard = [requireAuth, requireRole(ROLES.STUDENT)];

// GET /api/orders/my
router.get('/my', studentGuard, getMyOrders);

// GET /api/orders/slots/:vendorId
router.get('/slots/:vendorId',
  studentGuard,
  [
    param('vendorId').isMongoId().withMessage('Invalid vendor ID.'),
    query('date').notEmpty().withMessage('date is required (YYYY-MM-DD).')
      .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('date must be YYYY-MM-DD format.'),
  ],
  validate, getAvailableSlots
);

// POST /api/orders/intent
router.post('/intent',
  studentGuard,
  [
    body('vendorId').isMongoId().withMessage('Valid vendorId required.'),
    body('pickupSlotId').isMongoId().withMessage('Valid pickupSlotId required.'),
    body('items').isArray({ min: 1 }).withMessage('items must be a non-empty array.'),
    body('items.*.menuItemId').isMongoId().withMessage('Each item must have a valid menuItemId.'),
    body('items.*.quantity').isInt({ min: 1, max: 20 }).withMessage('Quantity must be 1–20.'),
    body('specialInstructions').optional().isLength({ max: 200 }),
  ],
  validate, createOrderIntent
);

// POST /api/orders/:id/confirm-payment  ← FIX: new route for card/demo payments
router.post('/:id/confirm-payment',
  studentGuard,
  [param('id').isMongoId().withMessage('Invalid order ID.')],
  validate, confirmPayment
);

/* ── Shared route ── */
// GET /api/orders/:id
router.get('/:id',
  requireAuth,
  [param('id').isMongoId().withMessage('Invalid order ID.')],
  validate, getOrderById
);

/* ── Vendor routes ── */
const vendorGuard = [requireAuth, requireRole(ROLES.VENDOR), requireVendorApproved];

// GET /api/orders/vendor/all
router.get('/vendor/all', vendorGuard, getVendorOrders);

// PATCH /api/orders/:id/status
router.patch('/:id/status',
  vendorGuard,
  [
    param('id').isMongoId().withMessage('Invalid order ID.'),
    body('status').notEmpty().isIn(Object.values(ORDER_STATUS))
      .withMessage(`Status must be one of: ${Object.values(ORDER_STATUS).join(', ')}`),
  ],
  validate, updateOrderStatus
);

module.exports = router;