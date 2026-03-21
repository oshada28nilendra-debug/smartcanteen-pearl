const mongoose = require('mongoose');

const NOTIFICATION_TYPES = Object.freeze({
  ORDER_NEW:            'order:new',
  ORDER_STATUS_CHANGED: 'order:statusChanged',
  VENDOR_APPROVED:      'vendor:approved',
  VENDOR_REJECTED:      'vendor:rejected',
  GENERAL:              'general',
});

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId, ref: 'User',
      required: true, index: true,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      default: NOTIFICATION_TYPES.GENERAL,
    },
    message: { type: String, required: [true, 'Message is required'], maxlength: 500 },
    isRead:  { type: Boolean, default: false, index: true },

    // Flexible metadata — orderId, status, etc.
    meta: {
      orderId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
      vendorId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      status:    String,
      extra:     mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) { delete ret.__v; return ret; },
    },
  }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

// Factory: create and return a notification document
notificationSchema.statics.create_and_save = async function ({ userId, type, message, meta = {} }) {
  return this.create({ userId, type, message, meta });
};

// Get unread count for a user
notificationSchema.statics.unreadCount = function (userId) {
  return this.countDocuments({ userId, isRead: false });
};

module.exports = {
  Notification: mongoose.model('Notification', notificationSchema),
  NOTIFICATION_TYPES,
};