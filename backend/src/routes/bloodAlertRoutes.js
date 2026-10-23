const express = require('express');
const router = express.Router();
const {
  raiseBloodAlert,
  getActiveAlerts,
  getAlertStats,
  respondToAlert,
  fulfillAlert
} = require('../controllers/bloodAlertController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/active', getActiveAlerts);
router.post('/', protect, authorize('blood_bank_officer', 'doctor', 'admin'), raiseBloodAlert);
router.get('/:id/stats', protect, authorize('blood_bank_officer', 'doctor', 'admin'), getAlertStats);
router.post('/:id/respond', protect, respondToAlert);
router.put('/:id/fulfill', protect, authorize('blood_bank_officer', 'doctor', 'admin'), fulfillAlert);

module.exports = router;
