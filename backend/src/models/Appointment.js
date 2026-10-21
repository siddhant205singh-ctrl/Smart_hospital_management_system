const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  bookedForFamilyMember: { type: String, default: '' },
  date: { type: String, required: true, index: true }, // YYYY-MM-DD
  timeSlot: { type: String, required: true }, // e.g. "10:00 - 10:15"
  tokenNumber: { type: Number, required: true },
  tokenCode: { type: String, required: true }, // e.g. "CARD-014"
  qrCode: { type: String }, // Base64 data URI of QR code
  status: { 
    type: String, 
    enum: ['scheduled', 'checked_in', 'called', 'in_consultation', 'completed', 'cancelled', 'no_show'],
    default: 'scheduled',
    index: true
  },
  bookingSource: { type: String, enum: ['online', 'walk_in', 'receptionist'], default: 'online' },
  checkInTime: { type: Date },
  consultationStartTime: { type: Date },
  consultationEndTime: { type: Date },
  actualDurationMinutes: { type: Number },
  estimatedTurnTime: { type: Date },
  userTravelTimeMinutes: { type: Number, default: 30 },
  checkInBufferMinutes: { type: Number, default: 15 },
  leaveNotificationSent: { type: Boolean, default: false },
  vitals: {
    bloodPressure: String,
    heartRate: Number,
    temperature: Number,
    weight: Number,
    spo2: Number
  },
  symptoms: { type: String, default: '' },
  doctorNotes: { type: String, default: '' },
  prescription: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Appointment', appointmentSchema);
