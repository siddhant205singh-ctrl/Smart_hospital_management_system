const express = require('express');
const router = express.Router();
const { getMyGrants, grantConsent, revokeConsent, getAuditLog } = require('../controllers/consentController');
const { protect } = require('../middleware/authMiddleware');

router.get('/my-grants', protect, getMyGrants);
router.post('/grant', protect, grantConsent);
router.post('/:id/revoke', protect, revokeConsent);
router.get('/audit-log', protect, getAuditLog);

module.exports = router;
