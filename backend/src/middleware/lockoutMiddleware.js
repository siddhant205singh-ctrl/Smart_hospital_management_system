const LoginAttempt = require('../models/LoginAttempt');

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

/**
 * Middleware checking if an email/IP is currently locked out
 */
const checkLoginLockout = async (req, res, next) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';

    if (!email) return next();

    const attempt = await LoginAttempt.findOne({ email, ipAddress });

    if (attempt && attempt.lockoutUntil && new Date() < new Date(attempt.lockoutUntil)) {
      const remainingMinutes = Math.ceil((new Date(attempt.lockoutUntil).getTime() - Date.now()) / 60000);
      return res.status(429).json({
        error: `Account temporarily locked due to ${MAX_FAILED_ATTEMPTS} consecutive failed login attempts. Please try again in ${remainingMinutes} minute(s) or use "Forgot Password".`,
        locked: true,
        remainingMinutes
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Record a failed login attempt
 */
const recordFailedLogin = async (email, ipAddress) => {
  const normalizedEmail = (email || '').toLowerCase().trim();
  const attempt = await LoginAttempt.findOne({ email: normalizedEmail, ipAddress });

  if (!attempt) {
    await LoginAttempt.create({
      email: normalizedEmail,
      ipAddress,
      attemptCount: 1,
      lastAttemptAt: new Date()
    });
    return { attemptsRemaining: MAX_FAILED_ATTEMPTS - 1 };
  }

  // If previous lockout expired, reset counter
  if (attempt.lockoutUntil && new Date() > new Date(attempt.lockoutUntil)) {
    attempt.attemptCount = 1;
    attempt.lockoutUntil = null;
    attempt.lastAttemptAt = new Date();
    await attempt.save();
    return { attemptsRemaining: MAX_FAILED_ATTEMPTS - 1 };
  }

  attempt.attemptCount += 1;
  attempt.lastAttemptAt = new Date();

  if (attempt.attemptCount >= MAX_FAILED_ATTEMPTS) {
    attempt.lockoutUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
  }

  await attempt.save();

  return {
    attemptsRemaining: Math.max(0, MAX_FAILED_ATTEMPTS - attempt.attemptCount),
    isLocked: attempt.attemptCount >= MAX_FAILED_ATTEMPTS,
    lockoutMinutes: LOCKOUT_MINUTES
  };
};

/**
 * Reset failed login attempts upon successful authentication
 */
const clearFailedLogin = async (email, ipAddress) => {
  const normalizedEmail = (email || '').toLowerCase().trim();
  await LoginAttempt.deleteMany({ email: normalizedEmail, ipAddress });
};

module.exports = {
  checkLoginLockout,
  recordFailedLogin,
  clearFailedLogin
};
