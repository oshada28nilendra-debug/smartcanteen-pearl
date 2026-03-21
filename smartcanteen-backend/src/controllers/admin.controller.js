const { User, ROLES, VENDOR_STATUS, ACCOUNT_STATUS } = require('../models/User');
const { Order, ORDER_STATUS, PAYMENT_STATUS } = require('../models/Order');
const { MenuItem } = require('../models/MenuItem');
const { Notification } = require('../models/Notification');
const { sendSuccess, sendError, sendNotFound, sendForbidden } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/* ── GET /api/admin/users ── */
const getUsers = async (req, res, next) => {
  try {
    const { role, accountStatus, vendorStatus, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (role)          filter.role          = role;
    if (accountStatus) filter.accountStatus = accountStatus;
    if (vendorStatus)  filter.vendorStatus  = vendorStatus;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(filter);
    const users = await User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit));
    return sendSuccess(res, {
      data: { users, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } },
    });
  } catch (error) { next(error); }
};

/* ── GET /api/admin/users/:id ── */
const getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendNotFound(res, 'User not found.');
    return sendSuccess(res, { data: { user } });
  } catch (error) { next(error); }
};

/* ── PATCH /api/admin/users/:id/deactivate ── */
const deactivateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendNotFound(res, 'User not found.');
    if (user._id.toString() === req.user._id.toString()) return sendForbidden(res, 'You cannot deactivate your own account.');
    if (user.role === ROLES.ADMIN) return sendForbidden(res, 'Admin accounts cannot be deactivated this way.');
    user.accountStatus = ACCOUNT_STATUS.INACTIVE;
    user.deactivatedAt = new Date();
    user.deactivatedBy = req.user._id;
    user.refreshToken  = null;
    await user.save({ validateBeforeSave: false });
    logger.info(`Admin ${req.user.email} deactivated user ${user.email}`);
    return sendSuccess(res, { message: `${user.name} has been deactivated.`, data: { userId: user._id, accountStatus: user.accountStatus } });
  } catch (error) { next(error); }
};

/* ── PATCH /api/admin/users/:id/activate ── */
const activateUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendNotFound(res, 'User not found.');
    user.accountStatus = ACCOUNT_STATUS.ACTIVE;
    user.deactivatedAt = undefined;
    user.deactivatedBy = undefined;
    await user.save({ validateBeforeSave: false });
    logger.info(`Admin ${req.user.email} activated user ${user.email}`);
    return sendSuccess(res, { message: `${user.name} has been activated.`, data: { userId: user._id, accountStatus: user.accountStatus } });
  } catch (error) { next(error); }
};

/* ── PATCH /api/admin/vendors/:id/status ── */
const updateVendorStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = [VENDOR_STATUS.APPROVED, VENDOR_STATUS.REJECTED];
    if (!allowed.includes(status)) return sendError(res, { statusCode: 400, message: `Status must be: ${allowed.join(', ')}` });
    const vendor = await User.findById(req.params.id);
    if (!vendor) return sendNotFound(res, 'Vendor not found.');
    if (vendor.role !== ROLES.VENDOR) return sendError(res, { statusCode: 400, message: 'User is not a vendor.' });
    vendor.vendorStatus = status;
    if (status === VENDOR_STATUS.APPROVED) {
      vendor.approvedAt = new Date(); vendor.approvedBy = req.user._id;
      vendor.rejectedAt = undefined;  vendor.rejectedBy = undefined;
    } else {
      vendor.rejectedAt = new Date(); vendor.rejectedBy = req.user._id;
      vendor.approvedAt = undefined;  vendor.approvedBy = undefined;
      vendor.refreshToken = null;
    }
    await vendor.save({ validateBeforeSave: false });
    const io = req.app.get('io');
    if (io) {
      io.to(`vendor:${vendor._id}`).emit('vendor:statusChanged', {
        vendorId: vendor._id, status,
        message: status === VENDOR_STATUS.APPROVED
          ? 'Your vendor account has been approved! You can now start receiving orders.'
          : 'Your vendor application has been rejected. Please contact support.',
      });
    }
    logger.info(`Admin ${req.user.email} ${status} vendor ${vendor.email}`);
    return sendSuccess(res, { message: `Vendor has been ${status}.`, data: { vendorId: vendor._id, vendorStatus: vendor.vendorStatus } });
  } catch (error) { next(error); }
};

