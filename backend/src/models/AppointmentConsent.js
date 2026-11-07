const mongoose = require('mongoose');

const appointmentConsentSchema = new mongoose.Schema({
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
  documentShareIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'AppointmentDocumentShare' }],
  consentText: { 
    type: String, 
    required: true,
    default: "I consent to share the selected documents with Dr. [Name] for this consultation. The doctor may use assistive software to help review them."
  },
  consentVersion: { type: String, default: '1.0' },
  status: { 
    type: String, 
    enum: ['active', 'revoked', 'expired'], 
    default: 'active', 
    index: true 
  },
  grantedAt: { type: Date, default: Date.now },
  validUntil: { type: Date, required: true }, // Consultation end + configurable grace period (e.g. 3 days)
  revokedAt: { type: Date },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('AppointmentConsent', appointmentConsentSchema);
