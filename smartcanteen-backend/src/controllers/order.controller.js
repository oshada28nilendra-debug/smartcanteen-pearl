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

    // 1. Validate and price cart items from DB
    const cartResult = await MenuItem.validateCartItems(
      items.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity }))
    );
    if (!cartResult.valid) return sendError(res, { statusCode: 400, message: cartResult.error });

    // 2. Find and check pickup slot capacity
    const slot = await PickupSlot.findById(pickupSlotId);
    if (!slot) return sendNotFound(res, 'Pickup slot not found.');
    if (!slot.hasCapacity()) {
      return sendError(res, { statusCode: 409, message: 'This pickup slot is full. Please choose another time.' });
    }

    // 3. Create order
    const order = await Order.create({
      studentId:           req.user._id,
      vendorId,
      pickupSlotId:        slot._id,
      pickupTime:          `${slot.slotStart} – ${slot.slotEnd}`,
      items:               cartResult.items,
      totalAmount:         cartResult.total,
      paymentStatus:       PAYMENT_STATUS.INITIATED,
      status:              ORDER_STATUS.CONFIRMED,
      specialInstructions: specialInstructions || null,
      statusHistory:       [{ status: ORDER_STATUS.CONFIRMED, note: 'Order created, awaiting payment' }],
    });

    logger.info(`Order intent created: ${order._id} by student ${req.user.email}`);
    return sendCreated(res, {
      message: 'Order created. Proceed to payment.',
      data: {
        orderId:     order._id,
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
    const order = await Order.findById(req.params.id).populate('vendorId', '_id name vendorProfile');
    if (!order) return sendNotFound(res, 'Order not found.');

    if (order.studentId.toString() !== req.user._id.toString())
      return sendForbidden(res, 'Access denied.');

    if (order.paymentStatus === PAYMENT_STATUS.PAID)
      return sendSuccess(res, { message: 'Order already paid.', data: { orderId: order._id } });

    // Mark as paid
    await order.markAsPaid('CARD-' + Date.now());

    // Reserve the slot
    const slot = await PickupSlot.findById(order.pickupSlotId);
    if (slot) await slot.reserveSpot();

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

    // Save notification to DB for vendor
    await Notification.create({
      userId:  order.vendorId._id,
      type:    NOTIFICATION_TYPES.ORDER_NEW,
      message: `New order received for ${order.pickupTime} — LKR ${order.totalAmount}`,
      meta:    { orderId: order._id },
    });

    logger.info(`Card payment confirmed for order ${order._id}`);
    return sendSuccess(res, { message: 'Payment confirmed.', data: { orderId: order._id } });
  } catch (error) { next(error); }
};

/* ── GET /api/orders/slots/:vendorId  (student) ── */
const getAvailableSlots = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return sendError(res, { statusCode: 400, message: 'date query param is required (YYYY-MM-DD).' });

    let slots = await PickupSlot.getAvailableSlots(req.params.vendorId, date);
    if (slots.length === 0) {
      await PickupSlot.seedSlotsForVendor(req.params.vendorId, date);
      slots = await PickupSlot.getAvailableSlots(req.params.vendorId, date);
    }

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
      paymentStatus: { $in: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.INITIATED] },
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
    if (![PAYMENT_STATUS.PAID, PAYMENT_STATUS.INITIATED].includes(order.paymentStatus))
      return sendError(res, { statusCode: 400, message: 'Cannot update status of a failed or cancelled order.' });

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