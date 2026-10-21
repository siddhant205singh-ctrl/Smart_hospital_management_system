const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const { logAudit } = require('../middleware/auditMiddleware');

// @route   GET /api/doctors
// Multi-hospital doctor search & filtering
exports.getDoctors = async (req, res, next) => {
  try {
    const { specialty, hospitalId, language, liveStatus, search } = req.query;
    let query = {};

    if (specialty) {
      query.specialty = new RegExp(specialty, 'i');
    }
    if (hospitalId) {
      query.hospitalId = hospitalId;
    }
    if (language) {
      query.languages = { $in: [new RegExp(language, 'i')] };
    }
    if (liveStatus) {
      query.liveStatus = liveStatus;
    }

    let doctors = await Doctor.find(query)
      .populate('userId', 'name email phone avatar')
      .populate('hospitalId', 'name city address emergencyContact')
      .populate('departmentId', 'name code floor');

    if (search) {
      const term = search.toLowerCase();
      doctors = doctors.filter(doc => 
        doc.userId?.name?.toLowerCase().includes(term) ||
        doc.specialty?.toLowerCase().includes(term) ||
        doc.hospitalId?.name?.toLowerCase().includes(term)
      );
    }

    res.json({
      success: true,
      count: doctors.length,
      doctors
    });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/doctors/:id
exports.getDoctorById = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('userId', 'name email phone avatar')
      .populate('hospitalId', 'name city address emergencyContact')
      .populate('departmentId', 'name code floor');

    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    res.json({ success: true, doctor });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/doctors/:id/slots
exports.getAvailableSlots = async (req, res, next) => {
  try {
    const { date } = req.query; // YYYY-MM-DD
    if (!date) return res.status(400).json({ error: 'Please provide date query parameter (YYYY-MM-DD)' });

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    // Generate slots from 09:00 to 17:00 with slot duration (e.g., 15 mins)
    const dayOfWeek = new Date(date).getDay();
    const schedule = doctor.weeklySchedule.find(s => s.dayOfWeek === dayOfWeek) || {
      startTime: '09:00',
      endTime: '17:00',
      slotDuration: 15
    };

    const slots = [];
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);

    let current = startH * 60 + startM;
    const end = endH * 60 + endM;

    // Fetch existing appointments on this date
    const booked = await Appointment.find({
      doctorId: doctor._id,
      date,
      status: { $nin: ['cancelled', 'no_show'] }
    }).select('timeSlot tokenNumber');

    const bookedSlots = booked.map(b => b.timeSlot);

    while (current + schedule.slotDuration <= end) {
      const h1 = Math.floor(current / 60).toString().padStart(2, '0');
      const m1 = (current % 60).toString().padStart(2, '0');
      const nextTime = current + schedule.slotDuration;
      const h2 = Math.floor(nextTime / 60).toString().padStart(2, '0');
      const m2 = (nextTime % 60).toString().padStart(2, '0');

      const timeSlotStr = `${h1}:${m1} - ${h2}:${m2}`;
      const isBooked = bookedSlots.includes(timeSlotStr);

      slots.push({
        timeSlot: timeSlotStr,
        available: !isBooked
      });

      current += schedule.slotDuration;
    }

    res.json({
      success: true,
      date,
      totalSlots: slots.length,
      availableSlotsCount: slots.filter(s => s.available).length,
      slots
    });
  } catch (error) {
    next(error);
  }
};

// @route   PUT /api/doctors/status
exports.updateLiveStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const doctor = await Doctor.findOne({ userId: req.user._id });
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });

    doctor.liveStatus = status;
    await doctor.save();

    // Broadcast status change via socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit('doctor:status_changed', { doctorId: doctor._id, status });
    }

    res.json({ success: true, liveStatus: doctor.liveStatus });
  } catch (error) {
    next(error);
  }
};
