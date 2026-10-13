process.env.NODE_ENV='test';
const mongoose=require('mongoose');
const {MongoMemoryReplSet}=require('mongodb-memory-server');
const {User}=require('../models/User');
const {MenuItem}=require('../models/MenuItem');
const {PickupSlot}=require('../models/PickupSlot');
const {Order}=require('../models/Order');
const {createIntent,settlePayment,expireReservations}=require('../services/reservations');
const {localDate}=require('../services/availability');
let repl,vendor,student,item,slot;
beforeAll(async()=>{repl=await MongoMemoryReplSet.create({replSet:{count:1}});await mongoose.connect(repl.getUri());await Promise.all([User.init(),MenuItem.init(),PickupSlot.init(),Order.init()]);},120000);
afterAll(async()=>{await mongoose.disconnect();await repl?.stop();});
beforeEach(async()=>{jest.useFakeTimers({doNotFake:['nextTick','setImmediate','clearImmediate','setTimeout','clearTimeout','setInterval','clearInterval','performance','hrtime','queueMicrotask']});jest.setSystemTime(new Date('2026-10-13T06:00:00Z'));await Promise.all(Object.values(mongoose.connection.collections).map(c=>c.deleteMany({})));vendor=await User.create({name:'Test Shop',email:'vendor@test.com',password:'password123',role:'vendor',vendorStatus:'approved',vendorProfile:{openingTime:'00:00',closingTime:'23:59',openDays:[0,1,2,3,4,5,6]}});student=await User.create({name:'Student',email:'student@test.com',password:'password123'});item=await MenuItem.create({vendorId:vendor._id,name:'Meal',description:'Test meal description',category:'Rice',price:100,dailyStock:2});slot=await PickupSlot.create({vendorId:vendor._id,date:new Date(localDate()),slotStart:'23:45',slotEnd:'23:59',maxOrders:1});});
afterEach(()=>jest.useRealTimers());
const body=()=>({vendorId:vendor._id,pickupSlotId:slot._id,items:[{menuItemId:item._id,quantity:1}]});
test('concurrent intents cannot oversell slot; payment duplicates do not reserve twice',async()=>{const results=await Promise.allSettled([createIntent(student._id,body()),createIntent(student._id,body())]);expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);const order=results.find(r=>r.status==='fulfilled').value;expect((await PickupSlot.findById(slot._id)).currentOrdersCount).toBe(1);expect((await MenuItem.findById(item._id)).stockRemaining).toBe(1);expect((await settlePayment(order._id,'payment')).changed).toBe(true);expect((await settlePayment(order._id,'payment')).changed).toBe(false);expect((await PickupSlot.findById(slot._id)).currentOrdersCount).toBe(1);expect((await Order.findById(order._id).select('+pickupCode')).pickupCode).toMatch(/^[a-f0-9]{48}$/);});
test('expired hold releases inventory once and late payment requires review',async()=>{const order=await createIntent(student._id,body());await Order.updateOne({_id:order._id},{$set:{reservationExpiresAt:new Date(0)}});await expireReservations();await expireReservations();expect((await MenuItem.findById(item._id)).stockRemaining).toBe(2);expect((await PickupSlot.findById(slot._id)).currentOrdersCount).toBe(0);await settlePayment(order._id,'late');const final=await Order.findById(order._id);expect(final.paymentStatus).not.toBe('PAID');expect(final.paymentReviewRequired).toBe(true);});
test('cross vendor items and slots fail without reserving',async()=>{await MenuItem.updateOne({_id:item._id},{$set:{vendorId:student._id}});await expect(createIntent(student._id,body())).rejects.toThrow('another vendor');expect((await PickupSlot.findById(slot._id)).currentOrdersCount).toBe(0);});
const response=()=>({statusCode:200,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;},send(body){this.body=body;return this;}});
test('pickup belongs to vendor, is ready-only and single-use',async()=>{const order=await createIntent(student._id,body());await settlePayment(order._id,'p');await Order.updateOne({_id:order._id},{$set:{status:'Ready for Pickup'}});const paid=await Order.findById(order._id).select('+pickupCode');const {verifyPickup}=require('../controllers/student.controller');let res=response();await verifyPickup({body:{code:paid.pickupCode},user:student,app:{get:()=>null}},res,e=>{throw e;});expect(res.statusCode).toBe(409);res=response();await verifyPickup({body:{code:paid.pickupCode},user:vendor,app:{get:()=>null}},res,e=>{throw e;});expect(res.statusCode).toBe(200);res=response();await verifyPickup({body:{code:paid.pickupCode},user:vendor,app:{get:()=>null}},res,e=>{throw e;});expect(res.statusCode).toBe(409);});
test('payment status cannot be read by another student',async()=>{const order=await createIntent(student._id,body());const res=response();await require('../controllers/payment.controller').getPaymentStatus({params:{orderId:order._id},user:vendor},res,e=>{throw e;});expect(res.statusCode).toBe(403);});
test('PayHere verifies official callback signature and amount, replays are idempotent',async()=>{process.env.PAYHERE_MERCHANT_ID='merchant';process.env.PAYHERE_MERCHANT_SECRET='secret';const order=await createIntent(student._id,body());await Order.updateOne({_id:order._id},{$set:{payhereOrderId:String(order._id)}});const crypto=require('crypto');const md5=s=>crypto.createHash('md5').update(s).digest('hex').toUpperCase();const notify=async(amount)=>{const b={merchant_id:'merchant',order_id:String(order._id),payhere_amount:amount,payhere_currency:'LKR',status_code:'2',payment_id:'reference'};b.md5sig=md5(`${b.merchant_id}${b.order_id}${amount}LKR2${md5('secret')}`);const res=response();await require('../controllers/payment.controller').payhereNotify({body:b,app:{get:()=>null}},res);return res;};expect((await notify('101.00')).statusCode).toBe(400);expect((await notify('100.00')).statusCode).toBe(200);expect((await notify('100.00')).statusCode).toBe(200);expect((await PickupSlot.findById(slot._id)).currentOrdersCount).toBe(1);});
test('failed durable notification rolls payment back and callback retry creates one notification',async()=>{
 const {Notification,NOTIFICATION_TYPES}=require('../models/Notification');
 const order=await createIntent(student._id,body());
 await Order.updateOne({_id:order._id},{$set:{payhereOrderId:String(order._id)}});
 process.env.PAYHERE_MERCHANT_ID='merchant';process.env.PAYHERE_MERCHANT_SECRET='secret';
 const crypto=require('crypto');const md5=s=>crypto.createHash('md5').update(s).digest('hex').toUpperCase();
 const payload={merchant_id:'merchant',order_id:String(order._id),payhere_amount:'100.00',payhere_currency:'LKR',status_code:'2',payment_id:'reference'};
 payload.md5sig=md5(`merchant${order._id}100.00LKR2${md5('secret')}`);
 const notify=async()=>{const res=response();await require('../controllers/payment.controller').payhereNotify({body:payload,app:{get:()=>null}},res);return res;};
 const insert=jest.spyOn(Notification,'create').mockRejectedValueOnce(new Error('Notification insert temporarily failed'));
 try{
  expect((await notify()).statusCode).toBe(500);
  expect((await Order.findById(order._id)).paymentStatus).toBe('INITIATED');
  expect((await notify()).statusCode).toBe(200);
  expect((await notify()).statusCode).toBe(200);
  expect((await Order.findById(order._id)).paymentStatus).toBe('PAID');
  expect(await Notification.countDocuments({userId:vendor._id,type:NOTIFICATION_TYPES.ORDER_NEW,'meta.orderId':order._id})).toBe(1);
 }finally{insert.mockRestore();}
});
test('stock edit saves dollar-prefixed name literally and applies price normalization',async()=>{
 const res=response();let failure;
 await require('../controllers/menu.controller').updateMenuItem({params:{itemId:item._id},user:vendor,body:{name:' $special ',price:'123.456',dailyStock:5}},res,e=>{failure=e;});
 if(failure)throw failure;
 const changed=await MenuItem.findById(item._id);
 expect(changed.name).toBe('$special');expect(changed.price).toBe(123.46);expect(changed.dailyStock).toBe(5);expect(changed.stockRemaining).toBe(5);
});
