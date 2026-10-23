const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const ConsultationMetric = require('../models/ConsultationMetric');
const { sendNotification } = require('./notificationService');

/**
 * Calculates rolling average of last N consultations for a doctor
 */
const getDoctorRollingAverage = async (doctorId, lastN = 10) => {
  const metrics = await ConsultationMetric.find({ doctorId })
    .sort({ createdAt: -1 })
    .limit(lastN);

  if (metrics && metrics.length >= 2) {
    const sum = metrics.reduce((acc, m) => acc + m.durationMinutes, 0);
    return Math.round(sum / metrics.length);
  }

  // Fallback to doctor's configured base average or default 15 min
  const doctor = await Doctor.findById(doctorId);
  return doctor?.avgConsultationTime || 15;
};

/**
 * Recalculate waiting times for all upcoming patients in today's doctor queue
 * and push real-time socket events + 'Leave Now' alerts
 */
const recalculateDoctorQueue = async (doctorId, io = null) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const doctor = await Doctor.findById(doctorId).populate('userId');
  if (!doctor) return null;

  const rollingAvg = await getDoctorRollingAverage(doctorId, 10);
  doctor.avgConsultationTime = rollingAvg;
  await doctor.save();

  // Find all appointments for today that are not completed, cancelled, or no-show
  const activeAppointments = await Appointment.find({
    doctorId,
    date: todayStr,
    status: { $in: ['in_consultation', 'called', 'checked_in', 'scheduled'] }
  }).sort({ tokenNumber: 1 }).populate('patientId');

  const inConsultationAppt = activeAppointments.find(a => a.status === 'in_consultation');
  const now = new Date();

  // Calculate elapsed time on current consultation if active
  let activeRemaining = rollingAvg;
  if (inConsultationAppt && inConsultationAppt.consultationStartTime) {
    const elapsedMinutes = Math.floor((now - new Date(inConsultationAppt.consultationStartTime)) / (1000 * 60));
    activeRemaining = Math.max(2, rollingAvg - elapsedMinutes);
  }

  // Queue of patients waiting to be seen
  const waitingPatients = activeAppointments.filter(a => ['checked_in', 'scheduled', 'called'].includes(a.status));

  let accumulatedWait = activeRemaining;

  for (let i = 0; i < waitingPatients.length; i++) {
    const appt = waitingPatients[i];
    const patientsAhead = i; // patients physically ahead in the waiting line

    const estimatedWaitMinutes = i === 0 ? activeRemaining : accumulatedWait;
    const estimatedTurn = new Date(now.getTime() + estimatedWaitMinutes * 60000);

    appt.estimatedTurnTime = estimatedTurn;
    await appt.save();

    // Check "Leave Now" condition:
    // Ideal Departure = estimatedTurn - userTravelTime - checkInBuffer
    const travelTime = appt.userTravelTimeMinutes || 30;
    const checkInBuffer = appt.checkInBufferMinutes || 15;
    const departureDeadline = new Date(estimatedTurn.getTime() - (travelTime + checkInBuffer) * 60000);
    const minutesUntilDeparture = Math.floor((departureDeadline - now) / 60000);

    // If within 15 minutes of departure deadline and not yet checked-in or notified
    if (minutesUntilDeparture <= 15 && !appt.leaveNotificationSent && appt.status === 'scheduled') {
      appt.leaveNotificationSent = true;
      await appt.save();

      const patient = appt.patientId;
      if (patient) {
        const leaveMessage = `SmartCare Alert: Your token #${appt.tokenNumber} with Dr. ${doctor.userId?.name || 'Doctor'} is estimated at ${estimatedTurn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. With ${travelTime}m travel and ${checkInBuffer}m buffer, please LEAVE NOW to arrive smoothly.`;

        await sendNotification({
          userId: patient._id,
          userPhone: patient.phone,
          userEmail: patient.email,
          type: 'leave_now',
          title: 'Time to Leave for Hospital',
          message: leaveMessage,
          channel: 'all',
          meta: { appointmentId: appt._id, tokenNumber: appt.tokenNumber, estimatedTurnTime: estimatedTurn }
        });
      }

      if (io) {
        io.to(`appointment_${appt._id}`).emit('notification:leave_now', {
          appointmentId: appt._id,
          message: leaveMessage,
          estimatedTurnTime: estimatedTurn,
          minutesUntilDeparture
        });
      }
    }

    // Push live queue update to patient socket room
    if (io) {
      io.to(`appointment_${appt._id}`).emit('queue:wait_time_changed', {
        appointmentId: appt._id,
        doctorId: doctor._id,
        tokenNumber: appt.tokenNumber,
        patientsAhead,
        waitMinutes: estimatedWaitMinutes,
        estimatedTurnTime: estimatedTurn,
        doctorStatus: doctor.liveStatus
      });
    }

    accumulatedWait += rollingAvg;
  }

  // Push broadcast to doctor's active console and public TV display
  if (io) {
    const queuePayload = {
      doctorId: doctor._id,
      doctorName: doctor.userId?.name,
      doctorStatus: doctor.liveStatus,
      currentToken: inConsultationAppt?.tokenNumber || 0,
      currentPatientName: inConsultationAppt?.patientId?.name || 'None',
      waitingCount: waitingPatients.length,
      avgConsultationTime: rollingAvg,
      queue: waitingPatients.map((p, idx) => ({
        appointmentId: p._id,
        tokenNumber: p.tokenNumber,
        tokenCode: p.tokenCode,
        patientName: p.bookedForFamilyMember || p.patientId?.name,
        status: p.status,
        patientsAhead: idx,
        estimatedWait: idx === 0 ? activeRemaining : activeRemaining + idx * rollingAvg,
        estimatedTurnTime: p.estimatedTurnTime
      }))
    };

    io.to(`doctor_${doctor._id}`).emit('queue:updated', queuePayload);
    io.to(`hospital_${doctor.hospitalId}`).emit('hospital:queue_summary', queuePayload);
  }

  return {
    rollingAvg,
    waitingCount: waitingPatients.length
  };
};

module.exports = {
  getDoctorRollingAverage,
  recalculateDoctorQueue
};
