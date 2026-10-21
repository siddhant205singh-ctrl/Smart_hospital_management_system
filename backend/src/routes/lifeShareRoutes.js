const express = require('express');
const router = express.Router();
const {
  registerDonor,
  getMyDonorProfile,
  recordVerifiedDonation,
  getPublicBloodAvailability,
  getHospitalInventory,
  createBloodRequest,
  getBloodRequests,
  allocateBloodUnits,
  linkFamilyMember,
  verifyFamilyLink,
  getMyCommunityCard,
  verifyCardQr,
  applyCommunityDiscount
} = require('../controllers/lifeShareController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Donors
router.post('/donors/register', protect, registerDonor);
router.get('/donors/me', protect, getMyDonorProfile);

// Donations (Blood Bank Officer & Admin only)
router.post('/donations', protect, authorize('blood_bank_officer', 'admin'), recordVerifiedDonation);

// Inventory
router.get('/blood-inventory/public', getPublicBloodAvailability);
router.get('/blood-inventory/hospital/:hospitalId', protect, authorize('blood_bank_officer', 'admin', 'doctor'), getHospitalInventory);

// Blood Requests
router.post('/blood-requests', protect, authorize('doctor', 'blood_bank_officer', 'admin'), createBloodRequest);
router.get('/blood-requests', protect, authorize('doctor', 'blood_bank_officer', 'admin'), getBloodRequests);
router.post('/blood-requests/:id/allocate', protect, authorize('blood_bank_officer', 'admin'), allocateBloodUnits);

// Family Links
router.post('/family-links', protect, linkFamilyMember);
router.put('/family-links/:id/verify', protect, authorize('blood_bank_officer', 'admin'), verifyFamilyLink);

// Community Card & Discount Engine
router.get('/community-cards/me', protect, getMyCommunityCard);
router.post('/community-cards/verify-qr', protect, authorize('receptionist', 'admin'), verifyCardQr);
router.post('/discount-applications/apply', protect, authorize('receptionist', 'admin'), applyCommunityDiscount);

module.exports = router;
