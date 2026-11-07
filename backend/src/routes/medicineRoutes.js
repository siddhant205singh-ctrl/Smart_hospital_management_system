const express = require('express');
const router = express.Router();
const {
  getMedicines,
  checkAckStatus,
  recordAck,
  createManualMedicine,
  scanUploadMiddleware,
  scanMedicine,
  confirmScan,
  updateMedicine,
  toggleMedicineStatus,
  updateMedicineVisibility,
  deleteMedicine,
  deleteMedicinePhoto,
  exportMedicinesPdf
} = require('../controllers/medicineController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getMedicines);
router.get('/export-pdf', exportMedicinesPdf);
router.get('/scan/ack-status', checkAckStatus);
router.post('/scan/ack', recordAck);
router.post('/manual', createManualMedicine);
router.post('/scan', scanUploadMiddleware, scanMedicine);
router.post('/scan/confirm', confirmScan);
router.put('/:id', updateMedicine);
router.patch('/:id/status', toggleMedicineStatus);
router.patch('/:id/visibility', updateMedicineVisibility);
router.delete('/:id', deleteMedicine);
router.delete('/:id/photo', deleteMedicinePhoto);

module.exports = router;
