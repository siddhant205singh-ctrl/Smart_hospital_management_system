const express = require('express');
const router = express.Router();
const {
  loadDoctorConsultationDocuments,
  viewDocumentFile,
  markDocumentReviewed,
  generateDoctorSummary,
  pinSummaryToNotes
} = require('../controllers/consultationDocumentController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');

// Doctor consultation routes
router.get('/:id/documents', protect, loadDoctorConsultationDocuments);
router.get('/:id/documents/:docId/view', optionalProtect, viewDocumentFile);
router.post('/:id/documents/:docId/review', protect, markDocumentReviewed);
router.post('/:id/documents/summary', protect, generateDoctorSummary);
router.post('/:id/documents/summary/regenerate', protect, (req, res, next) => {
  req.body.forceRegenerate = true;
  generateDoctorSummary(req, res, next);
});
router.post('/:id/notes/pin-summary', protect, pinSummaryToNotes);

module.exports = router;
