const express = require('express');
const router = express.Router();
const {
  getDoctors,
  getDoctorById,
  getFullDoctorProfile,
  getAvailableSlots,
  updateLiveStatus,
  verifyDoctor
} = require('../controllers/doctorController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', getDoctors);
router.get('/:id', getDoctorById);
router.get('/:id/full-profile', getFullDoctorProfile);
router.get('/:id/slots', getAvailableSlots);
router.put('/status', protect, authorize('doctor'), updateLiveStatus);
router.put('/:id/verify', protect, authorize('admin'), verifyDoctor);

module.exports = router;
