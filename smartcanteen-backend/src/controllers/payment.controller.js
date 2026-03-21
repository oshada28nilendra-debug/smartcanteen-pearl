const crypto = require('crypto');
const { Order, PAYMENT_STATUS } = require('../models/Order');
const { PickupSlot }  = require('../models/PickupSlot');
const { Notification, NOTIFICATION_TYPES } = require('../models/Notification');
const { sendSuccess, sendError, sendNotFound } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/* ── Helper: generate PayHere hash ── */
const generatePayhereHash = (merchantId, orderId, amount, currency) => {
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
  const secretHash     = crypto.createHash('md5').update(merchantSecret).digest('hex').toUpperCase();
  const hashString     = `${merchantId}${orderId}${parseFloat(amount).toFixed(2)}${currency}${secretHash}`;
  return crypto.createHash('md5').update(hashString).digest('hex').toUpperCase();
};

/* ── POST /api/payment/initiate  (student) ──
   Returns all params needed for PayHere redirect
── */
const initiatePayment = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId).populate('vendorId', 'name vendorProfile');
    if (!order) return sendNotFound(res, 'Order not found.');
    if (order.studentId.toString() !== req.user._id.toString())
      return sendError(res, { statusCode: 403, message: 'Access denied.' });
    if (order.paymentStatus === PAYMENT_STATUS.PAID)
      return sendError(res, { statusCode: 400, message: 'Order is already paid.' });

    const merchantId = process.env.PAYHERE_MERCHANT_ID;
    const currency   = 'LKR';
    const hash       = generatePayhereHash(merchantId, order._id.toString(), order.totalAmount, currency);

    // Store payhere order ID for verification
    order.payhereOrderId = order._id.toString();
    await order.save({ validateBeforeSave: false });

    return sendSuccess(res, {
      message: 'Payment initiated.',
      data: {
        payhereParams: {
          sandbox:      true,
          merchant_id:  merchantId,
          return_url:   `${process.env.CLIENT_URL}/payment/success`,
          cancel_url:   `${process.env.CLIENT_URL}/payment/cancel`,
          notify_url:   process.env.PAYHERE_NOTIFY_URL,
          order_id:     order._id.toString(),
          items:        order.items.map((i) => i.nameSnapshot).join(', '),
          amount:       order.totalAmount.toFixed(2),
          currency,
          hash,
          first_name:   req.user.name.split(' ')[0] || req.user.name,
          last_name:    req.user.name.split(' ').slice(1).join(' ') || '',
          email:        req.user.email,
          phone:        '0771234567',
          address:      'University Campus',
          city:         'Colombo',
          country:      'Sri Lanka',
        },
        payhereUrl: process.env.PAYHERE_BASE_URL,
      },
    });
  } catch (error) { next(error); }
};

/* ── POST /api/payment/notify  (called by PayHere server) ──
   Rule 3: only verified PAID payments create real orders
   Rule 4: no card data stored — only reference + status
── */
const payhereNotify = async (req, res, next) => {
  try {
    const {
      merchant_id, order_id, payhere_amount, payhere_currency,
      status_code, md5sig, payment_id,
    } = req.body;

    // Verify the signature from PayHere
    const expectedHash = generatePayhereHash(merchant_id, order_id, payhere_amount, payhere_currency);
    const localSig     = crypto.createHash('md5')
      .update(`${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${expectedHash}`)
      .digest('hex').toUpperCase();

    if (localSig !== md5sig) {
      logger.warn(`PayHere signature mismatch for order ${order_id}`);
      return res.status(400).send('Invalid signature');
    }

    const order = await Order.findById(order_id).populate('vendorId', '_id');
    if (!order) { logger.warn(`PayHere notify: order ${order_id} not found`); return res.status(200).send('OK'); }

    // status_code 2 = success in PayHere
    if (status_code === '2') {
      await order.markAsPaid(payment_id);

      // Reserve the slot atomically (Rule 2 final enforcement)
      const slot = await PickupSlot.findById(order.pickupSlotId);
      if (slot) {
        const reserved = await slot.reserveSpot();
        if (!reserved) logger.warn(`Slot full after payment for order ${order._id}`);
      }

      // Notify vendor via Socket.io
      const io = req.app?.get('io');
      if (io) {
        io.to(`vendor:${order.vendorId._id}`).emit('order:new', {
          orderId: order._id, pickupTime: order.pickupTime,
          totalAmount: order.totalAmount, items: order.items,
        });
      }

      // Notify vendor in DB
      await Notification.create({
        userId:  order.vendorId._id,
        type:    NOTIFICATION_TYPES.ORDER_NEW,
        message: `New order received for ${order.pickupTime}`,
        meta:    { orderId: order._id },
      });

      logger.info(`Payment PAID for order ${order._id}`);
    } else if (status_code === '0') {
      order.paymentStatus = PAYMENT_STATUS.FAILED;
      await order.save({ validateBeforeSave: false });
      logger.info(`Payment FAILED for order ${order._id}`);
    } else if (status_code === '-1') {
      order.paymentStatus = PAYMENT_STATUS.CANCELLED;
      await order.save({ validateBeforeSave: false });
    }

    return res.status(200).send('OK');
  } catch (error) {
    logger.error(`PayHere notify error: ${error.message}`);
    return res.status(200).send('OK'); // always return 200 to PayHere
  }
};

/* ── GET /api/payment/status/:orderId  (student) ── */
const getPaymentStatus = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId).select('paymentStatus status totalAmount pickupTime');
    if (!order) return sendNotFound(res, 'Order not found.');
    if (order.studentId && order.studentId.toString() !== req.user._id.toString())
      return sendError(res, { statusCode: 403, message: 'Access denied.' });
    return sendSuccess(res, { data: { paymentStatus: order.paymentStatus, status: order.status } });
  } catch (error) { next(error); }
};

module.exports = { initiatePayment, payhereNotify, getPaymentStatus };