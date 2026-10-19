const {User}=require('../models/User');
const {MenuItem}=require('../models/MenuItem');
const {sendSuccess}=require('../utils/apiResponse');
// Explicit projection: never expose emails, bank details, tokens or moderation fields.
exports.vendors=async(req,res,next)=>{
 try {
  const shops=await User.find({role:'vendor',accountStatus:'active'})
   .select('_id name vendorProfile.businessName vendorProfile.description vendorProfile.bannerImage')
   .sort({createdAt:-1}).limit(30).lean();
  const items=await MenuItem.find({vendorId:{$in:shops.map(s=>s._id)},isAvailable:true})
   .select('vendorId category imageUrl').limit(300).lean();
  const vendors=shops.map(shop=>{
   const meals=items.filter(i=>String(i.vendorId)===String(shop._id));
   return {_id:shop._id,businessName:shop.vendorProfile?.businessName||shop.name,
    description:shop.vendorProfile?.description||'',image:shop.vendorProfile?.bannerImage||meals.find(i=>i.imageUrl)?.imageUrl||null,
    categories:[...new Set(meals.map(i=>i.category))]};
  });
  return sendSuccess(res,{data:{vendors}});
 }catch(error){next(error);}
};
