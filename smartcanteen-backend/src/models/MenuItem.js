const mongoose = require('mongoose');

const CATEGORIES = ['Rice','Noodles','Snacks','Beverages','Desserts','Burgers','Sandwiches','Salads','Soups','Specials','Other'];

const menuItemSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId, ref: 'User',
      required: [true, 'Vendor ID is required'], index: true,
    },
    name: {
      type: String, required: [true, 'Name is required'],
      trim: true, minlength: [2, 'Min 2 chars'], maxlength: [100, 'Max 100 chars'],
    },
    description: {
      type: String, required: [true, 'Description is required'],
      trim: true, minlength: [5, 'Min 5 chars'], maxlength: [500, 'Max 500 chars'],
    },
    price: {
      type: Number, required: [true, 'Price is required'],
      min: [0.01, 'Price must be > 0'],
      set: (v) => Math.round(v * 100) / 100,
    },
    imageUrl: {
      type: String, trim: true, default: null,
      validate: {
        // FIX: Accept https?:// URLs OR base64 data URIs from file uploads
        validator: (v) => !v || /^https?:\/\/.+/.test(v) || /^data:image\/.+;base64,/.test(v),
        message: 'imageUrl must be a valid URL or base64 image',
      },
    },
    category: {
      type: String, required: [true, 'Category is required'],
      enum: { values: CATEGORIES, message: 'Invalid category: {VALUE}' },
    },
    isAvailable: { type: Boolean, default: true, index: true },
    isDeleted:   { type: Boolean, default: false, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) { delete ret.__v; delete ret.isDeleted; return ret; },
    },
  }
);

menuItemSchema.index({ vendorId: 1, isAvailable: 1 });
menuItemSchema.index({ vendorId: 1, category: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });

// Exclude soft-deleted items from all queries
menuItemSchema.pre(/^find/, function (next) {
  if (!this.getOptions().includeDeleted) this.where({ isDeleted: { $ne: true } });
  next();
});

menuItemSchema.statics.findByVendor = function (vendorId, onlyAvailable = false) {
  const filter = { vendorId };
  if (onlyAvailable) filter.isAvailable = true;
  return this.find(filter).sort({ category: 1, name: 1 });
};

menuItemSchema.statics.validateCartItems = async function (cartItems) {
  const ids     = cartItems.map((i) => i.menuItemId);
  const dbItems = await this.find({ _id: { $in: ids }, isAvailable: true });

  if (dbItems.length !== cartItems.length) {
    const foundIds    = new Set(dbItems.map((i) => i._id.toString()));
    const missingItem = cartItems.find((i) => !foundIds.has(i.menuItemId.toString()));
    return { valid: false, error: `Item "${missingItem?.menuItemId}" is unavailable or does not exist.` };
  }

  const enriched = cartItems.map((cartItem) => {
    const dbItem = dbItems.find((d) => d._id.toString() === cartItem.menuItemId.toString());
    return {
      menuItemId:    dbItem._id,
      nameSnapshot:  dbItem.name,
      priceSnapshot: dbItem.price,
      quantity:      cartItem.quantity,
      lineTotal:     Math.round(dbItem.price * cartItem.quantity * 100) / 100,
    };
  });

  const total = Math.round(enriched.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100;
  return { valid: true, items: enriched, total };
};

module.exports = { MenuItem: mongoose.model('MenuItem', menuItemSchema), CATEGORIES };