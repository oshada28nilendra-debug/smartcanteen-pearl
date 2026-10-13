const { Order, ORDER_STATUS, PAYMENT_STATUS } = require('../models/Order');
const { MenuItem }   = require('../models/MenuItem');
const { PickupSlot } = require('../models/PickupSlot');
const { Notification, NOTIFICATION_TYPES } = require('../models/Notification');
const { sendSuccess, sendCreated, sendError, sendNotFound, sendForbidden } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/* ── POST /api/orders/intent  (student) ── */
const createOrderIntent = async (req, res, next) => {
  try {
    const { vendorId, items, pickupSlotId, specialInstructions } = req.body;

    const order = await require('../services/reservations').createIntent(req.user._id, req.body);
    logger.info(`Order intent created: ${order._id} by student ${req.user.email}`);
    return sendCreated(res, {
      message: 'Order created. Proceed to payment.',
      data: {
        orderId:     order._id,
        expiresAt: order.reservationExpiresAt,
        totalAmount: order.totalAmount,
        pickupTime:  order.pickupTime,
        items:       order.items,
      },
    });
  } catch (error) { next(error); }
};

/* ── POST /api/orders/:id/confirm-payment  (student, for card/demo payment) ──
   FIX: marks order as PAID without going through PayHere,
   used when student pays by card in the frontend.
── */
const confirmPayment = async (req, res, next) => {
  try {
    if (process.env.ENABLE_DEMO_PAYMENTS !== 'true' || process.env.NODE_ENV === 'production') return sendForbidden(res, 'Demo payments are disabled.');
    const order = await Order.findById(req.params.id).populate('vendorId', '_id name vendorProfile');
    if (!order) return sendNotFound(res, 'Order not found.');

    if (order.studentId.toString() !== req.user._id.toString())
      return sendForbidden(res, 'Access denied.');

    if (order.paymentStatus === PAYMENT_STATUS.PAID)
      return sendSuccess(res, { message: 'Order already paid.', data: { orderId: order._id } });

    if (process.env.ENABLE_DEMO_PAYMENTS !== 'true' || process.env.NODE_ENV === 'production') return sendForbidden(res, 'Demo payments are disabled.');
    const settlement = await require('../services/reservations').settlePayment(order._id, 'DEMO-' + order._id);
    if (!settlement.changed) return sendError(res, {statusCode:409,message:'Reservation expired. Start a new order.'});
    // Notify vendor via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`vendor:${order.vendorId._id}`).emit('order:new', {
        orderId:     order._id,
        pickupTime:  order.pickupTime,
        totalAmount: order.totalAmount,
        items:       order.items,
      });
    }

    logger.info(`Card payment confirmed for order ${order._id}`);
    return sendSuccess(res, { message: 'Payment confirmed.', data: { orderId: order._id } });
  } catch (error) { next(error); }
};

/* ── GET /api/orders/slots/:vendorId  (student) ── */
const getAvailableSlots = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return sendError(res, { statusCode: 400, message: 'date query param is required (YYYY-MM-DD).' });

    const {User}=require('../models/User');
    const {localDate}=require('../services/availability');
    const vendor=await User.findOne({_id:req.params.vendorId,role:'vendor',vendorStatus:'approved',accountStatus:'active'});
    if(!vendor || date!==localDate())return sendSuccess(res,{data:{slots:[]}});
    await require('../services/reservations').expireReservations();
    if(!require('../services/availability').vendorAvailability(vendor).isOpen)return sendSuccess(res,{data:{slots:[]}});
    await PickupSlot.seedSlotsForVendor(req.params.vendorId,date,vendor.vendorProfile.openingTime,vendor.vendorProfile.closingTime);
    let slots = (await PickupSlot.getAvailableSlots(req.params.vendorId,date)).filter(s=>new Date(`${date}T${s.slotStart}:00+05:30`)>new Date() && s.slotStart>=vendor.vendorProfile.openingTime && s.slotEnd<=vendor.vendorProfile.closingTime);

    return sendSuccess(res, { data: { slots } });
  } catch (error) { next(error); }
};

