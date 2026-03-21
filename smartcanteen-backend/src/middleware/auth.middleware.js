const { verifyAccessToken }  = require('../config/jwt');
const { User, ROLES, VENDOR_STATUS, ACCOUNT_STATUS } = require('../models/User');
const { sendUnauthorized, sendForbidden } = require('../utils/apiResponse');
const logger = require('../utils/logger');

const extractToken = (req) => {
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) return h.slice(7);
  return null;
};

/* ── requireAuth ──────────────────────────── */
const requireAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) return sendUnauthorized(res, 'No token provided. Please log in.');

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError')  return sendUnauthorized(res, 'Access token expired. Please refresh your token.');
      if (err.name === 'JsonWebTokenError')  return sendUnauthorized(res, 'Invalid token. Please log in again.');
      throw err;
    }

    const user = await User.findById(decoded.id);
    if (!user) return sendUnauthorized(res, 'User no longer exists.');
    if (user.passwordChangedAfter(decoded.iat)) return sendUnauthorized(res, 'Password was recently changed. Please log in again.');
    if (user.accountStatus === ACCOUNT_STATUS.BANNED)   return sendForbidden(res, 'Your account has been banned. Contact support.');
    if (user.accountStatus === ACCOUNT_STATUS.INACTIVE) return sendForbidden(res, 'Your account has been deactivated. Contact an administrator.');

    req.user = user;
    next();
  } catch (error) {
    logger.error(`requireAuth error: ${error.message}`);
    return sendUnauthorized(res, 'Authentication failed.');
  }
};

/* ── requireRole(...roles) ────────────────── */
const requireRole = (...roles) => {
  const validRoles = Object.values(ROLES);
  roles.forEach((r) => {
    if (!validRoles.includes(r)) throw new Error(`requireRole: invalid role "${r}"`);
  });

  return (req, res, next) => {
    if (!req.user) return sendUnauthorized(res, 'Authentication required.');
    if (!roles.includes(req.user.role)) {
      logger.warn(`Role denied: user ${req.user._id} (${req.user.role}) tried [${roles.join(',')}]`);
      return sendForbidden(res, `Access denied. Required role: ${roles.join(' or ')}.`);
    }
    next();
  };
};

/* ── requireVendorApproved ────────────────── */
const requireVendorApproved = (req, res, next) => {
  if (!req.user) return sendUnauthorized(res, 'Authentication required.');
  if (req.user.role !== ROLES.VENDOR) return next();

  if (req.user.vendorStatus === VENDOR_STATUS.APPROVED) return next();
  if (req.user.vendorStatus === VENDOR_STATUS.PENDING)
    return sendForbidden(res, 'Your vendor account is pending approval. You will be notified once approved.');
  if (req.user.vendorStatus === VENDOR_STATUS.REJECTED)
    return sendForbidden(res, 'Your vendor application has been rejected. Please contact support.');

  return sendForbidden(res, 'Vendor account access denied.');
};

/* ── requireActive ────────────────────────── */
const requireActive = (req, res, next) => {
  if (!req.user) return sendUnauthorized(res, 'Authentication required.');
  if (!req.user.isAccessible()) return sendForbidden(res, 'Account is not active.');
  next();
};

module.exports = { requireAuth, requireRole, requireVendorApproved, requireActive };