const mongoose = require('mongoose');

const familyLinkSchema = new mongoose.Schema({
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: true, index: true },
  familyMemberName: { type: String, required: true },
  relationship: { 
    type: String, 
    enum: ['spouse', 'parent', 'child', 'sibling'], 
    required: true 
  },
  dateOfBirth: { type: Date },
  bloodGroup: { type: String },
  verificationDocumentUrl: { type: String, required: true },
  verificationStatus: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected'], 
    default: 'pending',
    index: true 
  },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: { type: Date },
  rejectionReason: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('FamilyLink', familyLinkSchema);
