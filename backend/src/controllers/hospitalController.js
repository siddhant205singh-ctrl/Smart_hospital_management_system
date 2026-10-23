const Hospital = require('../models/Hospital');
const Department = require('../models/Department');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const User = require('../models/User');

// Haversine Distance Formula in Kilometers
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const SYMPTOM_SPECIALTY_MAP = {
  chest_pain: {
    specialties: ['Cardiology', 'Emergency Medicine'],
    rationale: 'Suggested because you indicated acute chest pain or cardiac pressure'
  },
  breathing_difficulty: {
    specialties: ['Pulmonology', 'Emergency Medicine', 'General Medicine'],
    rationale: 'Suggested because you indicated severe breathing or airway distress'
  },
  severe_bleeding: {
    specialties: ['General Surgery', 'Emergency Medicine', 'Orthopedics'],
    rationale: 'Suggested because you indicated acute bleeding or hemorrhage'
  },
  stroke_signs: {
    specialties: ['Neurology', 'Emergency Medicine'],
    rationale: 'Suggested because you indicated neurological stroke warning signs'
  },
  accident_injury: {
    specialties: ['Orthopedics', 'Emergency Medicine', 'General Surgery'],
    rationale: 'Suggested because you indicated trauma or accident injury'
  },
  high_fever_seizures: {
    specialties: ['Pediatrics', 'Neurology', 'General Medicine'],
    rationale: 'Suggested because you indicated acute febrile seizure or high fever'
  },
  other: {
    specialties: ['Emergency Medicine', 'General Medicine'],
    rationale: 'Suggested for general emergency physician triage evaluation'
  }
};

// @route   GET /api/hospitals
exports.getHospitals = async (req, res, next) => {
  try {
    const hospitals = await Hospital.find({ isActive: true }).populate('departments');
    res.json({ success: true, count: hospitals.length, hospitals });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/hospitals/:id
exports.getHospitalById = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id).populate('departments');
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    res.json({ success: true, hospital });
  } catch (error) {
    next(error);
  }
};