/* ── DELETE /api/admin/users/:id ── */
const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return sendNotFound(res, 'User not found.');
    if (user._id.toString() === req.user._id.toString()) return sendForbidden(res, 'You cannot delete your own account.');
    if (user.role === ROLES.ADMIN) return sendForbidden(res, 'Admin accounts cannot be deleted via this endpoint.');
    await User.findByIdAndDelete(req.params.id);
    logger.info(`Admin ${req.user.email} deleted user ${user.email}`);
    return sendSuccess(res, { message: `${user.name} has been permanently deleted.` });
  } catch (error) { next(error); }
};

/* ── GET /api/admin/stats — real-time dashboard stats ── */
const getStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

    // Today's orders
    const todayOrders = await Order.find({
      createdAt: { $gte: today, $lt: tomorrow },
      paymentStatus: PAYMENT_STATUS.PAID,
    });

    // Today's revenue
    const todayRevenue = todayOrders
      .filter(o => o.status !== ORDER_STATUS.CANCELLED)
      .reduce((s, o) => s + (o.totalAmount || 0), 0);

    // Pending vendors
    const pendingVendors = await User.countDocuments({ role: ROLES.VENDOR, vendorStatus: VENDOR_STATUS.PENDING });

    // Active users
    const activeUsers = await User.countDocuments({ accountStatus: ACCOUNT_STATUS.ACTIVE });

    // Total vendors
    const approvedVendors = await User.countDocuments({ role: ROLES.VENDOR, vendorStatus: VENDOR_STATUS.APPROVED });

    return sendSuccess(res, {
      data: {
        todayOrderCount: todayOrders.length,
        todayRevenue,
        pendingVendors,
        activeUsers,
        approvedVendors,
      },
    });
  } catch (error) { next(error); }
};

/* ── GET /api/admin/activity — recent activity feed ── */
const getActivity = async (req, res, next) => {
  try {
    const activity = [];

    // Recent registrations (last 5)
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email role createdAt');
    recentUsers.forEach(u => {
      activity.push({
        icon: u.role === 'vendor' ? '🏪' : '👤',
        bg:   'var(--accent-light)',
        text: `New ${u.role} registered: <b>${u.name}</b>`,
        time: u.createdAt,
        type: 'user',
      });
    });

    // Recent paid orders (last 5)
    const recentOrders = await Order.find({ paymentStatus: PAYMENT_STATUS.PAID })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('vendorId', 'name vendorProfile')
      .populate('studentId', 'name');
    recentOrders.forEach(o => {
      const isCompleted  = o.status === ORDER_STATUS.COMPLETED;
      const isCancelled  = o.status === ORDER_STATUS.CANCELLED;
      activity.push({
        icon: isCompleted ? '✅' : isCancelled ? '❌' : '🛒',
        bg:   isCompleted ? 'var(--green-light)' : isCancelled ? 'var(--red-light)' : 'var(--orange-light)',
        text: `Order <b>#${o._id.toString().slice(-6).toUpperCase()}</b> — ${o.status} (${o.vendorId?.vendorProfile?.businessName || o.vendorId?.name || 'Canteen'})`,
        time: o.createdAt,
        type: 'order',
      });
    });

    // Recent menu updates (last 3)
    const recentMenuItems = await MenuItem.find()
      .sort({ updatedAt: -1 })
      .limit(3)
      .populate('vendorId', 'name vendorProfile');
    recentMenuItems.forEach(m => {
      activity.push({
        icon: '🍽️',
        bg:   'var(--purple-light)',
        text: `<b>${m.vendorId?.vendorProfile?.businessName || m.vendorId?.name || 'Vendor'}</b> updated their menu — added/updated "${m.name}"`,
        time: m.updatedAt,
        type: 'menu',
      });
    });

    // Sort all by time, newest first
    activity.sort((a, b) => new Date(b.time) - new Date(a.time));

    // Format time as relative
    const formatted = activity.slice(0, 10).map(a => ({
      ...a,
      time: formatRelativeTime(a.time),
    }));

    return sendSuccess(res, { data: { activity: formatted } });
  } catch (error) { next(error); }
};

