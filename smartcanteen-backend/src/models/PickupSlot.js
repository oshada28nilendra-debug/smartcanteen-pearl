const mongoose = require('mongoose');

const MAX_ORDERS_PER_SLOT = 10; // Rule 2 — mandatory per spec

const pickupSlotSchema = new mongoose.Schema(
  {
    vendorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date:      { type: Date,   required: true },
    slotStart: { type: String, required: true, match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM format required'] },
    slotEnd:   { type: String, required: true, match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'HH:MM format required'] },
    maxOrders:          { type: Number, default: MAX_ORDERS_PER_SLOT, min: 1, max: 50 },
    currentOrdersCount: { type: Number, default: 0, min: 0 },
    isActive:           { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) { delete ret.__v; return ret; },
    },
  }
);

pickupSlotSchema.virtual('isFull').get(function () {
  return this.currentOrdersCount >= this.maxOrders;
});

pickupSlotSchema.virtual('spotsRemaining').get(function () {
  return Math.max(0, this.maxOrders - this.currentOrdersCount);
});

pickupSlotSchema.index({ vendorId: 1, date: 1, slotStart: 1 }, { unique: true });

pickupSlotSchema.methods.hasCapacity = function () {
  return this.isActive && this.currentOrdersCount < this.maxOrders;
};

// Atomic reservation — prevents race condition when two students pick same slot
pickupSlotSchema.methods.reserveSpot = async function () {
  return PickupSlot.findOneAndUpdate(
    { _id: this._id, isActive: true, $expr: { $lt: ['$currentOrdersCount', '$maxOrders'] } },
    { $inc: { currentOrdersCount: 1 } },
    { new: true }
  );
};

pickupSlotSchema.methods.releaseSpot = async function () {
  return PickupSlot.findByIdAndUpdate(this._id, { $inc: { currentOrdersCount: -1 } });
};

pickupSlotSchema.statics.getAvailableSlots = function (vendorId, date) {
  const start = new Date(date); start.setHours(0, 0, 0, 0);
  const end   = new Date(start); end.setDate(end.getDate() + 1);
  return this.find({
    vendorId, isActive: true,
    date: { $gte: start, $lt: end },
    $expr: { $lt: ['$currentOrdersCount', '$maxOrders'] },
  }).sort({ slotStart: 1 });
};

// Auto-generate slots for a vendor for a given date
pickupSlotSchema.statics.seedSlotsForVendor = async function (
  vendorId, date, openTime = '08:00', closeTime = '18:00', intervalMins = 15
) {
  const slots = [];
  const [oH, oM] = openTime.split(':').map(Number);
  const [cH, cM] = closeTime.split(':').map(Number);
  const slotDate = new Date(date); slotDate.setHours(0, 0, 0, 0);
  let cur = oH * 60 + oM;
  const endMin = cH * 60 + cM;

  while (cur + intervalMins <= endMin) {
    const pad = (n) => String(n).padStart(2, '0');
    slots.push({
      vendorId, date: slotDate,
      slotStart: `${pad(Math.floor(cur / 60))}:${pad(cur % 60)}`,
      slotEnd:   `${pad(Math.floor((cur + intervalMins) / 60))}:${pad((cur + intervalMins) % 60)}`,
      maxOrders: MAX_ORDERS_PER_SLOT,
    });
    cur += intervalMins;
  }

  return this.insertMany(slots, { ordered: false }).catch(() => slots);
};

const PickupSlot = mongoose.model('PickupSlot', pickupSlotSchema);
module.exports = { PickupSlot, MAX_ORDERS_PER_SLOT };