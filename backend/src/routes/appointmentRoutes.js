const express = require('express');
const router = express.Router();
const {
  bookAppointment,
  getMyAppointments,
  getAppointmentById,
  cancelAppointment,
  updateTravelTime,
  checkInAppointment
} = require('../controllers/appointmentController');
const {
  getAppointmentDocuments,
  attachExistingDocuments,
  uploadAppointmentDocument,
  removeAppointmentDocument,
  documentUploadMiddleware,
  createAppointmentConsent,
  revokeAppointmentConsent
} = require('../controllers/consultationDocumentController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, bookAppointment);
router.get('/my', protect, getMyAppointments);
router.get('/:id', protect, getAppointmentById);
router.put('/:id/cancel', protect, cancelAppointment);
router.put('/:id/travel-time', protect, updateTravelTime);
router.post('/:id/check-in', protect, checkInAppointment);

// Pre-consultation document sharing & single consent endpoints
router.get('/:id/documents', protect, getAppointmentDocuments);
router.post('/:id/documents/select', protect, attachExistingDocuments);
router.post('/:id/documents/upload', protect, documentUploadMiddleware, uploadAppointmentDocument);
router.delete('/:id/documents/:docId', protect, removeAppointmentDocument);
router.post('/:id/consent', protect, createAppointmentConsent);
router.post('/:id/consent/revoke', protect, revokeAppointmentConsent);

module.exports = router;
