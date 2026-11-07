const mongoose = require('mongoose');

const documentSummarySchema = new mongoose.Schema({
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, unique: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  overallSummary: { type: String, required: true }, // 3-5 lines
  keyFindings: [{
    finding: { type: String, required: true },
    flaggedAbnormal: { type: Boolean, default: false },
    referenceRange: { type: String, default: '' },
    sourceDocumentId: { type: mongoose.Schema.Types.ObjectId, ref: 'AppointmentDocumentShare' },
    sourceDocumentTitle: { type: String, default: '' }
  }],
  diagnosesAndConditions: [{ type: String }],
  allergies: [{ type: String }],
  medications: [{
    name: { type: String, required: true },
    dosage: { type: String, default: '' },
    isPatientReported: { type: Boolean, default: false },
    sourceDocumentTitle: { type: String, default: '' }
  }],
  issuingEntities: [{
    documentTitle: { type: String },
    facility: { type: String },
    date: { type: String }
  }],
  possibleGaps: [{ type: String }], // unreadable pages, missing values
  language: { type: String, enum: ['en', 'hi'], default: 'en' },
  generatedAt: { type: Date, default: Date.now },
  clinicalDisclaimer: { 
    type: String, 
    default: "AI-generated summary for clinical review. Not a diagnosis or treatment recommendation. Verify against the original documents."
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DocumentSummary', documentSummarySchema);
