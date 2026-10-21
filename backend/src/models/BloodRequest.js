const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema({
  requestId: { type: String, unique: true, required: true }, // e.g. "REQ-BLD-8821"
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  requestingDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
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
  isPriorityDonorFamily: { type: Boolean, default: false, index: true },
  priorityJustification: {
    matchedDonorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
    familyLinkId: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyLink' },
    donorTier: { type: String }
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
  clinicalDiagnosis: { type: String, required: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
