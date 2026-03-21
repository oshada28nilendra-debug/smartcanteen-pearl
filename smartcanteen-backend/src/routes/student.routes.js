const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { sendSuccess } = require('../utils/apiResponse');
const { ROLES, User } = require('../models/User');

const router = express.Router();

router.use(requireAuth, requireRole(ROLES.STUDENT));

// GET /api/student/dashboard
router.get('/dashboard', (req, res) => {
  sendSuccess(res, {
    message: 'Welcome to your student dashboard.',
    data: {
      student: {
        id: req.user._id, name: req.user.name,
        email: req.user.email, studentId: req.user.studentId,
      },
    },
  });
});

// GET /api/student/vendors
// Returns all APPROVED vendors regardless of accountStatus
// so vendors show up in student dashboard once admin approves them
router.get('/vendors', async (req, res, next) => {
  try {
    const vendors = await User.find({
      role:         ROLES.VENDOR,
      vendorStatus: 'approved',
      // FIX: removed accountStatus filter — a vendor might have
      // default null/undefined accountStatus and still be valid
    })
      .select('_id name email vendorProfile vendorStatus createdAt')
      .sort({ createdAt: -1 });

    return sendSuccess(res, { data: { vendors, count: vendors.length } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;