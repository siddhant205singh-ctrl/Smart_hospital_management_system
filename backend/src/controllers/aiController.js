const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const User = require('../models/User');
const QRCode = require('qrcode');
const { runAgentTurn } = require('../services/aiAgentEngine');
const { executeTool } = require('../services/aiToolService');
const { sendNotification } = require('../services/notificationService');
const { logAudit } = require('../middleware/auditMiddleware');

/**
 * Helper: Find or create an active chat session
 */
async function resolveSession(sessionId, user, visitorId) {
  let session = null;
  if (sessionId) {
    session = await ChatSession.findById(sessionId);
  }

  if (!session) {
    session = await ChatSession.create({
      userId: user?._id || null,
      visitorId: visitorId || (user ? null : `guest_${Date.now()}`),
      role: user?.role || 'visitor',
      title: 'New Health Consultation'
    });
  }

  return session;
}

// @route   POST /api/ai/chat
// @desc    Standard JSON turn with agent loop, multi-turn history & tool execution
exports.chatWithAssistant = async (req, res, next) => {
  try {
    const { message, sessionId, visitorId, currentSymptoms, language = 'en' } = req.body;
    const user = req.user || null;
    const role = user?.role || 'visitor';

    if (!message && (!currentSymptoms || currentSymptoms.length === 0)) {
      return res.status(400).json({ error: 'Please enter a message or select symptoms' });
    }

    const combinedInput = `${message || ''} ${Array.isArray(currentSymptoms) ? currentSymptoms.join(', ') : (currentSymptoms || '')}`.trim();

    // 1. Resolve Session
    const session = await resolveSession(sessionId, user, visitorId);

    // 2. Fetch past conversation turns for this session
    const pastMessages = await ChatMessage.find({ sessionId: session._id })
      .sort({ createdAt: 1 })
      .limit(10);

    // 3. Save User Message
    const userMessageDoc = await ChatMessage.create({
      sessionId: session._id,
      userId: user?._id || null,
      sender: 'user',
      text: combinedInput
    });

    // 4. Update session title if first turn
    if (session.title === 'New Health Consultation' && combinedInput.length > 3) {
      session.title = combinedInput.substring(0, 35) + (combinedInput.length > 35 ? '...' : '');
      await session.save();
    }

    // 5. Run Agent Engine Turn
    const sessionContext = {
      user,
      role,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1'
    };

    const agentResult = await runAgentTurn({
      message: combinedInput,
      history: pastMessages,
      user,
      role,
      language,
      sessionContext
    });

    // 6. Save Assistant Response in DB
    const assistantMessageDoc = await ChatMessage.create({
      sessionId: session._id,
      userId: user?._id || null,
      sender: 'assistant',
      text: agentResult.reply,
      isEmergency: agentResult.isEmergency,
      toolCalls: agentResult.toolCalls,
      quickChips: agentResult.quickChips,
      cards: agentResult.cards
    });

    res.json({
      success: true,
      sessionId: session._id,
      reply: agentResult.reply,
      isEmergency: agentResult.isEmergency,
      toolCalls: agentResult.toolCalls,
      cards: agentResult.cards,
      quickChips: agentResult.quickChips,
      messageId: assistantMessageDoc._id
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/ai/chat/stream
// @desc    Server-Sent Events (SSE) streaming assistant turn with live token stream
exports.chatWithAssistantStream = async (req, res, next) => {
  try {
    const { message, sessionId, visitorId, currentSymptoms, language = 'en' } = req.body;
    const user = req.user || null;
    const role = user?.role || 'visitor';

    if (!message && (!currentSymptoms || currentSymptoms.length === 0)) {
      return res.status(400).json({ error: 'Please enter a message or select symptoms' });
    }

    const combinedInput = `${message || ''} ${Array.isArray(currentSymptoms) ? currentSymptoms.join(', ') : (currentSymptoms || '')}`.trim();

    // Prepare SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (event, data) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // 1. Resolve Session
    const session = await resolveSession(sessionId, user, visitorId);
    sendEvent('session', { sessionId: session._id });

    // 2. Fetch past conversation turns
    const pastMessages = await ChatMessage.find({ sessionId: session._id })
      .sort({ createdAt: 1 })
      .limit(10);

    // 3. Save User Message
    await ChatMessage.create({
      sessionId: session._id,
      userId: user?._id || null,
      sender: 'user',
      text: combinedInput
    });

    if (session.title === 'New Health Consultation' && combinedInput.length > 3) {
      session.title = combinedInput.substring(0, 35) + (combinedInput.length > 35 ? '...' : '');
      await session.save();
    }

    // 4. Run Agent Engine
    const sessionContext = {
      user,
      role,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1'
    };

    sendEvent('status', { message: 'Analyzing healthcare query...' });

    const agentResult = await runAgentTurn({
      message: combinedInput,
      history: pastMessages,
      user,
      role,
      language,
      sessionContext,
      onStreamChunk: (chunk) => {
        sendEvent('status', chunk);
      }
    });

    // Stream out words with a slight realistic cadence
    const words = agentResult.reply.split(' ');
    for (let i = 0; i < words.length; i += 3) {
      const chunk = words.slice(i, i + 3).join(' ') + ' ';
      sendEvent('token', { text: chunk });
    }

    // 5. Save Assistant Turn
    const assistantMessageDoc = await ChatMessage.create({
      sessionId: session._id,
      userId: user?._id || null,
      sender: 'assistant',
      text: agentResult.reply,
      isEmergency: agentResult.isEmergency,
      toolCalls: agentResult.toolCalls,
      quickChips: agentResult.quickChips,
      cards: agentResult.cards
    });

    sendEvent('complete', {
      reply: agentResult.reply,
      isEmergency: agentResult.isEmergency,
      toolCalls: agentResult.toolCalls,
      cards: agentResult.cards,
      quickChips: agentResult.quickChips,
      messageId: assistantMessageDoc._id
    });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    console.error('SSE Stream Error:', error);
    if (!res.headersSent) {
      next(error);
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  }
};

// @route   POST /api/ai/execute-action
// @desc    Executes confirmed action (e.g. appointment booking) after explicit user confirmation in UI
exports.executeAction = async (req, res, next) => {
  try {
    const { actionType, payload, sessionId } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Please sign in to execute clinical booking actions.' });
    }

    if (actionType === 'book_appointment') {
      const { doctorId, date, timeSlot, bookedForFamilyMember, symptoms } = payload || {};
      if (!doctorId || !date || !timeSlot) {
        return res.status(400).json({ error: 'Missing doctor, date, or time slot for booking.' });
      }

      const doctor = await Doctor.findById(doctorId).populate('departmentId').populate('hospitalId').populate('userId');
      if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

      // Check slot availability
      const existing = await Appointment.findOne({
        doctorId,
        date,
        timeSlot,
        status: { $nin: ['cancelled'] }
      });
      if (existing) {
        return res.status(409).json({ error: 'This appointment slot was just taken. Please choose another slot.' });
      }

      // Sequential Token Generation
      const countToday = await Appointment.countDocuments({ doctorId, date });
      const tokenNumber = countToday + 1;
      const deptCode = doctor.departmentId?.code || 'GEN';
      const tokenCode = `${deptCode}-${tokenNumber.toString().padStart(3, '0')}`;

      // QR Code Generation
      const qrPayload = JSON.stringify({
        tokenCode,
        tokenNumber,
        doctorId: doctor._id,
        patientId: user._id,
        date,
        hospitalId: doctor.hospitalId._id
      });
      const qrCodeDataUrl = await QRCode.toDataURL(qrPayload);

      const appointment = await Appointment.create({
        hospitalId: doctor.hospitalId._id,
        departmentId: doctor.departmentId._id,
        doctorId: doctor._id,
        patientId: user._id,
        bookedForFamilyMember: bookedForFamilyMember || '',
        date,
        timeSlot,
        tokenNumber,
        tokenCode,
        qrCode: qrCodeDataUrl,
        symptoms: symptoms || 'Booked via HealthMS AI',
        userTravelTimeMinutes: 30,
        status: 'scheduled'
      });

      // Send confirmation notification
      await sendNotification({
        userId: user._id,
        userPhone: user.phone,
        userEmail: user.email,
        type: 'appointment_booked',
        title: 'Appointment Confirmed via HealthMS AI',
        message: `Your booking with Dr. ${doctor.userId?.name} is confirmed for ${date} at ${timeSlot}. Token #${tokenNumber} (${tokenCode}).`,
        channel: 'all',
        meta: { appointmentId: appointment._id, tokenNumber, tokenCode }
      });

      // Audit Log
      await logAudit({
        userId: user._id,
        userName: user.name,
        userRole: user.role,
        action: 'AI_ACTION:BOOK_APPOINTMENT',
        resourceType: 'Appointment',
        resourceId: appointment._id,
        patientId: user._id,
        details: { doctorId: doctor._id, date, timeSlot, tokenCode },
        ipAddress: req.ip || '127.0.0.1'
      });

      // Record confirmation message in session if provided
      if (sessionId) {
        await ChatMessage.create({
          sessionId,
          userId: user._id,
          sender: 'assistant',
          text: `✅ **Appointment Confirmed!**\n\nYour consultation with **Dr. ${doctor.userId?.name}** (${doctor.specialty}) has been confirmed for **${date}** at **${timeSlot}**.\n\n• **Token**: #${tokenNumber} (${tokenCode})\n• **Hospital**: ${doctor.hospitalId?.name}\n• **Room**: ${doctor.roomNumber}\n\nYou can track live queue status anytime in **Live Queue Tracker**!`,
          cards: [{
            type: 'appointment_success',
            appointment: {
              id: appointment._id,
              doctorName: `Dr. ${doctor.userId?.name}`,
              specialty: doctor.specialty,
              date,
              timeSlot,
              tokenCode,
              tokenNumber,
              roomNumber: doctor.roomNumber,
              qrCode: qrCodeDataUrl
            }
          }]
        });
      }

      return res.json({
        success: true,
        appointment: {
          id: appointment._id,
          doctorName: `Dr. ${doctor.userId?.name}`,
          specialty: doctor.specialty,
          date,
          timeSlot,
          tokenCode,
          tokenNumber,
          roomNumber: doctor.roomNumber,
          qrCode: qrCodeDataUrl
        }
      });
    }

    return res.status(400).json({ error: `Action type ${actionType} not supported` });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/ai/patient-context
// @desc    Retrieve patient health profile with privacy check
exports.getPatientContext = async (req, res, next) => {
  try {
    const sessionContext = {
      user: req.user,
      role: req.user.role,
      ipAddress: req.ip || '127.0.0.1'
    };

    const context = await executeTool('get_patient_context', {}, sessionContext);
    res.json({
      success: true,
      ...context
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/ai/sessions
// @desc    Get user's chat sessions
exports.getSessions = async (req, res, next) => {
  try {
    const filter = req.user ? { userId: req.user._id } : { visitorId: req.query.visitorId || 'non_existent' };
    const sessions = await ChatSession.find(filter).sort({ updatedAt: -1 }).limit(20);
    res.json({ success: true, sessions });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/ai/sessions
// @desc    Create a fresh new session
exports.createSession = async (req, res, next) => {
  try {
    const session = await ChatSession.create({
      userId: req.user?._id || null,
      visitorId: req.user ? null : (req.body.visitorId || `guest_${Date.now()}`),
      role: req.user?.role || 'visitor',
      title: 'New Health Consultation'
    });
    res.json({ success: true, session });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/ai/sessions/:id/messages
// @desc    Get messages for a specific session
exports.getSessionMessages = async (req, res, next) => {
  try {
    const messages = await ChatMessage.find({ sessionId: req.params.id }).sort({ createdAt: 1 });
    res.json({ success: true, messages });
  } catch (error) {
    next(error);
  }
};

// @route   DELETE /api/ai/sessions/:id
// @desc    Clear/Delete a chat session
exports.deleteSession = async (req, res, next) => {
  try {
    const filter = { _id: req.params.id };
    if (req.user) {
      filter.userId = req.user._id;
    }
    await ChatSession.deleteOne(filter);
    await ChatMessage.deleteMany({ sessionId: req.params.id });
    res.json({ success: true, message: 'Session deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/ai/history (Backwards compatibility)
exports.getChatHistory = async (req, res, next) => {
  try {
    const session = await ChatSession.findOne({ userId: req.user._id }).sort({ updatedAt: -1 });
    if (!session) return res.json({ success: true, messages: [] });
    const messages = await ChatMessage.find({ sessionId: session._id }).sort({ createdAt: 1 });
    res.json({ success: true, messages });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/ai/settings
// @desc    Update assistant privacy settings & consent notice
exports.updateAssistantSettings = async (req, res, next) => {
  try {
    const { useHealthDataInAssistant, assistantConsentNoticeDismissed } = req.body;
    const user = await User.findById(req.user._id);

    if (useHealthDataInAssistant !== undefined) {
      user.privacySettings.useHealthDataInAssistant = Boolean(useHealthDataInAssistant);
    }
    if (assistantConsentNoticeDismissed !== undefined) {
      user.privacySettings.assistantConsentNoticeDismissed = Boolean(assistantConsentNoticeDismissed);
    }

    await user.save();
    res.json({
      success: true,
      privacySettings: user.privacySettings
    });
  } catch (error) {
    next(error);
  }
};
