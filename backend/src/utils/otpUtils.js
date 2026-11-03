const crypto = require('crypto');
const OtpToken = require('../models/OtpToken');
const { sendOtpEmail } = require('../services/emailService');

const OTP_SECRET = process.env.OTP_SECRET || 'smartcare_otp_secure_secret_salt_2026';
const COOLDOWN_SECONDS = 60;
const MAX_DAILY_OTP_PER_EMAIL = 15;

/**
 * Hash plain 6-digit OTP using HMAC-SHA256
 */
const hashOtp = (plainOtp) => {
  return crypto.createHmac('sha256', OTP_SECRET).update(plainOtp.trim()).digest('hex');
};

/**
 * Generate 6-digit cryptographically secure OTP
 */
const generateSixDigitCode = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Generate and dispatch OTP with cooldown and rate limiting
 */
const generateAndDispatchOtp = async ({
  email,
  userId = null,
  purpose = 'verify_email',
  name = 'Valued User',
  ipAddress = '',
  deviceInfo = '',
  expiryMinutes = 10
}) => {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Check 60-second cooldown
  const lastOtp = await OtpToken.findOne({
    email: normalizedEmail,
    purpose,
    isUsed: false
  }).sort({ createdAt: -1 });

  if (lastOtp) {
    const elapsedSeconds = Math.floor((Date.now() - new Date(lastOtp.createdAt).getTime()) / 1000);
    if (elapsedSeconds < COOLDOWN_SECONDS) {
      const waitRemaining = COOLDOWN_SECONDS - elapsedSeconds;
      return {
        success: false,
        cooldown: true,
        waitSeconds: waitRemaining,
        error: `Please wait ${waitRemaining} seconds before requesting a new code.`
      };
    }
  }

  // 2. Check 24-hour cap per email
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dailyCount = await OtpToken.countDocuments({
    email: normalizedEmail,
    createdAt: { $gte: oneDayAgo }
  });

  if (dailyCount >= MAX_DAILY_OTP_PER_EMAIL) {
    return {
      success: false,
      rateLimited: true,
      error: 'Daily limit for verification codes exceeded. Please try again tomorrow or contact support.'
    };
  }

  // 3. Invalidate prior active OTPs for this purpose
  await OtpToken.updateMany(
    { email: normalizedEmail, purpose, isUsed: false },
    { $set: { isUsed: true, usedAt: new Date() } }
  );

  // 4. Generate new code and hash
  const plainOtp = generateSixDigitCode();
  const hashedOtp = hashOtp(plainOtp);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  const otpDoc = await OtpToken.create({
    userId,
    email: normalizedEmail,
    purpose,
    hashedOtp,
    devPlainOtp: process.env.NODE_ENV === 'production' ? undefined : plainOtp,
    expiresAt,
    ipAddress,
    attempts: 0,
    maxAttempts: 5,
    isUsed: false
  });

  // 5. Dispatch email
  await sendOtpEmail({
    to: normalizedEmail,
    name,
    otp: plainOtp,
    purpose,
    expiryMinutes,
    ipAddress,
    deviceInfo
  });

  return {
    success: true,
    tokenId: otpDoc._id,
    expiresAt,
    cooldownSeconds: COOLDOWN_SECONDS,
    // Returned in development mode to assist zero-friction local testing
    devOtpCode: process.env.NODE_ENV === 'production' ? undefined : plainOtp
  };
};

/**
 * Verify submitted OTP against hashed database record
 */
const verifyOtpCode = async ({ email, otp, purpose }) => {
  if (!email || !otp || !purpose) {
    return { success: false, error: 'Email, verification code, and purpose are required.' };
  }

  const normalizedEmail = email.toLowerCase().trim();
  const plainOtp = otp.toString().trim();

  // Find latest active OTP
  let tokenDoc = await OtpToken.findOne({
    email: normalizedEmail,
    purpose,
    isUsed: false
  }).sort({ createdAt: -1 });

  if (!tokenDoc) {
    // Graceful recovery: Check if this exact code was recently marked isUsed (within 10 minutes)
    // This protects against double-clicks, network retries, or post-verification hiccups
    const candidateHash = hashOtp(plainOtp);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentlyUsed = await OtpToken.findOne({
      email: normalizedEmail,
      purpose,
      isUsed: true,
      hashedOtp: candidateHash,
      usedAt: { $gte: tenMinutesAgo }
    }).sort({ usedAt: -1 });

    if (recentlyUsed) {
      return {
        success: true,
        token: recentlyUsed,
        alreadyConsumed: true
      };
    }

    return {
      success: false,
      error: 'Verification code not found or already used. Please request a new code.'
    };
  }

  // Check Expiry
  if (new Date() > new Date(tokenDoc.expiresAt)) {
    tokenDoc.isUsed = true;
    await tokenDoc.save();
    return {
      success: false,
      expired: true,
      error: 'Verification code has expired. Please request a new code.'
    };
  }

  // Check max attempts
  if (tokenDoc.attempts >= tokenDoc.maxAttempts) {
    tokenDoc.isUsed = true;
    await tokenDoc.save();
    return {
      success: false,
      locked: true,
      error: 'Too many incorrect attempts. This code has been invalidated. Please request a new code.'
    };
  }

  // Verify HMAC hash
  const candidateHash = hashOtp(plainOtp);
  if (candidateHash !== tokenDoc.hashedOtp) {
    tokenDoc.attempts += 1;
    const remaining = tokenDoc.maxAttempts - tokenDoc.attempts;
    if (remaining <= 0) {
      tokenDoc.isUsed = true;
    }
    await tokenDoc.save();

    return {
      success: false,
      invalid: true,
      attemptsRemaining: Math.max(0, remaining),
      error: remaining > 0
        ? `Incorrect verification code. ${remaining} attempt(s) remaining.`
        : 'Incorrect code. Maximum attempts exceeded. Please request a new code.'
    };
  }

  // Mark token successfully consumed
  tokenDoc.isUsed = true;
  tokenDoc.usedAt = new Date();
  await tokenDoc.save();

  return {
    success: true,
    token: tokenDoc
  };
};

module.exports = {
  hashOtp,
  generateSixDigitCode,
  generateAndDispatchOtp,
  verifyOtpCode
};
