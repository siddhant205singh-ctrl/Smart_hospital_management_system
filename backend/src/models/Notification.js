const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: [
      'queue_update', 'leave_now', 'token_called', 'appointment_booked', 
      'report_ready', 'reminder', 'blood_urgent_need', 'eligibility_restored'
    ],
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  channel: { type: String, enum: ['in_app', 'email', 'sms'], default: 'in_app' },
  meta: { type: Object, default: {} },
  isRead: { type: Boolean, default: false, index: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);
