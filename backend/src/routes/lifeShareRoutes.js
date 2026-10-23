const express = require('express');
const router = express.Router();
const {
  registerDonor,
  getMyDonorProfile,
  getDonorCertificate,
  recordVerifiedDonation,
  getPublicBloodAvailability,
  getHospitalInventory,
  createBloodRequest,
  getBloodRequests,
  allocateBloodUnits,
  linkFamilyMember,
  verifyFamilyLink,
  getFastTrackSettings,
  updateFastTrackSettings,
  getFastTrackAuditLogs
} = require('../controllers/lifeShareController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Donors Registry & Certificate
router.post('/donors/register', protect, registerDonor);
router.get('/donors/me', protect, getMyDonorProfile);
router.get('/donors/certificate', protect, getDonorCertificate);

// Verified Donations (Blood Bank Officer & Admin)
router.post('/donations', protect, authorize('blood_bank_officer', 'admin'), recordVerifiedDonation);

// Inventory
router.get('/blood-inventory/public', getPublicBloodAvailability);
router.get('/blood-inventory/hospital/:hospitalId', protect, authorize('blood_bank_officer', 'admin', 'doctor'), getHospitalInventory);

// Blood Requests & Allocation (Clinical Urgency Governed)
router.post('/blood-requests', protect, authorize('doctor', 'blood_bank_officer', 'admin'), createBloodRequest);
router.get('/blood-requests', protect, authorize('doctor', 'blood_bank_officer', 'admin'), getBloodRequests);
router.post('/blood-requests/:id/allocate', protect, authorize('blood_bank_officer', 'admin'), allocateBloodUnits);

// Family Links
router.post('/family-links', protect, linkFamilyMember);
router.put('/family-links/:id/verify', protect, authorize('blood_bank_officer', 'admin'), verifyFamilyLink);

// Donor Family Fast-Track Settings & Governance
router.get('/fast-track/settings', protect, getFastTrackSettings);
router.put('/fast-track/settings', protect, authorize('admin'), updateFastTrackSettings);
router.get('/fast-track/audit-logs', protect, authorize('admin'), getFastTrackAuditLogs);

module.exports = router;
