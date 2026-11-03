const express = require('express');
const router = express.Router();
const {
  getApprovalRequests,
  getApprovalRequestById,
  streamVerificationDocument,
  approveRequest,
  rejectRequest,
  requestMoreInfo,
  resubmitApplication
} = require('../controllers/approvalController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { uploadVerificationFiles } = require('../middleware/verificationUpload');

// Reviewer routes
router.get('/pending', protect, authorize('hospital_admin', 'admin', 'super_admin'), getApprovalRequests);
router.get('/:id', protect, authorize('hospital_admin', 'admin', 'super_admin'), getApprovalRequestById);
router.get('/document/:docId', protect, streamVerificationDocument);
router.post('/:id/approve', protect, authorize('hospital_admin', 'admin', 'super_admin'), approveRequest);
router.post('/:id/reject', protect, authorize('hospital_admin', 'admin', 'super_admin'), rejectRequest);
router.post('/:id/request-info', protect, authorize('hospital_admin', 'admin', 'super_admin'), requestMoreInfo);

// Applicant resubmission route (can be invoked when status is rejected or info_requested)
router.post('/resubmit', uploadVerificationFiles, resubmitApplication);

module.exports = router;
