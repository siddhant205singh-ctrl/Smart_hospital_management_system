const mongoose = require('mongoose');

const loginAttemptSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    lowercase: true, 
    trim: true, 
    index: true 
  },
  ipAddress: { 
    type: String, 
    required: true, 
    index: true 
  },
  attemptCount: { 
    type: Number, 
    default: 1 
  },
  lockoutUntil: { 
    type: Date 
  },
  lastAttemptAt: { 
    type: Date, 
    default: Date.now, 
    index: { expires: '24h' } 
  }
}, { 
  timestamps: true 
});

loginAttemptSchema.index({ email: 1, ipAddress: 1 });

module.exports = mongoose.model('LoginAttempt', loginAttemptSchema);
