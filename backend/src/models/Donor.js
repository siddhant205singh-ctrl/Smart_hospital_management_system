const mongoose = require('mongoose');

// SmartCare LifeShare: Voluntary Unpaid Blood Donor Model
// Compliance: Blood is never sold or purchased. All records affirm voluntary unpaid donation.
const donorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  bloodGroup: { 
    type: String, 
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], 
    required: true,
    index: true 
  },
  gender: { type: String, enum: ['male', 'female', 'other'], required: true },
  dateOfBirth: { type: Date, required: true },
  weightKg: { type: Number, required: true, min: 45 },
  lastDonationDate: { type: Date },
  nextEligibleDate: { type: Date, required: true },
  totalDonations: { type: Number, default: 0 },
  livesImpacted: { type: Number, default: 0 }, // totalDonations * 3
  badges: [{
    name: { type: String },
    awardedAt: { type: Date, default: Date.now },
    icon: { type: String },
    description: { type: String, default: '' }
  }],
  status: { type: String, enum: ['active', 'deferred', 'ineligible'], default: 'active' },
  deferralReason: { type: String, default: '' },
  optInUrgentAlerts: { type: Boolean, default: true },
  preferredCity: { type: String, default: '' },
  voluntaryDeclarationAccepted: { type: Boolean, required: true },
  consentAcceptedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('Donor', donorSchema);
