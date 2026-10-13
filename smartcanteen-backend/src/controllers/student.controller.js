const mongoose=require('mongoose');
const {User}=require('../models/User');
const {MenuItem}=require('../models/MenuItem');
const {Order}=require('../models/Order');
const {sendSuccess,sendError,sendNotFound}=require('../utils/apiResponse');
const {vendorAvailability,itemAvailability}=require('../services/availability');
const publicFields='name vendorProfile.businessName vendorProfile.description vendorProfile.bannerImage vendorProfile.contactPhone vendorProfile.openingTime vendorProfile.closingTime vendorProfile.openDays vendorProfile.ordersPaused accountStatus vendorStatus';
const catalog=async(req,res,next)=>{try {
 const vendors=await User.find({role:'vendor',vendorStatus:'approved',accountStatus:'active'}).select(publicFields).lean();
 const all=await MenuItem.find({vendorId:{$in:vendors.map(v=>v._id)}}).lean();const q=String(req.query.q||'').trim().toLowerCase();
 const view=vendors.map(v=>({...v,...vendorAvailability(v)}));
 const items=all.map(i=>itemAvailability(i,vendors.find(v=>String(v._id)===String(i.vendorId)))).filter(i=>!q||`${i.name} ${i.description} ${vendors.find(v=>String(v._id)===String(i.vendorId)).vendorProfile.businessName}`.toLowerCase().includes(q));
 return sendSuccess(res,{data:{vendors:view.filter(v=>!q||`${v.name} ${v.vendorProfile.businessName} ${v.vendorProfile.description}`.toLowerCase().includes(q)||items.some(i=>String(i.vendorId)===String(v._id))),items}});
}catch(e){next(e);}};
const favourites=async(req,res,next)=>{try{const user=await User.findById(req.user._id).select('favourites vendorFavourites');if(req.method==='PUT') {
 for(const field of ['favourites','vendorFavourites']) if(req.body[field]!==undefined){const ids=req.body[field];if(!Array.isArray(ids)||ids.length>200||ids.some(id=>!mongoose.isValidObjectId(id)))return sendError(res,{statusCode:400,message:'Invalid favourites.'});user[field]=[...new Set(ids)];}await user.save();}
 return sendSuccess(res,{data:{favourites:user.favourites,vendorFavourites:user.vendorFavourites}});
}catch(e){next(e);}};
const reorder=async(req,res,next)=>{try{const order=await Order.findOne({_id:req.params.id,studentId:req.user._id});if(!order)return sendNotFound(res,'Order not found.');const vendor=await User.findById(order.vendorId);const items=[],unavailable=[];for(const previous of order.items){const raw=await MenuItem.findById(previous.menuItemId).lean();const item=raw&&vendor?itemAvailability(raw,vendor):null;if(!item?.effectiveAvailable||item.stockRemaining<previous.quantity)unavailable.push({menuItemId:previous.menuItemId,name:previous.nameSnapshot,reason:'Unavailable or insufficient stock'});else items.push({menuItemId:item._id,quantity:previous.quantity,item});}return sendSuccess(res,{data:{vendorId:order.vendorId,items,unavailable}});}catch(e){next(e);}};
const pickupCode=async(req,res,next)=>{try{const order=await Order.findOne({_id:req.params.id,studentId:req.user._id,paymentStatus:'PAID',status:{$nin:['Cancelled','Completed']}}).select('+pickupCode');if(!order?.pickupCode)return sendNotFound(res,'Pickup code unavailable.');return sendSuccess(res,{data:{code:order.pickupCode,orderId:order._id}});}catch(e){next(e);}};
const verifyPickup=async(req,res,next)=>{try{if(!/^[a-f0-9]{48}$/.test(req.body.code||''))return sendError(res,{statusCode:400,message:'Invalid pickup code.'});const order=await Order.findOneAndUpdate({pickupCode:req.body.code,vendorId:req.user._id,paymentStatus:'PAID',status:'Ready for Pickup',pickupUsedAt:{$exists:false}},{$set:{status:'Completed',completedAt:new Date(),pickupUsedAt:new Date()},$push:{statusHistory:{status:'Completed',changedAt:new Date(),changedBy:req.user._id,note:'Pickup code verified'}}},{new:true});if(!order)return sendError(res,{statusCode:409,message:'Code invalid, used, or order is not ready for your shop.'});req.app.get('io')?.to(`user:${order.studentId}`).emit('order:statusChanged',{orderId:order._id,status:'Completed'});return sendSuccess(res,{data:{order}});}catch(e){next(e);}};
module.exports={catalog,favourites,reorder,pickupCode,verifyPickup};
