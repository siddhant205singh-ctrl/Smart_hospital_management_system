const express = require('express');
const router = express.Router();
const { chatWithAssistant, getChatHistory } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.post('/chat', chatWithAssistant);
router.get('/history', protect, getChatHistory);

module.exports = router;
