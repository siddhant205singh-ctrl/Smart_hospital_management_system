const express = require('express');
const router = express.Router();
const {
  bookAppointment,
  getMyAppointments,
  getAppointmentById,
  cancelAppointment,
  updateTravelTime,
  checkInAppointment
} = require('../controllers/appointmentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, bookAppointment);
router.get('/my', protect, getMyAppointments);
router.get('/:id', protect, getAppointmentById);
router.put('/:id/cancel', protect, cancelAppointment);
router.put('/:id/travel-time', protect, updateTravelTime);
router.post('/:id/check-in', protect, checkInAppointment);

module.exports = router;
