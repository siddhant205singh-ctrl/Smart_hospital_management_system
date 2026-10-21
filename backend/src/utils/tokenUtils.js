const jwt = require('jsonwebtoken');

const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'smartcare_jwt_super_secret_key_2026_secure',
    { expiresIn: '1d' } // 24h
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET || 'smartcare_jwt_refresh_secret_key_2026_secure',
    { expiresIn: '7d' }
  );
};

module.exports = { generateAccessToken, generateRefreshToken };
