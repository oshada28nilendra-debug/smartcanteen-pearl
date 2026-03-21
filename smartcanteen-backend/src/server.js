require('dotenv').config();

const http           = require('http');
const { Server }     = require('socket.io');
const app            = require('./app');
const { connectDB }  = require('./config/db');
const { initSocket } = require('./socket/socket');
const logger         = require('./utils/logger');

const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:3000',
  'https://smartcanteen-pearl-svcs.vercel.app',
  process.env.CLIENT_URL,
].filter(Boolean);

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Create HTTP server from Express app
    const server = http.createServer(app);

    // 3. Attach Socket.io to the HTTP server
    const io = new Server(server, {
      cors: {
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
        },
        methods:     ['GET', 'POST'],
        credentials: true,
      },
    });

    // 4. Make io accessible in controllers via req.app.get('io')
    app.set('io', io);

    // 5. Initialise socket event handlers
    initSocket(io);

    // 6. Start listening
    server.listen(PORT, () => {
      logger.info(`🚀 PEARL API running on port ${PORT} [${process.env.NODE_ENV}]`);
      logger.info(`📋 Health: http://localhost:${PORT}/api/health`);
      logger.info(`🔌 Socket.io ready`);
    });

    /* ── Graceful shutdown ── */
    const shutdown = async (signal) => {
      logger.info(`${signal} received — shutting down...`);
      server.close(async () => {
        const { disconnectDB } = require('./config/db');
        await disconnectDB();
        logger.info('Server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    process.on('unhandledRejection', (err) => {
      logger.error(`Unhandled Rejection: ${err.message}`);
      server.close(() => process.exit(1));
    });

  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();