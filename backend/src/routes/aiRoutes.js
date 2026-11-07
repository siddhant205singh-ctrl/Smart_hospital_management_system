const express = require('express');
const router = express.Router();
const {
  chatWithAssistant,
  chatWithAssistantStream,
  executeAction,
  getPatientContext,
  getSessions,
  createSession,
  getSessionMessages,
  deleteSession,
  getChatHistory,
  updateAssistantSettings
} = require('../controllers/aiController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');

// Chat & Streaming
router.post('/chat', optionalProtect, chatWithAssistant);
router.post('/chat/stream', optionalProtect, chatWithAssistantStream);
router.post('/execute-action', protect, executeAction);

// Sessions & History
router.get('/sessions', optionalProtect, getSessions);
router.post('/sessions', optionalProtect, createSession);
router.get('/sessions/:id/messages', optionalProtect, getSessionMessages);
router.delete('/sessions/:id', optionalProtect, deleteSession);
router.get('/history', protect, getChatHistory);

// Patient Context & Assistant Settings
router.get('/patient-context', protect, getPatientContext);
router.put('/settings', protect, updateAssistantSettings);

module.exports = router;
