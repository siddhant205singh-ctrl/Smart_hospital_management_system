const express = require('express');
const router = express.Router();
const {
  createEmergencyCase,
  getActiveEmergencyCases,
  getEmergencyCaseById,
  activateBreakGlass,
  updateEmergencyCaseStatus,
  getBreakGlassAuditLogs,
  flagBreakGlassLog
} = require('../controllers/emergencyController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.post('/', protect, createEmergencyCase);
router.get('/active', protect, getActiveEmergencyCases);
router.get('/break-glass-logs', protect, authorize('admin'), getBreakGlassAuditLogs);
router.put('/break-glass/:id/flag', protect, authorize('admin'), flagBreakGlassLog);
router.get('/:id', protect, getEmergencyCaseById);
router.post('/:id/break-glass', protect, authorize('doctor', 'admin'), activateBreakGlass);
router.put('/:id/status', protect, authorize('doctor', 'admin'), updateEmergencyCaseStatus);

module.exports = router;
