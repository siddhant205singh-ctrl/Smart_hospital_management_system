const express = require('express');
const router = express.Router();
const { getPatientTimeline, createRecord, getRecordSummary } = require('../controllers/recordController');
const { protect } = require('../middleware/authMiddleware');

router.get('/patient/:patientId', protect, getPatientTimeline);
router.post('/', protect, createRecord);
router.get('/:id/summary', protect, getRecordSummary);

module.exports = router;
