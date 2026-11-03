const mongoose = require('mongoose');

const otpTokenSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    index: true 
  },
  email: { 
    type: String, 
    required: true, 
    lowercase: true, 
    trim: true, 
    index: true 
  },
  purpose: { 
    type: String, 
    enum: ['verify_email', 'forgot_password', 'login_2fa', 'change_email'], 
    required: true,
    index: true 
  },
  hashedOtp: { 
    type: String, 
    required: true 
  },
  devPlainOtp: {
    type: String
  },
  attempts: { 
    type: Number, 
    default: 0 
  },
  maxAttempts: { 
    type: Number, 
    default: 5 
  },
  expiresAt: { 
    type: Date, 
    required: true, 
    index: { expires: '24h' } // MongoDB auto-cleanup via TTL index
  },
  isUsed: { 
    type: Boolean, 
    default: false 
  },
  usedAt: { 
    type: Date 
  },
  ipAddress: { 
    type: String 
  }
}, { 
  timestamps: true 
});

// Composite index to quickly fetch latest active OTP for an email and purpose
otpTokenSchema.index({ email: 1, purpose: 1, isUsed: 1, createdAt: -1 });

module.exports = mongoose.model('OtpToken', otpTokenSchema);
