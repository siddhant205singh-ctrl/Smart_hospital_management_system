const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true },
  city: { type: String, required: true },
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    lat: Number,
    lng: Number
  },
  phone: { type: String, required: true },
  emergencyContact: { type: String, required: true },
  hasEmergencyDept: { type: Boolean, default: true },
  is24x7Emergency: { type: Boolean, default: true },
  emergencyPhone: { type: String, default: '' },
  currentErWaitMinutes: { type: Number, default: 15 },
  departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
  isActive: { type: Boolean, default: true },
  bloodBankOperational: { type: Boolean, default: true },
  image: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Hospital', hospitalSchema);
