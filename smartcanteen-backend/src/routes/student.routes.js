const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');
const { sendSuccess } = require('../utils/apiResponse');
const { ROLES, User } = require('../models/User');

const router = express.Router();

router.use(requireAuth, requireRole(ROLES.STUDENT));

router.get('/catalog', require('../controllers/student.controller').catalog);
router.get('/favourites', require('../controllers/student.controller').favourites);
router.put('/favourites', require('../controllers/student.controller').favourites);
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
// All active shops are discoverable without an approval workflow.
router.get('/vendors', async (req, res, next) => {
  try {
    const vendors = await User.find({
      role:         ROLES.VENDOR,
      accountStatus:'active',
    })
      .select(require('../controllers/student.controller').publicFields || 'name vendorProfile.businessName vendorProfile.description vendorProfile.bannerImage vendorStatus')
      .sort({ createdAt: -1 });

    return sendSuccess(res, { data: { vendors, count: vendors.length } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;