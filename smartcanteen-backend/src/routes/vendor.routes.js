const express = require('express');
const { requireAuth, requireRole, requireVendorApproved } = require('../middleware/auth.middleware');
const { sendSuccess } = require('../utils/apiResponse');
const { ROLES, User } = require('../models/User');

const router = express.Router();

router.use(requireAuth, requireRole(ROLES.VENDOR), requireVendorApproved);

// GET /api/vendor/dashboard
router.get('/dashboard', (req, res) => {
  sendSuccess(res, {
    message: 'Welcome to your vendor dashboard.',
    data: {
      vendor: {
        id:           req.user._id,
        name:         req.user.name,
        businessName: req.user.vendorProfile?.businessName,
        vendorStatus: req.user.vendorStatus,
      },
    },
  });
});

// GET /api/vendor/profile — returns full vendor profile from DB
router.get('/profile', async (req, res) => {
  try {
    // Re-fetch from DB to ensure fresh data
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    return sendSuccess(res, { data: { user } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/vendor/profile — saves ALL vendor profile fields to MongoDB
router.patch('/profile', async (req, res) => {
  try {
    const {
      businessName, description, contactPhone, bannerImage,
      bankName, bankBranch, accountNumber, accountName,
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Ensure vendorProfile object exists
    if (!user.vendorProfile) user.vendorProfile = {};

    // Update all fields if provided
    if (businessName !== undefined) user.vendorProfile.businessName = businessName;
    if (description  !== undefined) user.vendorProfile.description  = description;
    if (contactPhone !== undefined) user.vendorProfile.contactPhone = contactPhone;
    if (bannerImage  !== undefined) user.vendorProfile.bannerImage  = bannerImage;

    // Payment details
    if (!user.vendorProfile.paymentDetails) user.vendorProfile.paymentDetails = {};
    if (bankName      !== undefined) user.vendorProfile.paymentDetails.bankName      = bankName;
    if (bankBranch    !== undefined) user.vendorProfile.paymentDetails.bankBranch    = bankBranch;
    if (accountNumber !== undefined) user.vendorProfile.paymentDetails.accountNumber = accountNumber;
    if (accountName   !== undefined) user.vendorProfile.paymentDetails.accountName   = accountName;

    // CRITICAL: markModified tells Mongoose the nested object changed
    // Without this, Mongoose won't detect changes to nested objects and won't save them
    user.markModified('vendorProfile');

    await user.save({ validateBeforeSave: false });

    return sendSuccess(res, {
      message: 'Shop profile updated successfully.',
      data: { user },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;