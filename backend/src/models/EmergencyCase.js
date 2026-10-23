const mongoose = require('mongoose');

const emergencyCaseSchema = new mongoose.Schema({
  caseNumber: { type: String, unique: true, required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  submittedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String },
    relationship: { type: String, default: 'self' },
    isBystander: { type: Boolean, default: false }
  },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
  assignedDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  chiefComplaint: {
    type: String,
    enum: [
      'chest_pain',
      'breathing_difficulty',
      'severe_bleeding',
      'stroke_signs',
      'accident_injury',
      'high_fever_seizures',
      'other'
    ],
    required: true,
    index: true
  },
  complaintDescription: { type: String, default: '' },
  severityScore: { type: Number, min: 1, max: 10, required: true },
  symptomOnset: { type: String, default: 'within_1_hour' },
  triagePriority: {
    type: String,
    enum: ['P1_CRITICAL_RESUSCITATION', 'P2_EMERGENT', 'P3_URGENT'],
    default: 'P2_EMERGENT',
    index: true
  },
  prefilledHealthSnapshot: {
    bloodGroup: String,
    allergies: [String],
    existingConditions: [String],
    currentMedicines: [String]
  },
  status: {
    type: String,
    enum: ['waiting', 'under_treatment', 'stabilized', 'admitted', 'discharged'],
    default: 'waiting',
    index: true
  },
  clinicalDiagnosis: { type: String, default: '' },
  treatmentGiven: { type: String, default: '' },
  prescribedMedicines: [{
    name: String,
    dosage: String,
    instructions: String
  }],
  admittedDepartmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  aiClinicalSummary: { type: String, default: '' },
  breakGlassUsed: { type: Boolean, default: false }
}, {
  timestamps: true
});

module.exports = mongoose.model('EmergencyCase', emergencyCaseSchema);
