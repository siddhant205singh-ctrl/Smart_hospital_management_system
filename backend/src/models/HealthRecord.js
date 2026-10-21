const mongoose = require('mongoose');

const healthRecordSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  type: {
    type: String,
    enum: [
      'prescription', 'lab_report', 'discharge_summary', 'scan_image',
      'doctor_note', 'vital_check', 'blood_donation'
    ],
    required: true,
    index: true
  },
  title: { type: String, required: true },
  date: { type: Date, default: Date.now },
  fileUrl: { type: String, default: '' },
  fileSize: { type: Number, default: 0 },
  fileType: { type: String, default: 'application/pdf' },
  aiSummary: { type: String, default: '' },
  metadata: {
    diagnosis: String,
    medicines: [{
      name: String,
      dosage: String,
      frequency: String,
      duration: String,
      instructions: String
    }],
    labValues: { type: Map, of: String },
    // LifeShare blood donation metadata:
    bloodDonation: {
      donationId: String,
      unitNumber: String,
      component: String,
      volumeMl: Number,
      screeningStatus: String
    }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('HealthRecord', healthRecordSchema);
