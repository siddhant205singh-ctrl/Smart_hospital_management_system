const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  phone: { type: String, required: true, trim: true },
  role: { 
    type: String, 
    enum: ['patient', 'doctor', 'admin', 'receptionist', 'blood_bank_officer'],
    default: 'patient' 
  },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  avatar: { type: String, default: '' },
  familyMembers: [{
    name: { type: String, required: true },
    relation: { type: String, enum: ['spouse', 'child', 'parent', 'sibling', 'other'], required: true },
    age: { type: Number },
    gender: { type: String, enum: ['male', 'female', 'other'] },
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    allergies: [String]
  }],
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    lat: Number,
    lng: Number
  },
  preferredLanguage: { type: String, enum: ['en', 'hi', 'bn'], default: 'en' },
  accessibility: {
    largeFont: { type: Boolean, default: false },
    highContrast: { type: Boolean, default: false }
  },
  donorProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  dateOfBirth: { type: Date },
  cityArea: { type: String, default: '' },
  locationCoordinates: { lat: Number, lng: Number },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  notificationPreferences: {
    channels: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true }
    },
    types: {
      appointments: { type: Boolean, default: true },
      queue: { type: Boolean, default: true },
      reminders: { type: Boolean, default: true },
      bloodAlerts: { type: Boolean, default: true },
      emergency: { type: Boolean, default: true }
    }
  },
  privacySettings: {
    shareWithConsultingDoctors: { type: Boolean, default: true },
    showInDonorDirectory: { type: Boolean, default: true },
    allowEmergencyBreakGlass: { type: Boolean, default: true }
  },
  patientHealth: {
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    bloodGroupSource: { type: String, enum: ['self_declared', 'verified'], default: 'self_declared' },
    heightCm: Number,
    weightKg: Number,
    allergies: [{ type: String }],
    existingConditions: [{ type: String }],
    currentMedicines: [{ name: String, dosage: String, frequency: String }],
    pastSurgeries: [{ surgery: String, year: Number }]
  },
  donorSettings: {
    willingToDonate: { type: Boolean, default: false },
    lastDonationDate: Date
  },
  profileCompletenessScore: { type: Number, default: 35 },
  refreshToken: { type: String }
}, {
  timestamps: true
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