// @route   GET /api/hospitals/nearby
// @desc    Find nearest network hospitals sorted strictly by distance, with live doctor specialties and queue wait
// @access  Public
exports.getNearbyHospitals = async (req, res, next) => {
  try {
    let { lat, lng, city, symptom, specialty, emergencyOnly, availableNow } = req.query;

    let userLat = parseFloat(lat);
    let userLng = parseFloat(lng);
    let locationSource = 'gps';

    // Fallback: If coordinates not provided, check user's profile location or city center
    if (isNaN(userLat) || isNaN(userLng)) {
      if (req.user && req.user.locationCoordinates?.lat) {
        userLat = req.user.locationCoordinates.lat;
        userLng = req.user.locationCoordinates.lng;
        locationSource = 'profile_saved';
      } else {
        // Default anchor: Delhi NCR center (28.5355, 77.2410)
        userLat = 28.5355;
        userLng = 77.2410;
        locationSource = 'default_metro_center';
      }
    }

    // Suggested specialties from symptom
    const symptomGuidance = symptom && SYMPTOM_SPECIALTY_MAP[symptom]
      ? SYMPTOM_SPECIALTY_MAP[symptom]
      : null;

    let hospitalFilter = { isActive: true };
    if (emergencyOnly === 'true') {
      hospitalFilter.hasEmergencyDept = true;
    }
    if (city) {
      hospitalFilter.city = new RegExp(city, 'i');
    }

    const hospitals = await Hospital.find(hospitalFilter).populate('departments');

    // Fetch active doctors and current appointments for queue calculation
    const allDoctors = await Doctor.find()
      .populate('userId', 'name email phone avatar')
      .populate('departmentId', 'name code');

    // Get today's active appointments
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const activeAppointments = await Appointment.find({
      date: { $gte: todayStart, $lte: todayEnd },
      status: { $in: ['booked', 'checked_in'] }
    });

    const appointmentCountsByDoctor = {};
    activeAppointments.forEach(app => {
      const docId = app.doctorId.toString();
      appointmentCountsByDoctor[docId] = (appointmentCountsByDoctor[docId] || 0) + 1;
    });

    // Map and enrich each hospital
    const enrichedHospitals = hospitals.map(h => {
      const hLat = h.address?.lat || 28.5355;
      const hLng = h.address?.lng || 77.2410;

      const distanceKm = getHaversineDistance(userLat, userLng, hLat, hLng);
      // Realistic transit speed in urban traffic (~28 km/h + 3 min intake buffer)
      const travelTimeMinutes = distanceKm !== null
        ? Math.max(4, Math.round((distanceKm / 28) * 60 + 3))
        : 15;

      // Hospital's doctors
      const hospitalDocs = allDoctors.filter(d => d.hospitalId.toString() === h._id.toString());

      // Group doctors by specialty
      const specialtyGroups = {};
      hospitalDocs.forEach(doc => {
        const specName = doc.specialty || 'General Medicine';
        if (!specialtyGroups[specName]) {
          specialtyGroups[specName] = {
            specialty: specName,
            totalDoctors: 0,
            availableNowCount: 0,
            totalQueueLength: 0,
            avgWaitMinutes: 0,
            nextAvailableSlot: 'Immediate (ER / Walk-in)',
            matchedSymptom: symptomGuidance?.specialties?.includes(specName) || false,
            doctors: []
          };
        }

        const queueCount = appointmentCountsByDoctor[doc._id.toString()] || 0;
        const isAvail = doc.liveStatus === 'available';

        specialtyGroups[specName].totalDoctors += 1;
        if (isAvail) specialtyGroups[specName].availableNowCount += 1;
        specialtyGroups[specName].totalQueueLength += queueCount;

        specialtyGroups[specName].doctors.push({
          id: doc._id,
          name: doc.userId?.name || 'Dr. Specialist',
          avatar: doc.userId?.avatar,
          liveStatus: doc.liveStatus,
          isVerified: doc.isVerified,
          experienceYears: doc.experienceYears,
          roomNumber: doc.roomNumber,
          consultationFee: doc.consultationFee,
          queueLength: queueCount,
          qualifications: doc.qualifications
        });
      });

      // Calculate specialty average waits
      Object.keys(specialtyGroups).forEach(k => {
        const group = specialtyGroups[k];
        const docCount = Math.max(1, group.totalDoctors);
        group.avgWaitMinutes = Math.round((group.totalQueueLength * 12) / docCount);
      });

      const specialtiesList = Object.values(specialtyGroups);
      const totalAvailableDocs = hospitalDocs.filter(d => d.liveStatus === 'available').length;

      return {
        _id: h._id,
        name: h.name,
        code: h.code,
        city: h.city,
        address: h.address,
        phone: h.phone,
        emergencyPhone: h.emergencyPhone || h.emergencyContact || h.phone,
        hasEmergencyDept: h.hasEmergencyDept !== false,
        is24x7Emergency: h.is24x7Emergency !== false,
        bloodBankOperational: h.bloodBankOperational,
        image: h.image,
        currentErWaitMinutes: h.currentErWaitMinutes || 12,
        distanceKm: distanceKm !== null ? parseFloat(distanceKm.toFixed(1)) : null,
        travelTimeMinutes,
        totalDoctors: hospitalDocs.length,
        totalAvailableDoctors: totalAvailableDocs,
        specialties: specialtiesList,
        googleMapsDirectionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${h.name}, ${h.city}`)}`
      };
    });

    // Apply filters
    let filtered = enrichedHospitals;
    if (availableNow === 'true') {
      filtered = filtered.filter(h => h.totalAvailableDoctors > 0);
    }
    if (specialty) {
      filtered = filtered.filter(h =>
        h.specialties.some(s => s.specialty.toLowerCase().includes(specialty.toLowerCase()))
      );
    }

    // STRICT CLINICAL RANKING: Sort primarily by distance (no paid ranking)
    filtered.sort((a, b) => {
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    res.json({
      success: true,
      count: filtered.length,
      userLocation: {
        lat: userLat,
        lng: userLng,
        source: locationSource
      },
      symptomGuidance,
      hospitals: filtered
    });
  } catch (error) {
    next(error);
  }
};
