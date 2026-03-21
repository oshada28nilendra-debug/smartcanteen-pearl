const { User, ROLES, VENDOR_STATUS, ACCOUNT_STATUS } = require('../../models/User');
const { signAccessToken, signRefreshToken }           = require('../../config/jwt');

/* ── Raw builders (no DB) ── */
const buildStudent = (overrides = {}) => ({
  name: 'Test Student',
  email: `student_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
  password: 'Student@123', role: ROLES.STUDENT, studentId: 'STU001', ...overrides,
});

const buildVendor = (overrides = {}) => ({
  name: 'Test Vendor',
  email: `vendor_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
  password: 'Vendor@123', role: ROLES.VENDOR,
  businessName: 'Test Canteen', description: 'A test canteen', contactPhone: '0771234567',
  ...overrides,
});

const buildAdmin = (overrides = {}) => ({
  name: 'Test Admin',
  email: `admin_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`,
  password: 'Admin@123', role: ROLES.ADMIN, ...overrides,
});

/* ── DB creators ── */
const createStudent = async (overrides = {}) => {
  const d = buildStudent(overrides);
  const u = await User.create({ name: d.name, email: d.email, password: d.password, role: ROLES.STUDENT, studentId: d.studentId });
  u._plainPassword = d.password; return u;
};

const createPendingVendor = async (overrides = {}) => {
  const d = buildVendor(overrides);
  const u = await User.create({
    name: d.name, email: d.email, password: d.password,
    role: ROLES.VENDOR, vendorStatus: VENDOR_STATUS.PENDING,
    vendorProfile: { businessName: d.businessName, description: d.description, contactPhone: d.contactPhone },
  });
  u._plainPassword = d.password; return u;
};

const createApprovedVendor = async (overrides = {}) => {
  const d = buildVendor(overrides);
  const u = await User.create({
    name: d.name, email: d.email, password: d.password,
    role: ROLES.VENDOR, vendorStatus: VENDOR_STATUS.APPROVED, approvedAt: new Date(),
    vendorProfile: { businessName: d.businessName, description: d.description, contactPhone: d.contactPhone },
  });
  u._plainPassword = d.password; return u;
};

const createRejectedVendor = async (overrides = {}) => {
  const d = buildVendor(overrides);
  const u = await User.create({
    name: d.name, email: d.email, password: d.password,
    role: ROLES.VENDOR, vendorStatus: VENDOR_STATUS.REJECTED, rejectedAt: new Date(),
    vendorProfile: { businessName: d.businessName },
  });
  u._plainPassword = d.password; return u;
};

const createAdmin = async (overrides = {}) => {
  const d = buildAdmin(overrides);
  const u = await User.create({ name: d.name, email: d.email, password: d.password, role: ROLES.ADMIN });
  u._plainPassword = d.password; return u;
};

const createInactiveStudent = async (overrides = {}) => {
  const d = buildStudent(overrides);
  const u = await User.create({
    name: d.name, email: d.email, password: d.password,
    role: ROLES.STUDENT, accountStatus: ACCOUNT_STATUS.INACTIVE,
  });
  u._plainPassword = d.password; return u;
};

/* ── Token helpers ── */
const tokenFor = (user) =>
  signAccessToken(user.toJWTPayload ? user.toJWTPayload() : { id: user._id, role: user.role, vendorStatus: user.vendorStatus });

const refreshTokenFor = (user) => signRefreshToken({ id: user._id });
const authHeader      = (user) => ({ Authorization: `Bearer ${tokenFor(user)}` });

module.exports = {
  buildStudent, buildVendor, buildAdmin,
  createStudent, createPendingVendor, createApprovedVendor,
  createRejectedVendor, createAdmin, createInactiveStudent,
  tokenFor, refreshTokenFor, authHeader,
};