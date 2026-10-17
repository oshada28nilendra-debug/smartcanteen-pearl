require('dotenv').config();
const mongoose=require('mongoose');
const crypto=require('crypto');
const {Order}=require('../src/models/Order');
const {MenuItem}=require('../src/models/MenuItem');
const {PickupSlot}=require('../src/models/PickupSlot');
const {User}=require('../src/models/User');
(async()=>{await mongoose.connect(process.env.MONGO_URI);const session=await mongoose.startSession();try{await session.withTransaction(async()=>{
 await MenuItem.updateMany({dailyStock:{$exists:false}},{$set:{dailyStock:0,stockRemaining:0,stockAllocated:0}},{session});
 await User.updateMany({role:'vendor','vendorProfile.openingTime':{$exists:false}},{$set:{'vendorProfile.openingTime':'08:00','vendorProfile.closingTime':'18:00','vendorProfile.openDays':[1,2,3,4,5],'vendorProfile.ordersPaused':false}},{session});
 const old=await Order.find({reservationState:{$exists:false}}).session(session);
 for(const order of old){if(order.paymentStatus==='PAID'){order.reservationState='committed';if(!['Completed','Cancelled'].includes(order.status))order.pickupCode=crypto.randomBytes(24).toString('hex');}else{order.reservationState='released';order.paymentStatus='CANCELLED';order.status='Cancelled';}await order.save({session});}
 const slots=await PickupSlot.find().session(session);for(const slot of slots){const count=await Order.countDocuments({pickupSlotId:slot._id,reservationState:{$in:['held','committed']},status:{$ne:'Cancelled'}}).session(session);await PickupSlot.updateOne({_id:slot._id},{$set:{currentOrdersCount:count}},{session});}
 });console.log('First release migration complete.');}finally{await session.endSession();await mongoose.disconnect();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
