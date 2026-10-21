const Hospital = require('../models/Hospital');
const Department = require('../models/Department');

// @route   GET /api/hospitals
exports.getHospitals = async (req, res, next) => {
  try {
    const hospitals = await Hospital.find({ isActive: true }).populate('departments');
    res.json({ success: true, count: hospitals.length, hospitals });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/hospitals/:id
exports.getHospitalById = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id).populate('departments');
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    res.json({ success: true, hospital });
  } catch (error) {
    next(error);
  }
};
