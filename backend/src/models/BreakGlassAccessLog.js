const mongoose = require('mongoose');

const breakGlassAccessLogSchema = new mongoose.Schema({
  emergencyCaseId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmergencyCase', required: true, index: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  doctorName: { type: String, required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reason: {
    type: String,
    enum: [
      'unconscious_patient',
      'acute_cardiac_arrest',
      'severe_trauma',
      'missing_patient_consent',
      'critical_pediatric_emergency'
    ],
    required: true
  },
  clinicalJustification: { type: String, required: true },
  accessedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  recordsViewed: [{ type: String }],
  patientNotified: { type: Boolean, default: false },
  flaggedByAdmin: { type: Boolean, default: false },
  adminReviewNotes: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('BreakGlassAccessLog', breakGlassAccessLogSchema);
