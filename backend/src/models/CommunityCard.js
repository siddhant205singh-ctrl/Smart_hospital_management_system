const mongoose = require('mongoose');

const communityCardSchema = new mongoose.Schema({
  cardNumber: { type: String, unique: true, required: true }, // e.g. "SC-GOLD-94812"
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', unique: true, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tier: { 
    type: String, 
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum'], 
    default: 'Bronze',
    index: true 
  },
  discountPercentage: { type: Number, default: 10 },
  totalLifetimeDonationsAtIssue: { type: Number, required: true },
  issuedDate: { type: Date, default: Date.now },
  validUntil: { type: Date, required: true },
  status: { type: String, enum: ['active', 'suspended', 'expired'], default: 'active', index: true },
  rotatingQrSecret: { type: String, required: true },
  qrCodeUrl: { type: String },
  suspensionReason: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('CommunityCard', communityCardSchema);
