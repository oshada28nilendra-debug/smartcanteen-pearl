const express = require('express');
const { body, param } = require('express-validator');
const { initiatePayment, payhereNotify, getPaymentStatus } = require('../controllers/payment.controller');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { ROLES }    = require('../models/User');

const router = express.Router();

// POST /api/payment/initiate  (student — start PayHere checkout)
router.post('/initiate',
  requireAuth, requireRole(ROLES.STUDENT),
  [body('orderId').isMongoId().withMessage('Valid orderId required.')],
  validate, initiatePayment
);

// POST /api/payment/notify  (PayHere server-to-server callback — NO auth)
router.post('/notify', express.urlencoded({ extended: false }), payhereNotify);

// GET /api/payment/status/:orderId  (student)
router.get('/status/:orderId',
  requireAuth,
  [param('orderId').isMongoId().withMessage('Invalid order ID.')],
  validate, getPaymentStatus
);

module.exports = router;