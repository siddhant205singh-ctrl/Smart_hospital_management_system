const mongoose = require('mongoose');

const medicineScanSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  imageUrls: [{ type: String, required: true }],
  extractedItems: [{
    brandName: { type: String, default: '' },
    genericName: { type: String, default: '' },
    strength: { type: String, default: '' },
    dosageForm: { type: String, default: 'tablet' },
    manufacturer: { type: String, default: '' },
    batchNumber: { type: String, default: '' },
    expiryDate: { type: String, default: '' },
    confidence: {
      overall: { type: Number, default: 0.9 }, // 0.0 - 1.0
      fields: {
        brandName: { type: String, enum: ['high', 'medium', 'low'], default: 'high' },
        genericName: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
        strength: { type: String, enum: ['high', 'medium', 'low'], default: 'high' },
        dosageForm: { type: String, enum: ['high', 'medium', 'low'], default: 'high' }
      }
    }
  }],
  status: { 
    type: String, 
    enum: ['pending_review', 'confirmed', 'discarded'], 
    default: 'pending_review' 
  },
  rawAiOutput: { type: String }, // Can be cleared after review
  ipAddress: { type: String, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('MedicineScan', medicineScanSchema);
