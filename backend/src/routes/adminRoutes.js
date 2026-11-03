const express = require('express');
const router = express.Router();
const { getHospitalOverview, getAnalytics, createWalkInToken } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/overview', protect, authorize('admin', 'receptionist', 'hospital'), getHospitalOverview);
router.get('/analytics', protect, authorize('admin', 'receptionist', 'hospital'), getAnalytics);
router.post('/walk-in', protect, authorize('admin', 'receptionist', 'hospital'), createWalkInToken);

module.exports = router;
