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

  test('❌ removed admin route returns 404 for students', async () => {
    const u   = await createStudent();
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${tokenFor(u)}`);
    expect(res.status).toBe(404);
  });

  test('✅ removed admin route returns 404 for admins', async () => {
    const a   = await createAdmin();
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${tokenFor(a)}`);
    expect(res.status).toBe(404);
  });

  test('❌ removed admin route returns 404 for vendors', async () => {
    const v   = await createApprovedVendor();
    const res = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${tokenFor(v)}`);
    expect(res.status).toBe(404);
  });
});

/* ══ requireVendorActive ══ */
describe('requireVendorActive middleware', () => {

  test('✅ APPROVED vendor accesses vendor dashboard → 200', async () => {
    const v   = await createApprovedVendor();
    const res = await request(app).get('/api/vendor/dashboard').set('Authorization', `Bearer ${tokenFor(v)}`);
    expect(res.status).toBe(200);
  });

  test('legacy pending vendor can manage shop', async () => {
    const v   = await createPendingVendor();
    const res = await request(app).get('/api/vendor/dashboard').set('Authorization', `Bearer ${tokenFor(v)}`);
    expect(res.status).toBe(200);
  });

  test('legacy approval status does not gate active vendor', async () => {
    const v   = await createRejectedVendor();
    const res = await request(app).get('/api/vendor/dashboard').set('Authorization', `Bearer ${tokenFor(v)}`);
    expect(res.status).toBe(200);
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


describe('Self-service shops',()=>{
 test('pending vendor saves food, student discovers shop, another vendor cannot edit food',async()=>{
  const v=await createPendingVendor(),student=await createStudent(),other=await createPendingVendor();
  const meal=await request(app).post('/api/menu').set('Authorization',`Bearer ${tokenFor(v)}`).send({name:'Rice bowl',description:'Freshly cooked rice bowl',category:'Rice',price:350,dailyStock:10});
  expect(meal.status).toBe(201);
  const profile=await request(app).patch('/api/vendor/profile').set('Authorization',`Bearer ${tokenFor(v)}`).send({businessName:'My new shop'});
  expect(profile.status).toBe(200);
  const shops=await request(app).get('/api/student/vendors').set('Authorization',`Bearer ${tokenFor(student)}`);
  expect(shops.status).toBe(200);
  expect(JSON.stringify(shops.body)).toContain(String(v._id));
  const edit=await request(app).put(`/api/menu/${meal.body.data.item._id}`).set('Authorization',`Bearer ${tokenFor(other)}`).send({price:1});
  expect(edit.status).toBe(403);
 });
 test('inactive vendor still cannot create food',async()=>{
  const v=await createPendingVendor();v.accountStatus='inactive';await v.save();
  const res=await request(app).post('/api/menu').set('Authorization',`Bearer ${tokenFor(v)}`).send({name:'Rice bowl',description:'Freshly cooked rice bowl',category:'Rice',price:350});
  expect(res.status).toBe(403);
 });
 test('old public admin secret cannot create an admin',async()=>{
  const res=await request(app).post('/api/auth/register').send({name:'Unsafe Admin',email:'admin-attempt@test.com',password:'StrongPass@123',role:'admin',secretCode:'PEARL-ADMIN'});
  expect(res.status).toBe(403);
 });
});

 test('public vendor cards exclude private account and banking data',async()=>{
  const v=await createPendingVendor();
  v.vendorProfile.paymentDetails={bankName:'Private Bank',accountNumber:'123456'};
  await v.save();
  const res=await request(app).get('/api/public/vendors');
  expect(res.status).toBe(200);
  expect(res.body.data.vendors).toHaveLength(1);
  expect(res.body.data.vendors[0]._id).toBe(String(v._id));
  expect(Object.keys(res.body.data.vendors[0]).sort()).toEqual(['_id','businessName','categories','description','image']);
  expect(JSON.stringify(res.body)).not.toContain(v.email);
  expect(JSON.stringify(res.body)).not.toContain('123456');
 });
