/**
 * Socket.io Server
 * ─────────────────────────────────────────
 * Per spec:
 *   Students join room:  user:<studentId>
 *   Vendors join room:   vendor:<vendorId>
 *
 * Events emitted:
 *   order:new           → vendor room  (after payment verified)
 *   order:statusChanged → student room (after vendor updates status)
 */

const { verifyAccessToken } = require('../config/jwt');
const { User }              = require('../models/User');
const logger                = require('../utils/logger');

const initSocket = (io) => {

  /* ── Auth middleware for socket connections ── */
  io.use(async (socket, next) => {
    try {
      // Client must send token in handshake: socket = io(url, { auth: { token } })
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required.'));

      let decoded;
      try {
        decoded = verifyAccessToken(token);
      } catch (err) {
        return next(new Error('Invalid or expired token.'));
      }

      const user = await User.findById(decoded.id);
      if (!user || !user.isAccessible()) return next(new Error('User not found or inactive.'));

      socket.user = user; // attach user to socket
      next();
    } catch (err) {
      logger.error(`Socket auth error: ${err.message}`);
      next(new Error('Socket authentication failed.'));
    }
  });

  /* ── Connection handler ── */
  io.on('connection', (socket) => {
    const user = socket.user;
    logger.info(`Socket connected: ${user.email} (${user.role}) — socket: ${socket.id}`);

    // ── Join the correct room based on role ──
    if (user.role === 'student') {
      const room = `user:${user._id}`;
      socket.join(room);
      logger.info(`Student joined room: ${room}`);
    }

    if (user.role === 'vendor') {
      const room = `vendor:${user._id}`;
      socket.join(room);
      logger.info(`Vendor joined room: ${room}`);
    }

    if (user.role === 'admin') {
      socket.join('admin');
      logger.info(`Admin joined room: admin`);
    }

    // ── Client-side event: mark notification as read ──
    socket.on('notification:read', async ({ notificationId }) => {
      try {
        const { Notification } = require('../models/Notification');
        await Notification.findOneAndUpdate(
          { _id: notificationId, userId: user._id },
          { isRead: true }
        );
      } catch (err) {
        logger.error(`notification:read error: ${err.message}`);
      }
    });

    // ── Disconnect ──
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${user.email} — reason: ${reason}`);
    });

    // ── Error ──
    socket.on('error', (err) => {
      logger.error(`Socket error for ${user.email}: ${err.message}`);
    });
  });

  logger.info('Socket.io initialized');
  return io;
};

module.exports = { initSocket };