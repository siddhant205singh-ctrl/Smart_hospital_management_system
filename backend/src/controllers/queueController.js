const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const ConsultationMetric = require('../models/ConsultationMetric');
const { recalculateDoctorQueue, getDoctorRollingAverage } = require('../services/waitEngine');
const { sendNotification } = require('../services/notificationService');

// @route   GET /api/queue/doctor/:doctorId/live
exports.getDoctorQueue = async (req, res, next) => {
  try {
    const { doctorId } = req.params;
    const todayStr = new Date().toISOString().split('T')[0];

    const doctor = await Doctor.findById(doctorId).populate('userId', 'name email avatar');
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    const appointments = await Appointment.find({
      doctorId,
      date: todayStr
    }).populate('patientId', 'name phone email avatar familyMembers')
      .sort({ tokenNumber: 1 });

    const inConsultation = appointments.find(a => a.status === 'in_consultation');
    const waiting = appointments.filter(a => ['checked_in', 'scheduled', 'called'].includes(a.status));
    const completed = appointments.filter(a => a.status === 'completed');
    const noShow = appointments.filter(a => a.status === 'no_show');

    const rollingAvg = await getDoctorRollingAverage(doctorId, 10);

    res.json({
      success: true,
      doctor: {
        id: doctor._id,
        name: doctor.userId?.name,
        specialty: doctor.specialty,
        roomNumber: doctor.roomNumber,
        liveStatus: doctor.liveStatus,
        avgConsultationTime: rollingAvg
      },
      currentPatient: inConsultation || null,
      waitingQueue: waiting,
      completedCount: completed.length,
      noShowCount: noShow.length,
      totalToday: appointments.length
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/queue/appointment/:id/status
// Patient Live Queue Tracker details
exports.getPatientQueueStatus = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('hospitalId', 'name city emergencyContact')
      .populate('departmentId', 'name code floor')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name avatar' }
      });

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    const doctorId = appointment.doctorId._id;
    const date = appointment.date;

    // Fetch all active appointments for this doctor on this day
    const allActive = await Appointment.find({
      doctorId,
      date,
      status: { $in: ['in_consultation', 'called', 'checked_in', 'scheduled'] }
    }).sort({ tokenNumber: 1 });

    const currentConsulting = allActive.find(a => a.status === 'in_consultation');
    const currentToken = currentConsulting?.tokenNumber || 0;

    // Count how many patients ahead
    const ahead = allActive.filter(a => a.tokenNumber < appointment.tokenNumber);
    const patientsAhead = ahead.length;

    const rollingAvg = await getDoctorRollingAverage(doctorId, 10);
    const estimatedWaitMinutes = patientsAhead * rollingAvg;

    res.json({
      success: true,
      appointment,
      queueStatus: {
        currentToken,
        myToken: appointment.tokenNumber,
        tokenCode: appointment.tokenCode,
        patientsAhead,
        status: appointment.status,
        estimatedWaitMinutes,
        estimatedTurnTime: appointment.estimatedTurnTime,
        doctorStatus: appointment.doctorId.liveStatus,
        roomNumber: appointment.doctorId.roomNumber
      }
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/queue/call-next
exports.callNextToken = async (req, res, next) => {
  try {
    const { doctorId } = req.body;
    const todayStr = new Date().toISOString().split('T')[0];

    const doctor = await Doctor.findById(doctorId).populate('userId', 'name');
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    // Find next checked-in or scheduled patient
    const nextPatient = await Appointment.findOne({
      doctorId,
      date: todayStr,
      status: { $in: ['checked_in', 'scheduled'] }
    }).sort({ tokenNumber: 1 }).populate('patientId');

    if (!nextPatient) {
      return res.status(400).json({ error: 'No waiting patients in queue' });
    }

    nextPatient.status = 'called';
    await nextPatient.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`appointment_${nextPatient._id}`).emit('queue:token_called', {
        appointmentId: nextPatient._id,
        tokenNumber: nextPatient.tokenNumber,
        tokenCode: nextPatient.tokenCode,
        roomNumber: doctor.roomNumber,
        doctorName: doctor.userId?.name
      });
      await recalculateDoctorQueue(doctorId, io);
    }

    await sendNotification({
      userId: nextPatient.patientId._id,
      userPhone: nextPatient.patientId.phone,
      type: 'token_called',
      title: 'Your Token is Called!',
      message: `Token #${nextPatient.tokenNumber} is called! Please proceed to Room ${doctor.roomNumber} for Dr. ${doctor.userId?.name}.`,
      channel: 'all'
    });

    res.json({ success: true, calledAppointment: nextPatient });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/queue/start-consultation
exports.startConsultation = async (req, res, next) => {
  try {
    const { appointmentId } = req.body;
    const appointment = await Appointment.findById(appointmentId).populate('doctorId');
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    appointment.status = 'in_consultation';
    appointment.consultationStartTime = new Date();
    await appointment.save();

    const doctor = await Doctor.findById(appointment.doctorId._id);
    doctor.liveStatus = 'in_consultation';
    doctor.currentAppointmentId = appointment._id;
    await doctor.save();

    const io = req.app.get('io');
    await recalculateDoctorQueue(appointment.doctorId._id, io);

    res.json({ success: true, appointment });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/queue/end-consultation
exports.endConsultation = async (req, res, next) => {
  try {
    const { appointmentId, doctorNotes, prescription, vitals } = req.body;
    const appointment = await Appointment.findById(appointmentId).populate('patientId');
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    const endTime = new Date();
    const startTime = appointment.consultationStartTime || new Date(endTime.getTime() - 15 * 60000);
    const durationMinutes = Math.max(1, Math.round((endTime - new Date(startTime)) / (1000 * 60)));

    appointment.status = 'completed';
    appointment.consultationEndTime = endTime;
    appointment.actualDurationMinutes = durationMinutes;
    if (doctorNotes) appointment.doctorNotes = doctorNotes;
    if (prescription) appointment.prescription = prescription;
    if (vitals) appointment.vitals = vitals;
    await appointment.save();

    // Record metric for rolling average calculation
    await ConsultationMetric.create({
      doctorId: appointment.doctorId,
      appointmentId: appointment._id,
      durationMinutes
    });

    const doctor = await Doctor.findById(appointment.doctorId);
    doctor.liveStatus = 'available';
    doctor.currentAppointmentId = null;
    await doctor.save();

    const io = req.app.get('io');
    await recalculateDoctorQueue(appointment.doctorId, io);

    res.json({
      success: true,
      durationMinutes,
      appointment
    });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/queue/no-show
exports.markNoShow = async (req, res, next) => {
  try {
    const { appointmentId } = req.body;
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    appointment.status = 'no_show';
    await appointment.save();

    const io = req.app.get('io');
    await recalculateDoctorQueue(appointment.doctorId, io);

    res.json({ success: true, message: 'Patient marked as no-show' });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/queue/display/:hospitalId/:departmentId
// Public Waiting Room TV Display Feed
exports.getWaitingRoomDisplay = async (req, res, next) => {
  try {
    const { hospitalId, departmentId } = req.params;
    const todayStr = new Date().toISOString().split('T')[0];

    const doctors = await Doctor.find({ hospitalId, departmentId })
      .populate('userId', 'name avatar')
      .populate('departmentId', 'name code floor');

    const feeds = [];
    for (const doc of doctors) {
      const active = await Appointment.find({
        doctorId: doc._id,
        date: todayStr,
        status: { $in: ['in_consultation', 'called', 'checked_in', 'scheduled'] }
      }).sort({ tokenNumber: 1 });

      const current = active.find(a => a.status === 'in_consultation');
      const called = active.find(a => a.status === 'called');
      const nextUp = active.filter(a => ['checked_in', 'scheduled'].includes(a.status)).slice(0, 4);

      feeds.push({
        doctorId: doc._id,
        doctorName: doc.userId?.name,
        roomNumber: doc.roomNumber,
        status: doc.liveStatus,
        currentToken: current ? current.tokenNumber : (called ? called.tokenNumber : '-'),
        tokenCode: current ? current.tokenCode : (called ? called.tokenCode : '-'),
        isCalling: !!called,
        nextTokens: nextUp.map(n => ({ token: n.tokenNumber, code: n.tokenCode }))
      });
    }

    res.json({ success: true, feeds });
  } catch (error) {
    next(error);
  }
};
