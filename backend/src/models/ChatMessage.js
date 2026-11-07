const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatSession', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  sender: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  text: { type: String, required: true },
  isEmergency: { type: Boolean, default: false },
  toolCalls: [{
    toolName: String,
    args: mongoose.Schema.Types.Mixed,
    result: mongoose.Schema.Types.Mixed
  }],
  actionConfirmation: {
    actionType: { type: String, default: '' }, // e.g., 'book_appointment'
    payload: { type: mongoose.Schema.Types.Mixed, default: null },
    status: { type: String, enum: ['none', 'pending', 'confirmed', 'cancelled'], default: 'none' }
  },
  quickChips: [{ type: String }],
  cards: [{ type: mongoose.Schema.Types.Mixed }] // Doctor cards, timeline cards, emergency cards
}, {
  timestamps: true
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
