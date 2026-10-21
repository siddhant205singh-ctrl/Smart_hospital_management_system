const express = require('express');
const router = express.Router();
const { getDoctors, getDoctorById, getAvailableSlots, updateLiveStatus } = require('../controllers/doctorController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', getDoctors);
router.get('/:id', getDoctorById);
router.get('/:id/slots', getAvailableSlots);
router.put('/status', protect, authorize('doctor'), updateLiveStatus);

module.exports = router;
