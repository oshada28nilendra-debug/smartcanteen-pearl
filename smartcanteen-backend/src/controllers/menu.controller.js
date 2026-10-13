const { MenuItem } = require('../models/MenuItem');
const { User } = require('../models/User');
const { sendSuccess, sendCreated, sendNotFound, sendForbidden } = require('../utils/apiResponse');
const {localDate,vendorAvailability,itemAvailability}=require('../services/availability');
const logger = require('../utils/logger');

/* ── GET /api/menu/:vendorId  (public) ──
   FIX: also return vendor info so student menu page
   can show the real business name + banner
── */
const getMenuByVendor = async (req, res, next) => {
  try {
    const { vendorId } = req.params;
    const { category, available } = req.query;
    const filter = { vendorId };
    if (category)           filter.category    = category;
    if (available === 'true') filter.isAvailable = true;

    const [items, vendor] = await Promise.all([
      MenuItem.find(filter).sort({ category: 1, name: 1 }),
      User.findById(vendorId).select('name vendorProfile.businessName vendorProfile.description vendorProfile.contactPhone vendorProfile.bannerImage vendorProfile.openingTime vendorProfile.closingTime vendorProfile.openDays vendorProfile.ordersPaused vendorStatus accountStatus'),
    ]);

    return sendSuccess(res, {
      data: {
        items: items.map(i=>itemAvailability(i.toObject(),vendor)),
        count: items.length,
        vendor: vendor ? {
          ...vendorAvailability(vendor),
          vendorProfile: vendor.vendorProfile,
          _id:         vendor._id,
          name:        vendor.name,
          businessName: vendor.vendorProfile?.businessName || vendor.name,
          description: vendor.vendorProfile?.description   || '',
          contactPhone: vendor.vendorProfile?.contactPhone || '',
          bannerImage: vendor.vendorProfile?.bannerImage   || null,
        } : null,
      },
    });
  } catch (error) { next(error); }
};

/* ── GET /api/menu/:vendorId/:itemId  (public) ── */
const getMenuItemById = async (req, res, next) => {
  try {
    const item = await MenuItem.findOne({ _id: req.params.itemId, vendorId: req.params.vendorId });
    if (!item) return sendNotFound(res, 'Menu item not found.');
    return sendSuccess(res, { data: { item } });
  } catch (error) { next(error); }
};

/* ── POST /api/menu  (vendor only) ── */
const createMenuItem = async (req, res, next) => {
  try {
    const { name, description, price, imageUrl, category } = req.body;
    const item = await MenuItem.create({ vendorId: req.user._id, name, description, price, imageUrl, category, dailyStock:req.body.dailyStock || 0,stockDate:localDate(),stockRemaining:req.body.dailyStock || 0 });
    logger.info(`Vendor ${req.user.email} created menu item: ${item.name}`);
    return sendCreated(res, { message: 'Menu item created.', data: { item } });
  } catch (error) { next(error); }
};

/* ── PUT /api/menu/:itemId  (vendor only) ── */
const updateMenuItem = async (req, res, next) => {
  try {
    const item = await MenuItem.findOne({ _id: req.params.itemId });
    if (!item) return sendNotFound(res, 'Menu item not found.');
    if (item.vendorId.toString() !== req.user._id.toString())
      return sendForbidden(res, 'You can only edit your own menu items.');

    const changes={};
    for(const field of ['name','description','price','imageUrl','category','isAvailable']) if(req.body[field]!==undefined)changes[field]=req.body[field];
    // Apply document setters/casting and field validation before using an aggregation update.
    item.set(changes);
    await item.validate(Object.keys(changes));
    for(const field of Object.keys(changes))changes[field]=item.get(field);
    let updated;
    if(req.body.dailyStock!==undefined) {
      const total=Number(req.body.dailyStock);
      if(!Number.isInteger(total)||total<0) return res.status(400).json({success:false,message:'dailyStock must be a nonnegative integer.'});
      const date=localDate();
      // Atomic pipeline preserves today's consumed and held units, including concurrent reservations.
      updated=await MenuItem.findOneAndUpdate({_id:item._id},[{$set:{...Object.fromEntries(Object.entries(changes).map(([key,value])=>[key,{$literal:value}])),dailyStock:total,stockRemaining:{$max:[0,{$subtract:[total,{$cond:[{$eq:['$stockDate',date]},{$ifNull:['$stockAllocated',{$subtract:['$dailyStock','$stockRemaining']}]},0]}]}]},stockAllocated:{$cond:[{$eq:['$stockDate',date]},{$ifNull:['$stockAllocated',{$subtract:['$dailyStock','$stockRemaining']}]},0]},stockDate:date}}],{new:true});
    } else updated=await MenuItem.findOneAndUpdate({_id:item._id},{$set:changes},{new:true,runValidators:true});

    logger.info(`Vendor ${req.user.email} updated item: ${item.name}`);
    return sendSuccess(res, { message: 'Menu item updated.', data: { item:updated } });
  } catch (error) { next(error); }
};

/* ── PATCH /api/menu/:itemId/availability  (vendor only) ── */
const toggleAvailability = async (req, res, next) => {
  try {
    const item = await MenuItem.findOne({ _id: req.params.itemId });
    if (!item) return sendNotFound(res, 'Menu item not found.');
    if (item.vendorId.toString() !== req.user._id.toString())
      return sendForbidden(res, 'You can only edit your own menu items.');

    item.isAvailable = !item.isAvailable;
    await item.save();
    return sendSuccess(res, {
      message: `Item marked as ${item.isAvailable ? 'Available' : 'Unavailable'}.`,
      data: { itemId: item._id, isAvailable: item.isAvailable },
    });
  } catch (error) { next(error); }
};

/* ── DELETE /api/menu/:itemId  (vendor only) ── */
const deleteMenuItem = async (req, res, next) => {
  try {
    const item = await MenuItem.findOne({ _id: req.params.itemId });
    if (!item) return sendNotFound(res, 'Menu item not found.');
    if (item.vendorId.toString() !== req.user._id.toString())
      return sendForbidden(res, 'You can only delete your own menu items.');

    item.isDeleted   = true;
    item.isAvailable = false;
    await item.save();

    logger.info(`Vendor ${req.user.email} deleted item: ${item.name}`);
    return sendSuccess(res, { message: 'Menu item deleted.' });
  } catch (error) { next(error); }
};

module.exports = {
  getMenuByVendor, getMenuItemById, createMenuItem,
  updateMenuItem, toggleAvailability, deleteMenuItem,
};