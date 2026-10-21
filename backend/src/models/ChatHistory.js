const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  messages: [{
    sender: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    text: { type: String, required: true },
    isEmergency: { type: Boolean, default: false },
    toolCalls: [{ type: Object }],
    timestamp: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
