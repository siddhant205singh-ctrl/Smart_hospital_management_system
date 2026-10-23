const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
  specialty: { type: String, required: true },
  qualifications: [{
    degree: { type: String, required: true },
    institution: { type: String, required: true },
    year: { type: Number, required: true }
  }],
  subSpecialties: [String],
  medicalCouncilRegNumber: { type: String, trim: true },
  isVerified: { type: Boolean, default: false },
  verifiedByAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  verifiedAt: { type: Date },
  bio: { type: String, default: '' },
  languages: [{ type: String, default: ['English', 'Hindi'] }],
  experienceYears: { type: Number, default: 5 },
  consultationFee: { type: Number, default: 500 },
  avgConsultationTime: { type: Number, default: 15 }, // minutes (dynamically updated)
  roomNumber: { type: String, default: 'OPD-101' },
  weeklySchedule: [{
    dayOfWeek: { type: Number, min: 0, max: 6 }, // 0 = Sunday
    startTime: { type: String, default: '09:00' },
    endTime: { type: String, default: '17:00' },
    slotDuration: { type: Number, default: 15 },
    maxPatients: { type: Number, default: 30 }
  }],
  breaks: [{
    dayOfWeek: { type: Number },
    startTime: { type: String },
    endTime: { type: String },
    label: { type: String, default: 'Lunch' }
  }],
  leaveDays: [{ type: Date }],
  liveStatus: { 
    type: String, 
    enum: ['available', 'in_consultation', 'on_break', 'offline', 'emergency'],
    default: 'available' 
  },
  currentAppointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  rating: { type: Number, default: 4.8 },
  reviewCount: { type: Number, default: 42 }
}, {
  timestamps: true
});

module.exports = mongoose.model('Doctor', doctorSchema);
