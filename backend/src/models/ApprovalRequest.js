const mongoose = require('mongoose');

const approvalRequestSchema = new mongoose.Schema({
  applicantId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  applicantRole: { 
    type: String, 
    enum: ['doctor', 'hospital_admin', 'blood_bank_officer'], 
    required: true,
    index: true 
  },
  hospitalId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Hospital', 
    index: true 
  },
  hospitalDetails: {
    name: String,
    city: String,
    state: String,
    street: String,
    zip: String,
    licenseNumber: String,
    bedsCount: Number,
    hasEmergencyDept: Boolean
  },
  professionalDetails: {
    medicalCouncilRegNumber: String,
    councilState: String,
    specialization: String,
    experienceYears: Number,
    qualifications: [{
      degree: String,
      institution: String,
      year: Number
    }],
    bloodBankLicenseNumber: String,
    designation: String
  },
  documentIds: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'VerificationDocument' 
  }],
  reviewerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  reviewerRole: { 
    type: String, 
    enum: ['hospital_admin', 'super_admin'] 
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'info_requested'],
    default: 'pending',
    index: true
  },
  rejectionReason: { 
    type: String, 
    default: '' 
  },
  requestedInfoComments: { 
    type: String, 
    default: '' 
  },
  resubmissionCount: { 
    type: Number, 
    default: 0 
  },
  maxResubmissions: { 
    type: Number, 
    default: 3 
  },
  reviewedAt: { 
    type: Date 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('ApprovalRequest', approvalRequestSchema);
