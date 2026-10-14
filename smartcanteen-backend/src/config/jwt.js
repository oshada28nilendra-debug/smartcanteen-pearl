const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');

const JWT_SECRET          = process.env.JWT_SECRET;
const JWT_EXPIRES_IN      = process.env.JWT_EXPIRES_IN      || '15m';
const JWT_REFRESH_SECRET  = process.env.JWT_REFRESH_SECRET;
const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be set in .env');
}

const signAccessToken  = (payload) =>
  jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer:   'smartcanteen-api',
    audience: 'smartcanteen-client',
  });

const signRefreshToken = (payload) =>
  jwt.sign(payload, JWT_REFRESH_SECRET, {
    // Rotation must produce a new token even within the same JWT timestamp second.
    jwtid: randomUUID(),
    expiresIn: JWT_REFRESH_EXPIRES,
    issuer:   'smartcanteen-api',
    audience: 'smartcanteen-client',
  });

const verifyAccessToken  = (token) =>
  jwt.verify(token, JWT_SECRET, {
    issuer:   'smartcanteen-api',
    audience: 'smartcanteen-client',
  });

const verifyRefreshToken = (token) =>
  jwt.verify(token, JWT_REFRESH_SECRET, {
    issuer:   'smartcanteen-api',
    audience: 'smartcanteen-client',
  });

module.exports = {
  signAccessToken, signRefreshToken,
  verifyAccessToken, verifyRefreshToken,
  JWT_EXPIRES_IN, JWT_REFRESH_EXPIRES,
};
