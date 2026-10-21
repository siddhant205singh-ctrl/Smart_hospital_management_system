const express = require('express');
const router = express.Router();
const { getMyNotifications, markAsRead, sendTestSms } = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getMyNotifications);
router.put('/:id/read', protect, markAsRead);
router.post('/test-sms', sendTestSms);

module.exports = router;
