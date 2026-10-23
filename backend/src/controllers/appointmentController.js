const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const QRCode = require('qrcode');
const { recalculateDoctorQueue } = require('../services/waitEngine');
const { sendNotification } = require('../services/notificationService');
const { logAudit } = require('../middleware/auditMiddleware');

// @route   POST /api/appointments
exports.bookAppointment = async (req, res, next) => {
  try {
    const {
      doctorId,
      date,
      timeSlot,
      bookedForFamilyMember,
      symptoms,
      userTravelTimeMinutes
    } = req.body;

    const doctor = await Doctor.findById(doctorId).populate('departmentId').populate('hospitalId').populate('userId');
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    // Determine sequential token number for this doctor on this date
    const countToday = await Appointment.countDocuments({ doctorId, date });
    const tokenNumber = countToday + 1;
    const deptCode = doctor.departmentId?.code || 'GEN';
    const tokenCode = `${deptCode}-${tokenNumber.toString().padStart(3, '0')}`;

    // Create unique QR code payload
    const qrPayload = JSON.stringify({
      tokenCode,
      tokenNumber,
      doctorId: doctor._id,
      patientId: req.user._id,
      date,
      hospitalId: doctor.hospitalId._id
    });
    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload);

    const appointment = await Appointment.create({
      hospitalId: doctor.hospitalId._id,
      departmentId: doctor.departmentId._id,
      doctorId: doctor._id,
      patientId: req.user._id,
      bookedForFamilyMember: bookedForFamilyMember || '',
      date,
      timeSlot,
      tokenNumber,
      tokenCode,
      qrCode: qrCodeDataUrl,
      symptoms: symptoms || '',
      userTravelTimeMinutes: userTravelTimeMinutes || 30,
      status: 'scheduled'
    });

    // Notify patient
    const message = `Your appointment with Dr. ${doctor.userId?.name} is confirmed for ${date} at ${timeSlot}. Your Token is #${tokenNumber} (${tokenCode}).`;
    await sendNotification({
      userId: req.user._id,
      userPhone: req.user.phone,
      userEmail: req.user.email,
      type: 'appointment_booked',
      title: 'Appointment Confirmed',
      message,
      channel: 'all',
      meta: { appointmentId: appointment._id, tokenNumber, tokenCode }
    });

    await logAudit({
      userId: req.user._id,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'BOOK_APPOINTMENT',
      resourceType: 'Appointment',
      resourceId: appointment._id,
      patientId: req.user._id,
      details: { tokenCode, doctorName: doctor.userId?.name, date }
    });

    // Trigger queue recalculation if appointment is for today
    const todayStr = new Date().toISOString().split('T')[0];
    if (date === todayStr) {
      const io = req.app.get('io');
      await recalculateDoctorQueue(doctor._id, io);
    }

    res.status(201).json({
      success: true,
      appointment
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/appointments/my
exports.getMyAppointments = async (req, res, next) => {
  try {
    const appointments = await Appointment.find({ patientId: req.user._id })
      .populate('hospitalId', 'name city address emergencyContact')
      .populate('departmentId', 'name code floor')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' }
      })
      .sort({ date: -1, tokenNumber: 1 });

    res.json({ success: true, count: appointments.length, appointments });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/appointments/:id
exports.getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('hospitalId', 'name city address emergencyContact')
      .populate('departmentId', 'name code floor')
      .populate('patientId', 'name email phone avatar familyMembers')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name email phone avatar' }
      });

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ success: true, appointment });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/appointments/:id/cancel
exports.cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    // Ensure only the patient who booked it, or hospital staff (admin/receptionist/doctor) can cancel
    if (
      appointment.patientId.toString() !== req.user._id.toString() &&
      !['admin', 'receptionist', 'doctor'].includes(req.user.role)
    ) {
      return res.status(403).json({ error: 'Not authorized to cancel this appointment' });
    }

    if (['completed', 'cancelled'].includes(appointment.status)) {
      return res.status(400).json({ error: `Cannot cancel an appointment that is already ${appointment.status}` });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    const io = req.app.get('io');
    if (io) {
      io.to(`appointment_${appointment._id}`).emit('appointment:cancelled', {
        appointmentId: appointment._id,
        status: 'cancelled'
      });
      io.to(`doctor_${appointment.doctorId}`).emit('queue:updated', { doctorId: appointment.doctorId });
      io.emit('queue:refresh', { doctorId: appointment.doctorId });
    }

    await recalculateDoctorQueue(appointment.doctorId, io);

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/appointments/:id/travel-time
exports.updateTravelTime = async (req, res, next) => {
  try {
    const { minutes } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    appointment.userTravelTimeMinutes = Number(minutes);
    appointment.leaveNotificationSent = false; // allow re-trigger with new travel time
    await appointment.save();

    const io = req.app.get('io');
    await recalculateDoctorQueue(appointment.doctorId, io);

    res.json({ success: true, travelTimeMinutes: appointment.userTravelTimeMinutes });
  } catch (error) {
    next(error);
  }
};

// @route   POST /api/appointments/:id/check-in
// Check-in via QR code scan or receptionist desk
exports.checkInAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patientId')
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'name' }
      });

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    appointment.status = 'checked_in';
    appointment.checkInTime = new Date();
    await appointment.save();

    const io = req.app.get('io');
    await recalculateDoctorQueue(appointment.doctorId._id, io);

    await sendNotification({
      userId: appointment.patientId._id,
      userPhone: appointment.patientId.phone,
      type: 'queue_update',
      title: 'Checked In Successfully',
      message: `You are checked in for Token #${appointment.tokenNumber}. Please wait in the OPD lounge.`,
      channel: 'all'
    });

    res.json({ success: true, appointment });
  } catch (error) {
    next(error);
  }
};
