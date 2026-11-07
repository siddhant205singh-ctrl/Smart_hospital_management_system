const mongoose = require('mongoose');

const aiProcessingAckSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  ackTextVersion: { type: String, required: true, default: 'v1.0' },
  acknowledgedAt: { type: Date, default: Date.now },
  ipAddress: { type: String, default: '' },
  userAgent: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('AiProcessingAck', aiProcessingAckSchema);
