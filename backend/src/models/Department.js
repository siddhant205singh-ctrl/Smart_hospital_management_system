const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
  name: { type: String, required: true },
  code: { type: String, required: true },
  floor: { type: String, default: '1st Floor' },
  headDoctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
  icon: { type: String, default: 'Heart' },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Department', departmentSchema);
