const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { 
    type: String, 
    unique: true, 
    uppercase: true,
    default: () => 'HOSP-' + Math.random().toString(36).substring(2, 8).toUpperCase()
  },
  city: { type: String, default: 'Delhi' },
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    lat: Number,
    lng: Number
  },
  phone: { type: String, default: '+91-11-20000000' },
  emergencyContact: { type: String, default: '108' },
  hasEmergencyDept: { type: Boolean, default: true },
  is24x7Emergency: { type: Boolean, default: true },
  emergencyPhone: { type: String, default: '' },
  currentErWaitMinutes: { type: Number, default: 15 },
  departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
  isActive: { type: Boolean, default: true },
  approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  licenseNumber: { type: String, trim: true },
  bedsCount: { type: Number, default: 200 },
  adminUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  verificationDocuments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'VerificationDocument' }],
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  bloodBankOperational: { type: Boolean, default: true },
  image: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Hospital', hospitalSchema);
