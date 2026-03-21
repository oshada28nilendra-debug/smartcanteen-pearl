const { MenuItem } = require('../models/MenuItem');
const { User } = require('../models/User');
const { sendSuccess, sendCreated, sendNotFound, sendForbidden } = require('../utils/apiResponse');
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
      User.findById(vendorId).select('name vendorProfile vendorStatus'),
    ]);

    return sendSuccess(res, {
      data: {
        items,
        count: items.length,
        vendor: vendor ? {
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
    const item = await MenuItem.create({ vendorId: req.user._id, name, description, price, imageUrl, category });
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

    const { name, description, price, imageUrl, category, isAvailable } = req.body;
    if (name        !== undefined) item.name        = name;
    if (description !== undefined) item.description = description;
    if (price       !== undefined) item.price       = price;
    if (imageUrl    !== undefined) item.imageUrl    = imageUrl;
    if (category    !== undefined) item.category    = category;
    if (isAvailable !== undefined) item.isAvailable = isAvailable;
    await item.save();

    logger.info(`Vendor ${req.user.email} updated item: ${item.name}`);
    return sendSuccess(res, { message: 'Menu item updated.', data: { item } });
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