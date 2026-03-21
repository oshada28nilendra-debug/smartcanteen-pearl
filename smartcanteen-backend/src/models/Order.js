const mongoose = require('mongoose');

const ORDER_STATUS = Object.freeze({
  CONFIRMED:        'Confirmed',
  PREPARING:        'Preparing',
  READY_FOR_PICKUP: 'Ready for Pickup',
  COMPLETED:        'Completed',
  CANCELLED:        'Cancelled',
});

const PAYMENT_STATUS = Object.freeze({
  INITIATED: 'INITIATED',
  PAID:      'PAID',
  FAILED:    'FAILED',
  CANCELLED: 'CANCELLED',
});

// Sub-schema — price + name SNAPSHOTS (receipt integrity)
const orderItemSchema = new mongoose.Schema({
  menuItemId:    { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  nameSnapshot:  { type: String, required: true },   // frozen at order time
  priceSnapshot: { type: Number, required: true },   // frozen at order time
  quantity:      { type: Number, required: true, min: 1, max: 20 },
  lineTotal:     { type: Number, required: true },
}, { _id: false });

const orderSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vendorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pickupSlotId: { type: mongoose.Schema.Types.ObjectId, ref: 'PickupSlot' },
    pickupTime:   { type: String, required: [true, 'Pickup time is required'] },

    items: {
      type: [orderItemSchema],
      validate: { validator: (v) => v && v.length > 0, message: 'Order must have at least one item' },
    },

    // Server-calculated — Rule 1
    totalAmount: { type: Number, required: true, min: [0.01, 'Total must be > 0'] },

    status:        { type: String, enum: Object.values(ORDER_STATUS),  default: ORDER_STATUS.CONFIRMED, index: true },
    paymentStatus: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.INITIATED, index: true },

    // PayHere reference only — no card data stored (Rule 4)
    payhereOrderId:   { type: String, sparse: true },
    payhereReference: { type: String, sparse: true },

    // Status change audit log
    statusHistory: [{
      status:    String,
      changedAt: { type: Date, default: Date.now },
      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      note:      String,
      _id: false,
    }],

    specialInstructions: { type: String, maxlength: 200, default: null },
    paidAt:      Date,
    completedAt: Date,
    cancelledAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) { delete ret.__v; return ret; },
    },
  }
);

orderSchema.index({ vendorId: 1, paymentStatus: 1, status: 1 });
orderSchema.index({ studentId: 1, createdAt: -1 });
orderSchema.index({ pickupTime: 1, vendorId: 1 });

orderSchema.methods.markAsPaid = async function (payhereRef) {
  this.paymentStatus    = PAYMENT_STATUS.PAID;
  this.status           = ORDER_STATUS.CONFIRMED;
  this.payhereReference = payhereRef;
  this.paidAt           = new Date();
  this.statusHistory.push({ status: ORDER_STATUS.CONFIRMED, note: 'Payment verified' });
  return this.save();
};

// Enforce status transition rules
orderSchema.methods.advanceStatus = async function (newStatus, changedBy) {
  const transitions = {
    [ORDER_STATUS.CONFIRMED]:        [ORDER_STATUS.PREPARING,  ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PREPARING]:        [ORDER_STATUS.READY_FOR_PICKUP],
    [ORDER_STATUS.READY_FOR_PICKUP]: [ORDER_STATUS.COMPLETED],
    [ORDER_STATUS.COMPLETED]:        [],
    [ORDER_STATUS.CANCELLED]:        [],
  };

  const allowed = transitions[this.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Invalid status transition: ${this.status} → ${newStatus}`);
  }

  this.status = newStatus;
  this.statusHistory.push({ status: newStatus, changedAt: new Date(), changedBy });
  if (newStatus === ORDER_STATUS.COMPLETED) this.completedAt = new Date();
  if (newStatus === ORDER_STATUS.CANCELLED)  this.cancelledAt = new Date();
  return this.save();
};

// Rule 3: only PAID orders shown to vendor
orderSchema.statics.findPaidOrdersForVendor = function (vendorId) {
  return this.find({ vendorId, paymentStatus: PAYMENT_STATUS.PAID })
    .populate('studentId', 'name email studentId')
    .sort({ pickupTime: 1, createdAt: 1 });
};

orderSchema.statics.findStudentHistory = function (studentId) {
  return this.find({ studentId, paymentStatus: PAYMENT_STATUS.PAID })
    .populate('vendorId', 'name vendorProfile.businessName')
    .sort({ createdAt: -1 });
};

module.exports = {
  Order: mongoose.model('Order', orderSchema),
  ORDER_STATUS,
  PAYMENT_STATUS,
};