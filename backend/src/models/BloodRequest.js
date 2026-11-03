const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema({
  requestId: { type: String, unique: true, required: true }, // e.g. "REQ-BLD-8821"
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  patientName: { type: String, default: 'Emergency Patient / Department' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  requestedByRole: { 
    type: String, 
    enum: ['doctor', 'blood_bank_officer', 'admin', 'hospital'], 
    default: 'blood_bank_officer' 
  },
  requestingDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  bloodGroup: { type: String, required: true },
  component: { 
    type: String, 
    enum: ['Whole Blood', 'Packed Red Blood Cells (PRBC)', 'Fresh Frozen Plasma (FFP)', 'Platelets', 'Cryoprecipitate'],
    required: true 
  },
  unitsRequested: { type: Number, required: true, min: 1 },
  unitsAllocated: { type: Number, default: 0 },
  allocatedUnitIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'BloodUnit' }],
  clinicalUrgency: { 
    type: String, 
    enum: ['critical_emergency', 'urgent_surgery', 'routine_opd'], 
    required: true,
    index: true 
  },
  fastTrackApplied: { type: Boolean, default: false, index: true },
  fastTrackDetails: {
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
    donorName: String,
    totalDonations: Number,
    lastDonationDate: Date,
    relationship: String,
    familyLinkId: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyLink' }
  },
  fastTrackBenefits: {
    feeWaived: { type: Boolean, default: false },
    originalProcessingFeeRupees: { type: Number, default: 1200 },
    finalProcessingFeeRupees: { type: Number, default: 0 },
    replacementDonorWaived: { type: Boolean, default: true },
    paperworkPreVerified: { type: Boolean, default: true }
  },
  processingFeeWaived: { type: Boolean, default: false },
  processingFeeAmount: { type: Number, default: 0 },
  replacementDonorDemanded: { type: Boolean, default: false }, // Enforced false
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'cross_matching', 'issued', 'rejected', 'cancelled'], 
    default: 'pending',
    index: true 
  },
  clinicalDiagnosis: { type: String, required: true },
  voluntaryDonationStarted: { type: Boolean, default: false, index: true },
  bloodAlertId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodAlert' },
  inventoryAtRequest: { type: Number, default: 0 },
  deficitUnits: { type: Number, default: 0 },
  voluntaryDonationNotes: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
