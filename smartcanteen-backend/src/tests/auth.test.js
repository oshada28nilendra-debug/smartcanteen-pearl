require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const app     = require('../app');
const db      = require('./helpers/testDb');
const {
  createStudent, createPendingVendor, createApprovedVendor,
  createAdmin, createInactiveStudent, buildStudent, buildVendor, tokenFor,
} = require('./helpers/testFactories');
const { User, ROLES, VENDOR_STATUS, ACCOUNT_STATUS } = require('../models/User');

beforeAll(async () => { await db.connect(); });
afterEach(async () => { await db.clearCollections(); });
afterAll(async ()  => { await db.disconnect(); });

/* ══ POST /api/auth/register ══ */
describe('POST /api/auth/register', () => {

  describe('Student', () => {
    test('✅ registers successfully', async () => {
      const res = await request(app).post('/api/auth/register').send(buildStudent());
      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe(ROLES.STUDENT);
      expect(res.body.data.user.password).toBeUndefined();
    });

    test('✅ password is hashed in DB', async () => {
      const d = buildStudent();
      await request(app).post('/api/auth/register').send(d);
      const u = await User.findOne({ email: d.email }).select('+password');
      expect(u.password).not.toBe(d.password);
      expect(u.password).toMatch(/^\$2[ab]\$/);
    });

    test('✅ account is ACTIVE after register', async () => {
      const d = buildStudent();
      await request(app).post('/api/auth/register').send(d);
      const u = await User.findOne({ email: d.email });
      expect(u.accountStatus).toBe(ACCOUNT_STATUS.ACTIVE);
    });

    test('❌ duplicate email → 409', async () => {
      const d = buildStudent();
      await request(app).post('/api/auth/register').send(d);
      const res = await request(app).post('/api/auth/register').send(d);
      expect(res.status).toBe(409);
    });

    test('❌ weak password (no uppercase) → 422', async () => {
      const res = await request(app).post('/api/auth/register').send(buildStudent({ password: 'password@123' }));
      expect(res.status).toBe(422);
    });

    test('❌ weak password (no special char) → 422', async () => {
      const res = await request(app).post('/api/auth/register').send(buildStudent({ password: 'Password123' }));
      expect(res.status).toBe(422);
    });

    test('❌ invalid email → 422', async () => {
      const res = await request(app).post('/api/auth/register').send(buildStudent({ email: 'not-email' }));
      expect(res.status).toBe(422);
    });
  });

  describe('Vendor', () => {
    test('✅ registers with PENDING status', async () => {
      const res = await request(app).post('/api/auth/register').send(buildVendor());
      expect(res.status).toBe(201);
      expect(res.body.data.user.vendorStatus).toBe(VENDOR_STATUS.PENDING);
    });

    test('✅ message mentions pending approval', async () => {
      const res = await request(app).post('/api/auth/register').send(buildVendor());
      expect(res.body.message.toLowerCase()).toMatch(/pending/);
    });
  });

  describe('Admin self-register prevention', () => {
    test('❌ cannot register as admin → 403', async () => {
      const res = await request(app).post('/api/auth/register').send(buildStudent({ role: 'admin' }));
      expect(res.status).toBe(403);
    });
  });
});

/* ══ POST /api/auth/login ══ */
describe('POST /api/auth/login', () => {

  test('✅ returns accessToken and refreshToken', async () => {
    const u   = await createStudent();
    const res = await request(app).post('/api/auth/login').send({ email: u.email, password: u._plainPassword });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data).toHaveProperty('refreshToken');
    expect(res.body.data.user.password).toBeUndefined();
  });

  test('✅ vendor login shows vendorStatus', async () => {
    const v   = await createPendingVendor();
    const res = await request(app).post('/api/auth/login').send({ email: v.email, password: v._plainPassword });
    expect(res.status).toBe(200);
    expect(res.body.data.user.vendorStatus).toBe(VENDOR_STATUS.PENDING);
  });

  test('❌ wrong password → 401', async () => {
    const u   = await createStudent();
    const res = await request(app).post('/api/auth/login').send({ email: u.email, password: 'WrongPass@999' });
    expect(res.status).toBe(401);
  });

  test('❌ unknown email → 401 (no enumeration)', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@test.com', password: 'Pass@123' });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  test('❌ inactive user → 403', async () => {
    const u   = await createInactiveStudent();
    const res = await request(app).post('/api/auth/login').send({ email: u.email, password: u._plainPassword });
    expect(res.status).toBe(403);
  });

  test('❌ missing password → 422', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@test.com' });
    expect(res.status).toBe(422);
  });
});

/* ══ POST /api/auth/refresh ══ */
describe('POST /api/auth/refresh', () => {

  test('✅ valid refresh token issues new tokens', async () => {
    const u     = await createStudent();
    const login = await request(app).post('/api/auth/login').send({ email: u.email, password: u._plainPassword });
    const res   = await request(app).post('/api/auth/refresh').send({ refreshToken: login.body.data.refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.refreshToken).not.toBe(login.body.data.refreshToken); // rotated
  });

  test('❌ invalid token → 401', async () => {
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'fake.token.here' });
    expect(res.status).toBe(401);
  });

  test('❌ reused refresh token → 401 (rotation security)', async () => {
    const u     = await createStudent();
    const login = await request(app).post('/api/auth/login').send({ email: u.email, password: u._plainPassword });
    const { refreshToken } = login.body.data;
    await request(app).post('/api/auth/refresh').send({ refreshToken }); // use once
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken }); // reuse
    expect(res.status).toBe(401);
  });
});

/* ══ POST /api/auth/logout ══ */
describe('POST /api/auth/logout', () => {

  test('✅ logged-in user can logout', async () => {
    const u   = await createStudent();
    const res = await request(app).post('/api/auth/logout')
      .set('Authorization', `Bearer ${tokenFor(u)}`);
    expect(res.status).toBe(200);
  });

  test('✅ refresh token invalid after logout', async () => {
    const u     = await createStudent();
    const login = await request(app).post('/api/auth/login').send({ email: u.email, password: u._plainPassword });
    const { accessToken, refreshToken } = login.body.data;
    await request(app).post('/api/auth/logout').set('Authorization', `Bearer ${accessToken}`);
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(401);
  });

  test('❌ no token → 401', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });
});

/* ══ GET /api/auth/me ══ */
describe('GET /api/auth/me', () => {

  test('✅ returns user profile', async () => {
    const u   = await createStudent();
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenFor(u)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(u.email);
    expect(res.body.data.user.password).toBeUndefined();
  });

  test('✅ vendor profile includes vendorStatus', async () => {
    const v   = await createApprovedVendor();
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${tokenFor(v)}`);
    expect(res.body.data.user.vendorStatus).toBe(VENDOR_STATUS.APPROVED);
  });

  test('❌ no token → 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('❌ expired token → 401', async () => {
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
});