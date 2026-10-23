const mongoose = require('mongoose');

const bloodAlertResponseSchema = new mongoose.Schema({
  alertId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodAlert', required: true, index: true },
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: {
    type: String,
    enum: ['can_donate', 'not_available'],
    required: true
  },
  suggestedTimeSlot: { type: String, default: 'Today, within 2 hours' },
  directionsSent: { type: Boolean, default: false },
  respondedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

bloodAlertResponseSchema.index({ alertId: 1, donorId: 1 }, { unique: true });

module.exports = mongoose.model('BloodAlertResponse', bloodAlertResponseSchema);
