const express = require('express');
const router = express.Router();
const {
  getDoctorQueue,
  getPatientQueueStatus,
  callNextToken,
  startConsultation,
  endConsultation,
  markNoShow,
  getWaitingRoomDisplay
} = require('../controllers/queueController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/doctor/:doctorId/live', protect, getDoctorQueue);
router.get('/appointment/:id/status', protect, getPatientQueueStatus);
router.post('/call-next', protect, authorize('doctor', 'receptionist'), callNextToken);
router.post('/start-consultation', protect, authorize('doctor'), startConsultation);
router.post('/end-consultation', protect, authorize('doctor'), endConsultation);
router.post('/no-show', protect, authorize('doctor', 'receptionist'), markNoShow);
router.get('/display/:hospitalId/:departmentId', getWaitingRoomDisplay);

module.exports = router;
