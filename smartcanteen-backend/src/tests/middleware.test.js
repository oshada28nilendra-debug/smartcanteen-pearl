require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const app     = require('../app');
const db      = require('./helpers/testDb');
const {
  createStudent, createPendingVendor, createApprovedVendor,
  createRejectedVendor, createAdmin, createInactiveStudent, tokenFor,
} = require('./helpers/testFactories');
const { User, ROLES, VENDOR_STATUS } = require('../models/User');

beforeAll(async () => { await db.connect(); });
afterEach(async () => { await db.clearCollections(); });
afterAll(async ()  => { await db.disconnect(); });

/* ══ requireAuth ══ */
describe('requireAuth middleware', () => {

  test('✅ valid Bearer token → 200', async () => {
    const u   = await createStudent();
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenFor(u)}`);
    expect(res.status).toBe(200);
  });

  test('❌ no Authorization header → 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/no token/i);
  });

  test('❌ wrong format (missing Bearer) → 401', async () => {
    const u   = await createStudent();
    const res = await request(app).get('/api/auth/me').set('Authorization', tokenFor(u));
    expect(res.status).toBe(401);
  });

  test('❌ tampered token → 401', async () => {
    const u       = await createStudent();
    const token   = tokenFor(u);
    const tampered = token.slice(0, -5) + 'xxxxx';
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tampered}`);
    expect(res.status).toBe(401);
  });

  test('❌ expired token → 401 with expired message', async () => {
    const jwt     = require('jsonwebtoken');
    const expired = jwt.sign(
      { id: '507f1f77bcf86cd799439011', role: 'student', vendorStatus: null },
      process.env.JWT_SECRET,
      { expiresIn: '1ms', issuer: 'smartcanteen-api', audience: 'smartcanteen-client' }
    );
    await new Promise((r) => setTimeout(r, 50));
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/expired/i);
  });

  test('❌ inactive user → 403', async () => {
    const u   = await createInactiveStudent();
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenFor(u)}`);
    expect(res.status).toBe(403);
  });

  test('❌ deleted user after token issued → 401', async () => {
    const u = await createStudent();
    const t = tokenFor(u);
    await User.findByIdAndDelete(u._id);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${t}`);
    expect(res.status).toBe(401);
  });
});

/* ══ requireRole ══ */
describe('requireRole middleware', () => {

  test('✅ student accesses student-only route → 200', async () => {
    const u   = await createStudent();
    const res = await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${tokenFor(u)}`);
    expect(res.status).toBe(200);
  });

  test('❌ vendor blocked from student route → 403', async () => {
    const v   = await createApprovedVendor();
    const res = await request(app).get('/api/student/dashboard').set('Authorization', `Bearer ${tokenFor(v)}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/access denied/i);
  });

  test('❌ student blocked from admin route → 403', async () => {
    const u   = await createStudent();
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${tokenFor(u)}`);
    expect(res.status).toBe(403);
  });

  test('✅ admin accesses admin route → 200', async () => {
    const a   = await createAdmin();
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${tokenFor(a)}`);
    expect(res.status).toBe(200);
  });

  test('❌ vendor blocked from admin route → 403', async () => {
    const v   = await createApprovedVendor();
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${tokenFor(v)}`);
    expect(res.status).toBe(403);
  });
});

/* ══ requireVendorApproved ══ */
describe('requireVendorApproved middleware', () => {

  test('✅ APPROVED vendor accesses vendor dashboard → 200', async () => {
    const v   = await createApprovedVendor();
    const res = await request(app).get('/api/vendor/dashboard').set('Authorization', `Bearer ${tokenFor(v)}`);
    expect(res.status).toBe(200);
  });

  test('❌ PENDING vendor blocked → 403 with pending message', async () => {
    const v   = await createPendingVendor();
    const res = await request(app).get('/api/vendor/dashboard').set('Authorization', `Bearer ${tokenFor(v)}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/pending/i);
  });

  test('❌ REJECTED vendor blocked → 403 with rejected message', async () => {
    const v   = await createRejectedVendor();
    const res = await request(app).get('/api/vendor/dashboard').set('Authorization', `Bearer ${tokenFor(v)}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/rejected/i);
  });

  test('❌ student blocked from vendor route → 403', async () => {
    const u   = await createStudent();
    const res = await request(app).get('/api/vendor/dashboard').set('Authorization', `Bearer ${tokenFor(u)}`);
    expect(res.status).toBe(403);
  });

  test('❌ unauthenticated → 401 before vendor check', async () => {
    const res = await request(app).get('/api/vendor/dashboard');
    expect(res.status).toBe(401);
  });
});

/* ══ Admin management ══ */
describe('Admin user/vendor management', () => {

  test('✅ admin deactivates a student', async () => {
    const a   = await createAdmin();
    const u   = await createStudent();
    const res = await request(app)
      .patch(`/api/admin/users/${u._id}/deactivate`)
      .set('Authorization', `Bearer ${tokenFor(a)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.accountStatus).toBe('inactive');
  });

  test('✅ admin reactivates a user', async () => {
    const a   = await createAdmin();
    const u   = await createInactiveStudent();
    const res = await request(app)
      .patch(`/api/admin/users/${u._id}/activate`)
      .set('Authorization', `Bearer ${tokenFor(a)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.accountStatus).toBe('active');
  });

  test('❌ admin cannot deactivate themselves → 403', async () => {
    const a   = await createAdmin();
    const res = await request(app)
      .patch(`/api/admin/users/${a._id}/deactivate`)
      .set('Authorization', `Bearer ${tokenFor(a)}`);
    expect(res.status).toBe(403);
  });

  test('✅ admin approves pending vendor', async () => {
    const a   = await createAdmin();
    const v   = await createPendingVendor();
    const res = await request(app)
      .patch(`/api/admin/vendors/${v._id}/status`)
      .set('Authorization', `Bearer ${tokenFor(a)}`)
      .send({ status: 'approved' });
    expect(res.status).toBe(200);
    expect(res.body.data.vendorStatus).toBe(VENDOR_STATUS.APPROVED);
  });

  test('✅ admin rejects pending vendor', async () => {
    const a   = await createAdmin();
    const v   = await createPendingVendor();
    const res = await request(app)
      .patch(`/api/admin/vendors/${v._id}/status`)
      .set('Authorization', `Bearer ${tokenFor(a)}`)
      .send({ status: 'rejected' });
    expect(res.status).toBe(200);
    expect(res.body.data.vendorStatus).toBe(VENDOR_STATUS.REJECTED);
  });

  test('❌ non-admin cannot approve vendor → 403', async () => {
    const u   = await createStudent();
    const v   = await createPendingVendor();
    const res = await request(app)
      .patch(`/api/admin/vendors/${v._id}/status`)
      .set('Authorization', `Bearer ${tokenFor(u)}`)
      .send({ status: 'approved' });
    expect(res.status).toBe(403);
  });
});