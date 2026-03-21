const express = require('express');
const { param } = require('express-validator');
const { getMyNotifications, markOneRead, markAllRead } = require('../controllers/notification.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validate }    = require('../middleware/validate.middleware');

const router = express.Router();

// All notification routes require auth
router.use(requireAuth);

// GET /api/notifications
router.get('/', getMyNotifications);

// PATCH /api/notifications/read-all
router.patch('/read-all', markAllRead);

// PATCH /api/notifications/:id/read
router.patch('/:id/read',
  [param('id').isMongoId().withMessage('Invalid notification ID.')],
  validate, markOneRead
);

module.exports = router;