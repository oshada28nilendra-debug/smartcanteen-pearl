const { User, ROLES, VENDOR_STATUS } = require('../models/User');
const {
  signAccessToken, signRefreshToken, verifyRefreshToken, JWT_EXPIRES_IN,
} = require('../config/jwt');
const { sendSuccess, sendCreated, sendError, sendUnauthorized, sendForbidden } = require('../utils/apiResponse');
const logger = require('../utils/logger');

const ADMIN_SECRET = 'PEARL-ADMIN';

const issueTokens = async (user) => {
  const accessToken  = signAccessToken(user.toJWTPayload());
  const refreshToken = signRefreshToken({ id: user._id });
  user.refreshToken  = refreshToken;
  await user.save({ validateBeforeSave: false });
  return { accessToken, refreshToken };
};

/* ── POST /api/auth/register ── */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, studentId, businessName, description, contactPhone, secretCode } = req.body;

    // Admin registration requires secret code
    if (role === ROLES.ADMIN && secretCode !== ADMIN_SECRET) {
      return sendForbidden(res, 'Admin accounts cannot be self-registered.');
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return sendError(res, { statusCode: 409, message: 'Email is already registered.' });

    const userData = { name, email, password, role: role || ROLES.STUDENT };
    if (userData.role === ROLES.STUDENT && studentId) userData.studentId = studentId;
    if (userData.role === ROLES.VENDOR) {
      userData.vendorStatus = VENDOR_STATUS.PENDING;
      userData.vendorProfile = { businessName: businessName || name, description: description || '', contactPhone: contactPhone || '' };
    }

    const user = await User.create(userData);
    logger.info(`New ${user.role} registered: ${user.email}`);

    const message = user.role === ROLES.VENDOR
      ? 'Vendor registered successfully. Your account is pending admin approval.'
      : user.role === ROLES.ADMIN
      ? 'Admin account created successfully. You can now log in.'
      : 'Registration successful. You can now log in.';

    return sendCreated(res, {
      message,
      data: { user: { id: user._id, name: user.name, email: user.email, role: user.role, vendorStatus: user.vendorStatus } },
    });
  } catch (error) { next(error); }
};

/* ── POST /api/auth/login ── */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findByEmailWithPassword(email);

    if (!user || !(await user.comparePassword(password))) {
      logger.warn(`Failed login: ${email}`);
      return sendUnauthorized(res, 'Invalid email or password.');
    }
    if (!user.isAccessible()) return sendForbidden(res, 'Account is deactivated or banned. Contact support.');

    const { accessToken, refreshToken } = await issueTokens(user);
    logger.info(`User logged in: ${user.email} (${user.role})`);

    return sendSuccess(res, {
      message: 'Login successful.',
      data: {
        accessToken, refreshToken, expiresIn: JWT_EXPIRES_IN,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, vendorStatus: user.vendorStatus, accountStatus: user.accountStatus },
      },
    });
  } catch (error) { next(error); }
};

/* ── POST /api/auth/refresh ── */
const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return sendUnauthorized(res, 'Refresh token is required.');

    let decoded;
    try { decoded = verifyRefreshToken(refreshToken); }
    catch { return sendUnauthorized(res, 'Invalid or expired refresh token. Please log in again.'); }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user) return sendUnauthorized(res, 'User not found.');

    if (user.refreshToken !== refreshToken) {
      logger.warn(`Refresh token reuse detected: ${user._id}`);
      user.refreshToken = null;
      await user.save({ validateBeforeSave: false });
      return sendUnauthorized(res, 'Token reuse detected. Please log in again.');
    }
    if (!user.isAccessible()) return sendForbidden(res, 'Account is deactivated.');

    const { accessToken, refreshToken: newRefreshToken } = await issueTokens(user);
    return sendSuccess(res, {
      message: 'Token refreshed.',
      data: { accessToken, refreshToken: newRefreshToken, expiresIn: JWT_EXPIRES_IN },
    });
  } catch (error) { next(error); }
};

/* ── POST /api/auth/logout ── */
const logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('+refreshToken');
    if (user) { user.refreshToken = null; await user.save({ validateBeforeSave: false }); }
    logger.info(`User logged out: ${req.user.email}`);
    return sendSuccess(res, { message: 'Logged out successfully.' });
  } catch (error) { next(error); }
};

/* ── GET /api/auth/me ── */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return sendUnauthorized(res, 'User not found.');
    return sendSuccess(res, { data: { user } });
  } catch (error) { next(error); }
};

module.exports = { register, login, refresh, logout, getMe };