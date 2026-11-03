const express = require('express');
const router = express.Router();
const { chatWithAssistant, getChatHistory, getPatientContext } = require('../controllers/aiController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');

router.post('/chat', optionalProtect, chatWithAssistant);
router.get('/patient-context', protect, getPatientContext);
router.get('/history', protect, getChatHistory);

module.exports = router;