/* ── GET /api/admin/reports — real revenue + order data ── */
const getReports = async (req, res, next) => {
  try {
    const { period = 'weekly' } = req.query;
    const now   = new Date();
    const start = new Date(now);

    if (period === 'weekly') {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    } else {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }

    // All paid orders in period
    const orders = await Order.find({
      paymentStatus: PAYMENT_STATUS.PAID,
      createdAt: { $gte: start },
    }).populate('items');

    // Daily breakdown
    const dayMap = {};
    const labels = [];
    const revenueData = [];
    const orderData   = [];

    if (period === 'weekly') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toLocaleDateString('en-US', { weekday: 'short' });
        labels.push(key);
        dayMap[d.toDateString()] = { revenue: 0, orders: 0 };
      }
      orders.forEach(o => {
        const key = new Date(o.createdAt).toDateString();
        if (dayMap[key]) {
          dayMap[key].revenue += o.totalAmount || 0;
          dayMap[key].orders  += 1;
        }
      });
      Object.values(dayMap).forEach(d => {
        revenueData.push(Math.round(d.revenue));
        orderData.push(d.orders);
      });
    } else {
      // Monthly — week by week
      for (let i = 0; i < 4; i++) {
        labels.push(`Week ${i + 1}`);
        revenueData.push(0);
        orderData.push(0);
      }
      orders.forEach(o => {
        const weekOfMonth = Math.floor((new Date(o.createdAt).getDate() - 1) / 7);
        if (weekOfMonth < 4) {
          revenueData[weekOfMonth] += o.totalAmount || 0;
          orderData[weekOfMonth]   += 1;
        }
      });
    }

    // Top selling items
    const itemMap = {};
    orders.forEach(order => {
      (order.items || []).forEach(item => {
        const key = item.nameSnapshot;
        if (!itemMap[key]) itemMap[key] = { name: key, orders: 0, revenue: 0 };
        itemMap[key].orders  += item.quantity;
        itemMap[key].revenue += item.lineTotal || (item.priceSnapshot * item.quantity);
      });
    });
    const topItems = Object.values(itemMap).sort((a, b) => b.orders - a.orders).slice(0, 5);

    // Summary stats
    const totalRevenue    = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const totalOrders     = orders.length;
    const cancelledOrders = await Order.countDocuments({ paymentStatus: PAYMENT_STATUS.PAID, status: ORDER_STATUS.CANCELLED, createdAt: { $gte: start } });
    const avgOrderValue   = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    return sendSuccess(res, {
      data: {
        summary: { totalRevenue, totalOrders, avgOrderValue, cancelledOrders },
        chart:   { labels, revenueData, orderData },
        topItems,
      },
    });
  } catch (error) { next(error); }
};

/* ── GET /api/admin/search — search users, vendors, orders ── */
const search = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) return sendSuccess(res, { data: { results: [] } });
    const term = q.trim();
    const regex = new RegExp(term, 'i');

    const [users, orders] = await Promise.all([
      User.find({ $or: [{ name: regex }, { email: regex }] }).limit(5).select('name email role vendorProfile'),
      Order.find({ $or: [{ _id: term.length === 24 ? term : null }] })
        .limit(3)
        .populate('studentId', 'name')
        .populate('vendorId', 'name vendorProfile')
        .catch(() => []),
    ]);

    const results = [
      ...users.map(u => ({
        icon:  u.role === 'vendor' ? '🏪' : '👤',
        label: `${u.role === 'vendor' ? (u.vendorProfile?.businessName || u.name) : u.name} — ${u.email}`,
        type:  u.role,
        id:    u._id,
      })),
      ...orders.map(o => ({
        icon:  '🛒',
        label: `Order #${o._id.toString().slice(-8).toUpperCase()} — ${o.studentId?.name || 'Student'} — LKR ${o.totalAmount}`,
        type:  'order',
        id:    o._id,
      })),
    ];

    return sendSuccess(res, { data: { results } });
  } catch (error) { next(error); }
};

/* ── GET /api/admin/notifications ── */
const getAdminNotifications = async (req, res, next) => {
  try {
    const notifs = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    const unreadCount = await Notification.countDocuments({ userId: req.user._id, isRead: false });

    // Also include pending vendor notifications
    const pendingVendors = await User.find({ role: ROLES.VENDOR, vendorStatus: VENDOR_STATUS.PENDING })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email vendorProfile createdAt');

    return sendSuccess(res, { data: { notifications: notifs, unreadCount, pendingVendors } });
  } catch (error) { next(error); }
};

// ── Helper: relative time ──
function formatRelativeTime(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins} minute${mins!==1?'s':''} ago`;
  if (hours < 24) return `${hours} hour${hours!==1?'s':''} ago`;
  return `${days} day${days!==1?'s':''} ago`;
}

module.exports = {
  getUsers, getUserById, deactivateUser, activateUser,
  updateVendorStatus, deleteUser,
  getStats, getActivity, getReports, search,
  getAdminNotifications,
};