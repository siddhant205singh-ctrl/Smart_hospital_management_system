const mongoose = require('mongoose');

const discountApplicationSchema = new mongoose.Schema({
  transactionId: { type: String, unique: true, required: true },
  cardId: { type: mongoose.Schema.Types.ObjectId, ref: 'CommunityCard', required: true },
  cardNumber: { type: String, required: true },
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor', required: true },
  donorName: { type: String, required: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
  serviceCategory: { 
    type: String, 
    enum: ['outpatient_consultation', 'diagnostics_lab', 'radiology_scans', 'pharmacy_opd', 'health_checkup_packages'], 
    required: true 
  },
  receptionistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  invoiceNumber: { type: String, required: true },
  isAdmissionLinked: { type: Boolean, default: false, immutable: true }, // MUST REMAIN FALSE
  originalBillAmount: { type: Number, required: true },
  discountPercentageApplied: { type: Number, required: true },
  discountAmountDeducted: { type: Number, required: true },
  finalPayableAmount: { type: Number, required: true },
  appliedAt: { type: Date, default: Date.now, index: true }
}, {
  timestamps: false
});

module.exports = mongoose.model('DiscountApplication', discountApplicationSchema);
