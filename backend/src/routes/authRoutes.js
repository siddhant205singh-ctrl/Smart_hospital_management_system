const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
  registerPatient,
  registerDoctor,
  registerHospitalAdmin,
  registerBloodBankOfficer,
  register,
  verifyEmail,
  resendOtp,
  getLatestOtp,
  login,
  verify2faLogin,
  refreshToken,
  logout,
  revokeAllSessions,
  forgotPassword,
  resetPassword,
  getAccountStatus,
  toggle2FA,
  getMe,
  updateProfile
} = require('../controllers/authController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const { checkLoginLockout } = require('../middleware/lockoutMiddleware');
const { uploadVerificationFiles } = require('../middleware/verificationUpload');

// Rate limiters for security
const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many verification code attempts. Please wait 15 minutes before trying again.' }
});

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many login attempts from this network. Please try again after 15 minutes.' }
});

// Role-specific Registration Routes
router.post('/register/patient', registerPatient);
router.post('/register/doctor', uploadVerificationFiles, registerDoctor);
router.post('/register/hospital-admin', uploadVerificationFiles, registerHospitalAdmin);
router.post('/register/blood-bank-officer', uploadVerificationFiles, registerBloodBankOfficer);
router.post('/register', register); // Legacy fallback

// OTP Verification & Resend
router.post('/verify-email', otpRateLimiter, verifyEmail);
router.post('/resend-otp', otpRateLimiter, resendOtp);
router.get('/latest-otp', getLatestOtp);

// Authentication & Session
router.post('/login', loginRateLimiter, checkLoginLockout, login);
router.post('/login/verify-2fa', otpRateLimiter, verify2faLogin);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.post('/revoke-all-sessions', protect, revokeAllSessions);

// Password Recovery
router.post('/forgot-password', otpRateLimiter, forgotPassword);
router.post('/reset-password', otpRateLimiter, resetPassword);

// Status Tracking & User Management
router.get('/account-status', optionalProtect, getAccountStatus);
router.post('/toggle-2fa', protect, toggle2FA);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

module.exports = router;
