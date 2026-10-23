const express = require('express');
const router = express.Router();
const {
  uploadMiddleware,
  uploadReport,
  getMyReports,
  updateReportVisibility,
  deleteReport
} = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

// Patient reports endpoints
router.post('/', protect, uploadMiddleware, uploadReport);
router.get('/my', protect, getMyReports);
router.put('/:id/visibility', protect, updateReportVisibility);
router.delete('/:id', protect, deleteReport);

module.exports = router;
