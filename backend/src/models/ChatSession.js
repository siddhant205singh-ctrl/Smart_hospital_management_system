const mongoose = require('mongoose');

const chatSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  visitorId: { type: String, default: null, index: true },
  role: {
    type: String,
    enum: ['patient', 'doctor', 'blood_bank_officer', 'hospital_admin', 'visitor', 'admin'],
    default: 'patient'
  },
  title: { type: String, default: 'New Conversation', trim: true },
  isActive: { type: Boolean, default: true },
  rollingSummary: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('ChatSession', chatSessionSchema);
