const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  hashedToken: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  deviceInfo: { 
    type: String, 
    default: 'Web Browser' 
  },
  ipAddress: { 
    type: String 
  },
  expiresAt: { 
    type: Date, 
    required: true, 
    index: { expires: '30d' } // Automatic TTL purge after 30 days
  },
  isRevoked: { 
    type: Boolean, 
    default: false 
  },
  replacedByToken: { 
    type: String 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
