const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { getMyProfile, updateMyProfile, getProfileCompleteness, changePassword, exportProfileData } = require('../controllers/profileController');

router.get('/me', protect, getMyProfile);
router.put('/me', protect, updateMyProfile);
router.get('/completeness', protect, getProfileCompleteness);
router.put('/change-password', protect, changePassword);
router.get('/export', protect, exportProfileData);

module.exports = router;
