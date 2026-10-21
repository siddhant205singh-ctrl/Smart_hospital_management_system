const mongoose = require('mongoose');

const consentSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  granteeType: { type: String, enum: ['doctor', 'hospital'], required: true },
  granteeId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  granteeName: { type: String, required: true },
  scope: { 
    type: String, 
    enum: ['full_history', 'past_30_days', 'current_visit_only', 'prescriptions_only'],
    default: 'full_history' 
  },
  status: { 
    type: String, 
    enum: ['active', 'revoked', 'expired'], 
    default: 'active' 
  },
  validUntil: { type: Date, required: true },
  revokedAt: { type: Date }
}, {
  timestamps: true
});

module.exports = mongoose.model('Consent', consentSchema);
