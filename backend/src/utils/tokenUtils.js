const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/RefreshToken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'smartcare_jwt_super_secret_key_2026_secure';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'smartcare_jwt_refresh_secret_key_2026_secure';

// 15-Minute Short-Lived Access Token
const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
};

// 7-Day Refresh Token (issued plain to client, stored hashed in DB)
const generatePlainRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, jti: crypto.randomUUID() },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
};

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
};

/**
 * Generate and store a new rotating refresh token
 */
const createAndStoreRefreshToken = async ({ userId, deviceInfo = 'Web Browser', ipAddress = '' }) => {
  const plainToken = generatePlainRefreshToken(userId);
  const hashedToken = hashToken(plainToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    userId,
    hashedToken,
    deviceInfo,
    ipAddress,
    expiresAt,
    isRevoked: false
  });

  return plainToken;
};

/**
 * Rotate Refresh Token with Automatic Token Reuse Detection
 */
const rotateRefreshToken = async ({ oldPlainToken, deviceInfo = 'Web Browser', ipAddress = '' }) => {
  if (!oldPlainToken) {
    throw new Error('Refresh token is required');
  }

  let decoded;
  try {
    decoded = jwt.verify(oldPlainToken, JWT_REFRESH_SECRET);
  } catch (err) {
    throw new Error('Invalid or expired refresh token');
  }

  const oldHashed = hashToken(oldPlainToken);
  const existingToken = await RefreshToken.findOne({ hashedToken: oldHashed });

  // Token Reuse Detection
  if (!existingToken || existingToken.isRevoked) {
    if (decoded?.id) {
      // Security measure: Revoke all tokens for this compromised account
      await RefreshToken.updateMany(
        { userId: decoded.id },
        { $set: { isRevoked: true } }
      );
    }
    throw new Error('Compromised session or reused refresh token. All sessions revoked.');
  }

  const user = await User.findById(existingToken.userId);
  if (!user || user.status !== 'active') {
    throw new Error('User account is not active');
  }

  // Issue new token and revoke old token
  const newPlainToken = generatePlainRefreshToken(user._id);
  const newHashed = hashToken(newPlainToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  existingToken.isRevoked = true;
  existingToken.replacedByToken = newHashed;
  await existingToken.save();

  await RefreshToken.create({
    userId: user._id,
    hashedToken: newHashed,
    deviceInfo,
    ipAddress,
    expiresAt,
    isRevoked: false
  });

  const newAccessToken = generateAccessToken(user._id, user.role);

  return {
    accessToken: newAccessToken,
    refreshToken: newPlainToken,
    user
  };
};

/**
 * Revoke single refresh token on logout
 */
const revokeRefreshToken = async (plainToken) => {
  if (!plainToken) return;
  const hashed = hashToken(plainToken);
  await RefreshToken.findOneAndUpdate(
    { hashedToken: hashed },
    { $set: { isRevoked: true } }
  );
};

/**
 * Revoke all sessions for a user
 */
const revokeAllUserSessions = async (userId) => {
  await RefreshToken.updateMany(
    { userId, isRevoked: false },
    { $set: { isRevoked: true } }
  );
};

module.exports = {
  generateAccessToken,
  createAndStoreRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserSessions,
  hashToken
};
