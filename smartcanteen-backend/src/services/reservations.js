const mongoose=require('mongoose');
const crypto=require('crypto');
const {Order}=require('../models/Order');
const {MenuItem}=require('../models/MenuItem');
const {PickupSlot}=require('../models/PickupSlot');
const {User}=require('../models/User');
const {Notification,NOTIFICATION_TYPES}=require('../models/Notification');
const {localDate,vendorAvailability}=require('./availability');
const fail=message=>{const e=new Error(message);e.statusCode=409;throw e;};
async function transaction(work) { const session=await mongoose.startSession(); try {let result;await session.withTransaction(async()=>{result=await work(session);});return result;} finally {await session.endSession();} }
async function release(order,session) {
  if(order.reservationState!=='held') return;
  for(const item of order.items) {
    const allocated={$max:[0,{$subtract:[{$ifNull:['$stockAllocated',0]},item.quantity]}]};
    await MenuItem.updateOne({_id:item.menuItemId,stockDate:order.stockDate},[{$set:{stockAllocated:allocated,stockRemaining:{$max:[0,{$subtract:['$dailyStock',allocated]}]}}}],{session});
  }
  await PickupSlot.updateOne({_id:order.pickupSlotId,currentOrdersCount:{$gt:0}},{$inc:{currentOrdersCount:-1}},{session});
  order.reservationState='released'; order.paymentStatus='CANCELLED';order.status='Cancelled';await order.save({session});
}
async function expireReservations() {
  const orders=await Order.find({reservationState:'held',reservationExpiresAt:{$lte:new Date()}}).select('_id');
  for(const candidate of orders) await transaction(async session=>{const order=await Order.findById(candidate._id).session(session);if(order?.reservationState==='held' && order.reservationExpiresAt<=new Date())await release(order,session);});
}
async function createIntent(studentId,body) {
  await expireReservations();
  return transaction(async session=>{
    const now=new Date(), date=localDate(now);
    const vendor=await User.findById(body.vendorId).session(session);
    if(!vendor || vendor.role!=='vendor' || !vendorAvailability(vendor,now).isOpen) fail('Vendor is not accepting orders.');
    // Write the vendor document so concurrent pause/hours edits conflict with this transaction.
    await User.updateOne({_id:vendor._id},{$inc:{__v:1}},{session});
    const slot=await PickupSlot.findOne({_id:body.pickupSlotId,vendorId:body.vendorId,isActive:true,$expr:{$lt:['$currentOrdersCount','$maxOrders']}}).session(session);
    if(!slot || slot.date.toISOString().slice(0,10)!==date || new Date(`${date}T${slot.slotStart}:00+05:30`)<=now || slot.slotStart<vendor.vendorProfile.openingTime || slot.slotEnd>vendor.vendorProfile.closingTime) fail('Pickup slot unavailable.');
    const merged=new Map();for(const i of body.items){if(!Number.isInteger(Number(i.quantity)) || Number(i.quantity)<1 || Number(i.quantity)>20) fail('Invalid quantity.');merged.set(String(i.menuItemId),(merged.get(String(i.menuItemId))||0)+Number(i.quantity));}
    const items=[];
    for(const [id,quantity] of merged){if(quantity>20)fail('Maximum quantity is 20 per item.');let item=await MenuItem.findOne({_id:id,vendorId:body.vendorId,isAvailable:true}).session(session);if(!item)fail('Meal unavailable or belongs to another vendor.');
      if(item.stockDate!==date){await MenuItem.updateOne({_id:id},{$set:{stockDate:date,stockRemaining:item.dailyStock,stockAllocated:0}},{session});}
      item=await MenuItem.findOneAndUpdate({_id:id,stockDate:date,stockRemaining:{$gte:quantity}},{$inc:{stockRemaining:-quantity,stockAllocated:quantity}},{new:true,session});if(!item)fail('Not enough stock.');
      items.push({menuItemId:item._id,nameSnapshot:item.name,priceSnapshot:item.price,quantity,lineTotal:Math.round(item.price*quantity*100)/100});}
    const reserved=await PickupSlot.updateOne({_id:slot._id,$expr:{$lt:['$currentOrdersCount','$maxOrders']}},{$inc:{currentOrdersCount:1}},{session});if(!reserved.modifiedCount)fail('Pickup slot full.');
    const [order]=await Order.create([{studentId,vendorId:body.vendorId,pickupSlotId:slot._id,pickupTime:`${slot.slotStart} – ${slot.slotEnd}`,items,totalAmount:Math.round(items.reduce((s,i)=>s+i.lineTotal,0)*100)/100,specialInstructions:body.specialInstructions,reservationState:'held',stockDate:date,reservationExpiresAt:new Date(now.getTime()+(Number.isInteger(Number(process.env.RESERVATION_MINUTES)) && Number(process.env.RESERVATION_MINUTES)>0 ? Number(process.env.RESERVATION_MINUTES) : 10)*60000)}],{session});return order;
  });
}
async function settlePayment(id,reference,successful=true) {
 return transaction(async session=>{const order=await Order.findById(id).session(session);if(!order)return {order:null,changed:false};if(order.paymentStatus==='PAID')return {order,changed:false};
 if(!successful){await release(order,session);return {order,changed:false};}
 if(order.reservationState!=='held' || order.reservationExpiresAt<=new Date()) {await release(order,session);order.paymentReviewRequired=true;order.payhereReference=reference;await order.save({session});return {order,changed:false};}
 order.reservationState='committed';order.paymentStatus='PAID';order.status='Confirmed';order.paidAt=new Date();order.payhereReference=reference;order.pickupCode=crypto.randomBytes(24).toString('hex');await order.save({session});
 // A failed durable alert aborts payment settlement, so callback retry can safely redo both.
 await Notification.create([{userId:order.vendorId,type:NOTIFICATION_TYPES.ORDER_NEW,message:`New order received for ${order.pickupTime} — LKR ${order.totalAmount}`,meta:{orderId:order._id}}],{session});
 return {order,changed:true};});
}
module.exports={transaction,createIntent,settlePayment,expireReservations};
