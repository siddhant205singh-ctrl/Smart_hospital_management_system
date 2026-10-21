const mongoose = require('mongoose');

// SmartCare LifeShare: Hospital discount rule configuration
// Compliance: Discount rules are restricted to outpatient welfare (OPD consultation, diagnostic tests, pharmacy).
// INPATIENT ADMISSIONS, SURGERIES, AND BLOOD UNIT FEES ARE STRICTLY EXCLUDED.
const discountRuleSchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
  category: { 
    type: String, 
    enum: ['outpatient_consultation', 'diagnostics_lab', 'radiology_scans', 'pharmacy_opd', 'health_checkup_packages'], 
    required: true 
  },
  tierDiscounts: {
    Bronze: { type: Number, default: 10, max: 20 },
    Silver: { type: Number, default: 20, max: 30 },
    Gold: { type: Number, default: 30, max: 40 },
    Platinum: { type: Number, default: 50, max: 50 }
  },
  maxDiscountCapRupees: { type: Number, default: 5000 },
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('DiscountRule', discountRuleSchema);
