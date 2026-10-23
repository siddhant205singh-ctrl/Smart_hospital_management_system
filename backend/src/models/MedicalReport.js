const mongoose = require('mongoose');

const medicalReportSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true },
  reportType: {
    type: String,
    enum: [
      'blood_test',
      'x_ray',
      'mri_ct',
      'ecg',
      'prescription',
      'discharge_summary',
      'vaccination',
      'other'
    ],
    required: true,
    index: true
  },
  reportDate: { type: Date, required: true, default: Date.now },
  issuingFacility: { type: String, required: true, trim: true },
  doctorName: { type: String, default: '', trim: true },
  notes: { type: String, default: '', trim: true },

  // Emergency Triage Flag
  isEmergencyImportant: { type: Boolean, default: false, index: true },

  // Granular Access Control
  visibility: {
    type: String,
    enum: ['emergency_share', 'consent_only', 'private'],
    default: 'consent_only',
    index: true
  },

  // File Storage Details
  fileUrl: { type: String, required: true },
  fileName: { type: String, required: true },
  fileMimeType: { type: String, required: true },
  fileSizeBytes: { type: Number, required: true },

  // AI Extracted Summary Cache (Gemini clinical analysis)
  aiSummaryCache: {
    keyFindings: [{ type: String }],
    abnormalValues: [{ type: String }],
    notedConditions: [{ type: String }],
    allergies: [{ type: String }],
    activeMedications: [{ type: String }],
    sourceCitations: [{ section: String, reportTitle: String }],
    analyzedAt: { type: Date }
  },

  // Bi-directional link with HealthRecord timeline
  healthRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthRecord' }
}, {
  timestamps: true
});

module.exports = mongoose.model('MedicalReport', medicalReportSchema);
