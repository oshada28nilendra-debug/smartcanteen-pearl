const { Notification } = require('../models/Notification');
const { sendSuccess, sendNotFound } = require('../utils/apiResponse');

/* ── GET /api/notifications  (auth user) ── */
const getMyNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Notification.countDocuments({ userId: req.user._id });
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const unreadCount = await Notification.unreadCount(req.user._id);
    return sendSuccess(res, {
      data: { notifications, unreadCount, pagination: { total, page: parseInt(page), limit: parseInt(limit) } },
    });
  } catch (error) { next(error); }
};

/* ── PATCH /api/notifications/:id/read ── */
const markOneRead = async (req, res, next) => {
  try {
    const notif = await Notification.findOne({ _id: req.params.id, userId: req.user._id });
    if (!notif) return sendNotFound(res, 'Notification not found.');
    notif.isRead = true;
    await notif.save();
    return sendSuccess(res, { message: 'Notification marked as read.' });
  } catch (error) { next(error); }
};

/* ── PATCH /api/notifications/read-all ── */
const markAllRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    return sendSuccess(res, { message: `${result.modifiedCount} notification(s) marked as read.` });
  } catch (error) { next(error); }
};

module.exports = { getMyNotifications, markOneRead, markAllRead };