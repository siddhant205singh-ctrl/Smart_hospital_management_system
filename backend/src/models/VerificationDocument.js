const mongoose = require('mongoose');

const verificationDocumentSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  role: { 
    type: String, 
    enum: ['doctor', 'hospital_admin', 'blood_bank_officer'], 
    required: true 
  },
  documentType: {
    type: String,
    enum: [
      'gov_photo_id',
      'medical_degree',
      'council_registration_cert',
      'hospital_license',
      'authorization_letter',
      'qualification_proof'
    ],
    required: true
  },
  fileName: { 
    type: String, 
    required: true 
  },
  filePath: { 
    type: String, 
    required: true 
  },
  fileMimeType: { 
    type: String, 
    required: true 
  },
  fileSizeBytes: { 
    type: Number, 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected'], 
    default: 'pending' 
  },
  reviewerNotes: { 
    type: String, 
    default: '' 
  },
  uploadedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('VerificationDocument', verificationDocumentSchema);
