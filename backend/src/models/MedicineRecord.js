const mongoose = require('mongoose');

const medicineRecordSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  name: { type: String, required: true, trim: true },
  brandName: { type: String, trim: true, default: '' },
  genericName: { type: String, trim: true, default: '' },
  strength: { type: String, trim: true, default: '' }, // e.g. "500 mg"
  dosageForm: { 
    type: String, 
    enum: ['tablet', 'capsule', 'syrup', 'injection', 'ointment', 'drops', 'inhaler', 'other'],
    default: 'tablet'
  },
  dosage: { type: String, trim: true, default: '' },       // e.g. "1 tablet"
  frequency: { type: String, trim: true, default: '' },    // e.g. "Twice daily after meals"
  reason: { type: String, trim: true, default: '' },       // e.g. "Hypertension"
  prescribedBy: { type: String, trim: true, default: '' }, // e.g. "Dr. Anita Desai"
  startDate: { type: Date },
  status: { 
    type: String, 
    enum: ['currently_taking', 'stopped', 'as_needed'], 
    default: 'currently_taking',
    index: true 
  },
  visibility: { 
    type: String, 
    enum: ['emergency_share', 'consent_only', 'private'], 
    default: 'emergency_share',
    index: true 
  },
  provenance: {
    source: { type: String, enum: ['ai_scan', 'manual_entry'], required: true },
    label: { 
      type: String, 
      default: 'Patient-reported. Scanned by AI, confirmed by patient' 
    },
    scanId: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicineScan' },
    confirmedAt: { type: Date, default: Date.now }
  },
  photoUrl: { type: String, default: '' },
  photoFileName: { type: String, default: '' },
  manufacturer: { type: String, default: '' },
  batchNumber: { type: String, default: '' },
  expiryDate: { type: String, default: '' },
  medicalReportId: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalReport' },
  healthRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthRecord' }
}, {
  timestamps: true
});

module.exports = mongoose.model('MedicineRecord', medicineRecordSchema);
