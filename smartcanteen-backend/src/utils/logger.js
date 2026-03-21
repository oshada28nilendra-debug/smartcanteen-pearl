const { createLogger, format, transports } = require('winston');
const path = require('path');
const { combine, timestamp, printf, colorize, errors } = format;

const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  format: combine(timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), errors({ stack: true }), logFormat),
  transports: [
    new transports.Console({
      silent: process.env.NODE_ENV === 'test',
      format: combine(colorize(), timestamp({ format: 'HH:mm:ss' }), logFormat),
    }),
    ...(process.env.NODE_ENV !== 'test'
      ? [
          new transports.File({ filename: path.join('logs', 'error.log'), level: 'error' }),
          new transports.File({ filename: path.join('logs', 'combined.log') }),
        ]
      : []),
  ],
});

module.exports = logger;