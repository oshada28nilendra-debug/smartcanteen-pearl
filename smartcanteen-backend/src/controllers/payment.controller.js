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

    if (order.reservationState !== 'held' || order.reservationExpiresAt <= new Date()) return sendError(res,{statusCode:409,message:'Reservation expired.'});
    if (!process.env.PAYHERE_MERCHANT_ID || !process.env.PAYHERE_MERCHANT_SECRET || !process.env.PAYHERE_NOTIFY_URL) return sendError(res,{statusCode:503,message:'PayHere is not configured.'});
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
          sandbox:      process.env.PAYHERE_SANDBOX === 'true',
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
    if (!process.env.PAYHERE_MERCHANT_SECRET || merchant_id !== process.env.PAYHERE_MERCHANT_ID || payhere_currency !== 'LKR' || !/^[a-f0-9]{24}$/i.test(order_id || '') || !/^\d+\.\d{2}$/.test(payhere_amount || '')) return res.status(400).send('Invalid payment');
    const secretHash = crypto.createHash('md5').update(process.env.PAYHERE_MERCHANT_SECRET).digest('hex').toUpperCase();
    const localSig = crypto.createHash('md5').update(`${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${secretHash}`).digest('hex').toUpperCase();
    if (!/^[a-f0-9]{32}$/i.test(md5sig || '') || !crypto.timingSafeEqual(Buffer.from(localSig), Buffer.from(md5sig.toUpperCase()))) return res.status(400).send('Invalid signature');
    const order = await Order.findById(order_id);
    if (!order) return res.status(200).send('OK');
    if (order.totalAmount.toFixed(2) !== payhere_amount || order.payhereOrderId !== order_id) return res.status(400).send('Payment mismatch');
    if (status_code === '2' && !payment_id) return res.status(400).send('Missing payment reference');
    if (status_code === '2' || ['-1','-2','-3'].includes(status_code)) {
      const {changed} = await require('../services/reservations').settlePayment(order_id, payment_id, status_code === '2');
      if (changed) {
        req.app?.get('io')?.to(`vendor:${order.vendorId}`).emit('order:new',{orderId:order._id,pickupTime:order.pickupTime,totalAmount:order.totalAmount,items:order.items});
      }
    }

    return res.status(200).send('OK');
  } catch (error) {
    logger.error(`PayHere notify error: ${error.message}`);
    return res.status(500).send('Retry later');
  }
};

/* ── GET /api/payment/status/:orderId  (student) ── */
const getPaymentStatus = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.orderId).select('studentId paymentStatus status totalAmount pickupTime paymentReviewRequired');
    if (!order) return sendNotFound(res, 'Order not found.');
    if (order.studentId.toString() !== req.user._id.toString())
      return sendError(res, { statusCode: 403, message: 'Access denied.' });
    return sendSuccess(res, { data: { paymentStatus: order.paymentStatus, status: order.status, paymentReviewRequired: order.paymentReviewRequired } });
  } catch (error) { next(error); }
};

module.exports = { initiatePayment, payhereNotify, getPaymentStatus };