/* ── GET /api/orders/my  (student) ── */
const getMyOrders = async (req, res, next) => {
  try {
    // FIX: show ALL orders (not just PAID) so student sees pending payments too
    const orders = await Order.find({ studentId: req.user._id })
      .populate('vendorId', 'name vendorProfile')
      .sort({ createdAt: -1 });
    return sendSuccess(res, { data: { orders } });
  } catch (error) { next(error); }
};

/* ── GET /api/orders/:id  (student or vendor) ── */
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('studentId', 'name email studentId')
      .populate('vendorId',  'name vendorProfile');
    if (!order) return sendNotFound(res, 'Order not found.');

    const userId    = req.user._id.toString();
    const isStudent = order.studentId._id.toString() === userId;
    const isVendor  = order.vendorId._id.toString()  === userId;
    const isAdmin   = req.user.role === 'admin';
    if (!isStudent && !isVendor && !isAdmin)
      return sendForbidden(res, 'You do not have access to this order.');

    if (isVendor && order.paymentStatus !== PAYMENT_STATUS.PAID) return sendForbidden(res, 'Only paid orders can be fulfilled.');
    return sendSuccess(res, { data: { order } });
  } catch (error) { next(error); }
};

/* ── GET /api/orders/vendor/all  (vendor) ──
   FIX: show PAID + INITIATED orders so vendor sees everything,
   not just PayHere-verified payments (which won't work on localhost)
── */
const getVendorOrders = async (req, res, next) => {
  try {
    const { status } = req.query;

    // Show PAID orders AND INITIATED orders (card payments before confirmation)
    let query = {
      vendorId: req.user._id,
      paymentStatus: PAYMENT_STATUS.PAID,
    };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .populate('studentId', 'name email studentId')
      .sort({ createdAt: -1 });

    return sendSuccess(res, { data: { orders, count: orders.length } });
  } catch (error) { next(error); }
};

/* ── PATCH /api/orders/:id/status  (vendor) ── */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id).populate('studentId', 'name email');
    if (!order) return sendNotFound(res, 'Order not found.');
    if (order.vendorId.toString() !== req.user._id.toString())
      return sendForbidden(res, 'You can only update your own orders.');

    // FIX: allow status update for both PAID and INITIATED orders
    if (order.paymentStatus !== PAYMENT_STATUS.PAID)
      return sendError(res, { statusCode: 400, message: 'Cannot update status of a failed or cancelled order.' });

    if (status === ORDER_STATUS.COMPLETED) return sendError(res, {statusCode:400,message:'Use pickup verification to complete an order.'});
    await order.advanceStatus(status, req.user._id);

    const messages = {
      [ORDER_STATUS.PREPARING]:        'Your order is being prepared! 🍳',
      [ORDER_STATUS.READY_FOR_PICKUP]: 'Your order is ready for pickup! 🎉',
      [ORDER_STATUS.COMPLETED]:        'Your order has been completed. Thanks!',
      [ORDER_STATUS.CANCELLED]:        'Your order has been cancelled.',
    };

    await Notification.create({
      userId:  order.studentId._id,
      type:    NOTIFICATION_TYPES.ORDER_STATUS_CHANGED,
      message: messages[status] || `Order status updated to ${status}`,
      meta:    { orderId: order._id, vendorId: req.user._id, status },
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${order.studentId._id}`).emit('order:statusChanged', {
        orderId: order._id, status, message: messages[status],
      });
    }

    logger.info(`Vendor ${req.user.email} updated order ${order._id} → ${status}`);
    return sendSuccess(res, { message: `Order updated to ${status}.`, data: { orderId: order._id, status: order.status } });
  } catch (error) {
    if (error.message.includes('Invalid status transition'))
      return sendError(res, { statusCode: 400, message: error.message });
    next(error);
  }
};

module.exports = {
  createOrderIntent, confirmPayment, getAvailableSlots,
  getMyOrders, getOrderById, getVendorOrders, updateOrderStatus,
};