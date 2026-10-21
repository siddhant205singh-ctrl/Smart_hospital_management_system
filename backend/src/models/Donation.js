const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  donationId: { type: String, unique: true, required: true }, // e.g. "DON-2026-00492"
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: true, index: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
  officerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Blood Bank Officer
  campName: { type: String, default: '' },
  date: { type: Date, default: Date.now, required: true },
  unitNumber: { type: String, required: true, unique: true },
  bloodGroup: { type: String, required: true },
  component: { 
    type: String, 
    enum: ['Whole Blood', 'Packed Red Blood Cells (PRBC)', 'Fresh Frozen Plasma (FFP)', 'Platelets', 'Cryoprecipitate'], 
    default: 'Whole Blood' 
  },
  volumeMl: { type: Number, default: 450 },
  hemoglobinGdl: { type: Number, required: true },
  bloodPressure: { type: String, default: '120/80' },
  screeningStatus: { 
    type: String, 
    enum: ['pending', 'passed', 'reactive_rejected'], 
    default: 'passed' 
  },
  voluntaryUnpaidDeclaration: { type: Boolean, default: true, immutable: true },
  officerNotes: { type: String, default: '' },
  healthRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'HealthRecord' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Donation', donationSchema);
