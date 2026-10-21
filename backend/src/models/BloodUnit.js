const mongoose = require('mongoose');

const bloodUnitSchema = new mongoose.Schema({
  unitNumber: { type: String, unique: true, required: true, index: true },
  donationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donation' },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
  bloodGroup: { 
    type: String, 
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], 
    required: true,
    index: true 
  },
  component: { 
    type: String, 
    enum: ['Whole Blood', 'Packed Red Blood Cells (PRBC)', 'Fresh Frozen Plasma (FFP)', 'Platelets', 'Cryoprecipitate'],
    required: true,
    index: true 
  },
  collectionDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true, index: true },
  status: { 
    type: String, 
    enum: ['quarantine', 'available', 'reserved', 'issued', 'discarded_expired'], 
    default: 'available',
    index: true 
  },
  storageLocation: {
    refrigeratorId: { type: String, default: 'FRIDGE-A1' },
    shelfNumber: { type: String, default: 'SHELF-02' }
  },
  reservedForRequestId: { type: mongoose.Schema.Types.ObjectId, ref: 'BloodRequest' }
}, {
  timestamps: true
});

module.exports = mongoose.model('BloodUnit', bloodUnitSchema);
