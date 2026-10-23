const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String, default: 'System' },
  userRole: { type: String, default: 'system' },
  action: { type: String, required: true },
  resourceType: { 
    type: String, 
    enum: [
      'HealthRecord', 'Appointment', 'Consent', 'Queue',
      'Donor', 'Donation', 'BloodUnit', 'BloodRequest', 
      'FamilyLink', 'CommunityCard', 'DiscountApplication',
      'BloodAlert', 'EmergencyCase', 'BreakGlassAccess', 'UserProfile'
    ],
    required: true 
  },
  resourceId: { type: mongoose.Schema.Types.ObjectId },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  details: { type: Object },
  ipAddress: { type: String, default: '127.0.0.1' },
  userAgent: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now, index: true }
}, {
  timestamps: false
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
