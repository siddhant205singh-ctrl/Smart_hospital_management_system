const mongoose = require('mongoose');

const appointmentDocumentShareSchema = new mongoose.Schema({
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  documentType: { type: String, enum: ['medical_report', 'medicine_record'], required: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  title: { type: String, required: true },
  reportType: { type: String, default: 'other' }, // e.g. blood_test, ecg, medicine
  fileUrl: { type: String, default: '' },
  isReviewedByDoctor: { type: Boolean, default: false },
  reviewedAt: { type: Date }
}, {
  timestamps: true
});

module.exports = mongoose.model('AppointmentDocumentShare', appointmentDocumentShareSchema);
