const mongoose = require('mongoose');

const bloodAlertSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
  raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true,
    index: true
  },
  component: {
    type: String,
    enum: [
      'Packed Red Blood Cells (PRBC)',
      'Platelets',
      'Whole Blood',
      'Fresh Frozen Plasma (FFP)'
    ],
    default: 'Packed Red Blood Cells (PRBC)'
  },
  unitsNeeded: { type: Number, required: true, min: 1 },
  unitsFulfilled: { type: Number, default: 0 },
  urgency: {
    type: String,
    enum: ['Normal', 'High', 'Critical'],
    default: 'High',
    index: true
  },
  matchingMode: {
    type: String,
    enum: ['exact_match', 'include_compatible'],
    default: 'exact_match'
  },
  contactDesk: { type: String, required: true },
  contactPhone: { type: String, required: true },
  radiusKm: { type: Number, default: 20 },
  expiresAt: { type: Date, required: true },
  status: {
    type: String,
    enum: ['active', 'fulfilled', 'expired', 'cancelled'],
    default: 'active',
    index: true
  },
  matchedUsersCount: { type: Number, default: 0 },
  responseStats: {
    canDonateCount: { type: Number, default: 0 },
    unavailableCount: { type: Number, default: 0 }
  },
  autoTriggerSuggested: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('BloodAlert', bloodAlertSchema);
