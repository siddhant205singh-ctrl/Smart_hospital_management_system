import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  AlertTriangle,
  PhoneCall,
  X,
  Activity,
  Heart,
  ShieldAlert,
  Clock,
  UserCheck,
  CheckCircle2,
  Navigation,
  MapPin,
  Search,
  Compass,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Sparkles,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

const RED_FLAGS = [
  { id: 'chest_pain', label: 'Chest Pain / Pressure', icon: '💔', priority: 'P1' },
  { id: 'breathing_difficulty', label: 'Severe Breathing Trouble', icon: '🫁', priority: 'P1' },
  { id: 'severe_bleeding', label: 'Severe Bleeding / Trauma', icon: '🩸', priority: 'P1' },
  { id: 'stroke_signs', label: 'Stroke (Face, Arm, Speech)', icon: '🧠', priority: 'P1' },
  { id: 'accident_injury', label: 'Accident / Severe Fracture', icon: '🚑', priority: 'P2' },
  { id: 'high_fever_seizures', label: 'High Fever / Seizures', icon: '🔥', priority: 'P2' },
  { id: 'other', label: 'Other Acute Emergency', icon: '⚠️', priority: 'P3' }
];

export default function EmergencyIntakeModal({ isOpen, onClose, onCaseSubmitted }) {
  const { user } = useAuth();

  // Mode: 'finder' (Nearest Network Hospitals) or 'intake' (Manual Triage Form)
  const [activeTab, setActiveTab] = useState('finder');

  // Form State
  const [chiefComplaint, setChiefComplaint] = useState('chest_pain');
  const [severityScore, setSeverityScore] = useState(8);
  const [symptomOnset, setSymptomOnset] = useState('< 30 minutes');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [isBystander, setIsBystander] = useState(false);
  const [submittedByName, setSubmittedByName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [relationship, setRelationship] = useState('self');
  const [preferredHospitalId, setPreferredHospitalId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittedCase, setSubmittedCase] = useState(null);

  // Nearby Hospital Finder State
  const [hospitals, setHospitals] = useState([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState('requesting'); // 'requesting', 'granted', 'denied', 'fallback'
  const [manualCity, setManualCity] = useState('');
  const [emergencyOnlyFilter, setEmergencyOnlyFilter] = useState(true);
  const [availableNowFilter, setAvailableNowFilter] = useState(false);
  const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState('all');
  const [symptomGuidance, setSymptomGuidance] = useState(null);
  const [expandedHospitalId, setExpandedHospitalId] = useState(null);

  // Request browser geolocation or fallback
  const detectLocation = () => {
    setLocationStatus('requesting');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(coords);
          setLocationStatus('granted');
          fetchNearbyHospitals(coords.lat, coords.lng);
        },
        (err) => {
          console.warn('Geolocation denied/unavailable:', err.message);
          setLocationStatus('denied');
          // Use user profile coordinates or default Delhi NCR center
          const fallbackLat = user?.locationCoordinates?.lat || 28.5355;
          const fallbackLng = user?.locationCoordinates?.lng || 77.2410;
          setUserLocation({ lat: fallbackLat, lng: fallbackLng });
          fetchNearbyHospitals(fallbackLat, fallbackLng);
        },
        { timeout: 7000, enableHighAccuracy: true }
      );
    } else {
      setLocationStatus('fallback');
      const fallbackLat = 28.5355;
      const fallbackLng = 77.2410;
      setUserLocation({ lat: fallbackLat, lng: fallbackLng });
      fetchNearbyHospitals(fallbackLat, fallbackLng);
    }
  };

  const fetchNearbyHospitals = async (lat, lng, city = '') => {
    setHospitalsLoading(true);
    try {
      const res = await api.get('/hospitals/nearby', {
        params: {
          lat,
          lng,
          city: city || undefined,
          symptom: chiefComplaint,
          specialty: selectedSpecialtyFilter !== 'all' ? selectedSpecialtyFilter : undefined,
          emergencyOnly: emergencyOnlyFilter,
          availableNow: availableNowFilter
        }
      });
      setHospitals(res.data.hospitals || []);
      setSymptomGuidance(res.data.symptomGuidance || null);
      if (res.data.hospitals?.length > 0 && !preferredHospitalId) {
        setPreferredHospitalId(res.data.hospitals[0]._id);
      }
    } catch (err) {
      console.error('Error fetching nearby hospitals:', err);
    } finally {
      setHospitalsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      detectLocation();
    } else {
      setSubmittedCase(null);
      setExpandedHospitalId(null);
    }
  }, [isOpen]);

  // Re-fetch when symptom or filter changes
  useEffect(() => {
    if (isOpen && userLocation) {
      fetchNearbyHospitals(userLocation.lat, userLocation.lng, manualCity);
    }
  }, [chiefComplaint, emergencyOnlyFilter, availableNowFilter, selectedSpecialtyFilter]);

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 1-Tap Emergency Booking from Hospital Finder
  const handleQuickBook = async (hospital, doctorId = null) => {
    setLoading(true);
    try {
      const res = await api.post('/emergency-cases', {
        chiefComplaint,
        severityScore: Math.max(7, Number(severityScore)),
        symptomOnset,
        complaintDescription: `1-Tap Emergency Dispatch for ${hospital.name}. Direct transit to ER.`,
        preferredHospitalId: hospital._id,
        submittedByName: isBystander ? submittedByName : (user?.name || 'Emergency Patient'),
        relationship: isBystander ? relationship : 'self',
        isBystander: Boolean(isBystander || !user),
        userLat: userLocation?.lat,
        userLng: userLocation?.lng,
        travelTimeMinutes: hospital.travelTimeMinutes,
        assignedDoctorId: doctorId,
        bookingSource: 'emergency_finder'
      });

      setSubmittedCase(res.data.emergencyCase);
      if (onCaseSubmitted) onCaseSubmitted(res.data.emergencyCase);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to dispatch emergency response.');
    } finally {
      setLoading(false);
    }
  };

  // Full Manual Intake Form Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/emergency-cases', {
        chiefComplaint,
        severityScore,
        symptomOnset,
        complaintDescription: patientPhone ? `${complaintDescription} [Contact: ${patientPhone}]`.trim() : complaintDescription,
        preferredHospitalId: preferredHospitalId || (hospitals[0] ? hospitals[0]._id : undefined),
        submittedByName: isBystander ? submittedByName : (user?.name || submittedByName || 'Emergency Patient'),
        relationship: isBystander ? relationship : 'self',
        isBystander: Boolean(isBystander || !user),
        userLat: userLocation?.lat,
        userLng: userLocation?.lng,
        bookingSource: 'intake_modal'
      });

      setSubmittedCase(res.data.emergencyCase);
      if (onCaseSubmitted) onCaseSubmitted(res.data.emergencyCase);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit emergency intake');
    } finally {
      setLoading(false);
    }
  };

  const modalMarkup = (
    <div
      className="fixed inset-0 z-[9999] overflow-y-auto bg-black/80 backdrop-blur-sm p-2 sm:p-4 flex min-h-full items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border-2 border-rose-500 my-auto text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky 112 Emergency Banner */}
        <div className="mb-3.5 p-3 bg-rose-600 text-white rounded-2xl flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2.5">
            <ShieldAlert className="w-5 h-5 animate-pulse flex-shrink-0" />
            <div>
              <strong className="block text-xs uppercase tracking-wider">Critical Life-Threatening Emergency?</strong>
              <span className="text-[11px] text-rose-100">National Emergency Services: 112 / 108</span>
            </div>
          </div>
          <a
            href="tel:112"
            className="px-3.5 py-1.5 bg-white text-rose-700 font-black rounded-xl text-xs hover:bg-rose-50 shadow-md transition flex items-center space-x-1 flex-shrink-0"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call 112</span>
          </a>
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-black text-base sm:text-lg text-slate-900 dark:text-white flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 radar-live"></span>
              <span>Emergency Gateway & Hospital Finder</span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Locate nearby 24x7 ER network hospitals, inspect live doctor availability, and reserve immediate triage.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Confirmation View */}
        {submittedCase ? (
          <div className="my-6 space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-lg animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-mono font-bold text-teal-600 block">
                EMERGENCY TOKEN: {submittedCase.caseNumber}
              </span>
              <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                Emergency Case Dispatched ({submittedCase.triagePriority?.replace(/_/g, ' ')})
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Pre-arrival notification sent to emergency triage desk at{' '}
                <strong>{submittedCase.hospitalId?.name || 'the Hospital ER'}</strong>. Medical staff are alerted.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs text-left space-y-2 border border-slate-200 dark:border-slate-700 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-slate-400">Chief Complaint:</span>
                <span className="font-bold capitalize">{submittedCase.chiefComplaint?.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Triage Priority:</span>
                <span className="font-bold text-rose-600">{submittedCase.triagePriority?.replace(/_/g, ' ')}</span>
              </div>
              {submittedCase.estimatedTravelTimeMinutes > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Estimated Transit ETA:</span>
                  <span className="font-bold text-teal-600">~{submittedCase.estimatedTravelTimeMinutes} mins</span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-700">
                <span className="text-slate-400">Destination:</span>
                <span className="font-semibold">{submittedCase.hospitalId?.name}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md mx-auto">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                  `${submittedCase.hospitalId?.name || ''}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-1/2 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center space-x-1.5"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Get GPS Directions</span>
              </a>

              <a
                href={`tel:${submittedCase.hospitalId?.emergencyContact || submittedCase.hospitalId?.phone || '112'}`}
                className="w-full sm:w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center justify-center space-x-1.5"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call ER Desk</span>
              </a>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
            >
              Close Window
            </button>
          </div>
        ) : (
          <div className="space-y-4 mt-3">
            {/* View Selector Tabs */}
            <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('finder')}
                className={`px-3 py-1.5 rounded-xl transition flex items-center space-x-1.5 ${
                  activeTab === 'finder'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Nearest Hospitals & Doctors</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('intake')}
                className={`px-3 py-1.5 rounded-xl transition flex items-center space-x-1.5 ${
                  activeTab === 'intake'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Detailed Triage Intake Form</span>
              </button>
            </div>

            {/* Symptom Selection Quick Chips (Present on both tabs) */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Select Chief Emergency Symptom:</span>
                <span className="text-[10px] text-slate-400">Strictly governs triage priority & clinical matching</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {RED_FLAGS.map((rf) => (
                  <button
                    key={rf.id}
                    type="button"
                    onClick={() => {
                      setChiefComplaint(rf.id);
                      if (rf.priority === 'P1') setSeverityScore(Math.max(8, severityScore));
                    }}
                    className={`p-2 rounded-xl border text-left flex items-center space-x-2 transition ${
                      chiefComplaint === rf.id
                        ? 'bg-rose-50 border-rose-500 text-rose-950 dark:bg-rose-950/60 dark:border-rose-500 dark:text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-sm">{rf.icon}</span>
                    <div className="truncate">
                      <span className="font-bold text-[11px] block truncate">{rf.label}</span>
                      <span className="text-[9px] text-rose-600 font-bold">{rf.priority} Triage</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Transparent Symptom-to-Specialty Guidance */}
              {symptomGuidance && (
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-[11px] text-teal-900 dark:text-teal-200 flex items-center space-x-2">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                  <span>
                    <strong>Clinical Matching:</strong> {symptomGuidance.rationale} &rarr; Suggested specialties:{' '}
                    <strong>{symptomGuidance.specialties?.join(', ')}</strong>.
                  </span>
                </div>
              )}
            </div>

            {/* TAB 1: NEAREST NETWORK HOSPITALS & LIVE DOCTORS */}
            {activeTab === 'finder' && (
              <div className="space-y-3 text-xs">
                {/* Location Status & Filter Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                      {locationStatus === 'granted'
                        ? 'Sorted strictly by GPS Distance'
                        : locationStatus === 'denied'
                        ? 'Location permission denied — showing Metro Network center'
                        : 'Detecting nearest network hospitals...'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <label className="flex items-center space-x-1.5 text-[11px] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={availableNowFilter}
                        onChange={(e) => setAvailableNowFilter(e.target.checked)}
                        className="rounded text-rose-600 focus:ring-rose-500"
                      />
                      <span>Available Doctors Only</span>
                    </label>

                    <button
                      type="button"
                      onClick={detectLocation}
                      className="px-2 py-1 bg-white dark:bg-slate-700 rounded-lg text-[10px] font-bold border hover:bg-slate-100 dark:hover:bg-slate-600"
                    >
                      Refresh GPS
                    </button>
                  </div>
                </div>

                {/* Hospitals List */}
                {hospitalsLoading ? (
                  <div className="space-y-2">
                    <div className="h-28 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
                    <div className="h-28 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
                  </div>
                ) : hospitals.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                    No matching network hospitals found for these criteria.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[46vh] overflow-y-auto pr-1">
                    {hospitals.map((hosp, idx) => {
                      const isExpanded = expandedHospitalId === hosp._id;
                      return (
                        <div
                          key={hosp._id}
                          className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-teal-500 transition shadow-sm space-y-2.5"
                        >
                          {/* Hospital Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                  #{idx + 1}
                                </span>
                                <h4 className="font-bold text-sm text-slate-900 dark:text-white">{hosp.name}</h4>
                                {hosp.is24x7Emergency && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] font-bold">
                                    24x7 ER
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {hosp.address?.street || hosp.city} • ER Phone:{' '}
                                <a href={`tel:${hosp.emergencyPhone}`} className="text-rose-600 font-bold hover:underline">
                                  {hosp.emergencyPhone}
                                </a>
                              </p>
                            </div>

                            {/* Distance & Travel Time Badges */}
                            <div className="flex items-center space-x-2 self-start sm:self-auto flex-shrink-0">
                              <span className="px-2.5 py-1 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-bold text-xs border border-teal-200 dark:border-teal-800 flex items-center space-x-1">
                                <Navigation className="w-3 h-3 text-teal-600" />
                                <span>{hosp.distanceKm !== null ? `${hosp.distanceKm} km` : '~3.5 km'}</span>
                              </span>

                              <span className="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-800 flex items-center space-x-1">
                                <Clock className="w-3 h-3 text-rose-600" />
                                <span>~{hosp.travelTimeMinutes} min transit</span>
                              </span>
                            </div>
                          </div>

                          {/* Specialties available right now */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80 space-y-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                              Doctors On-Duty Right Now by Specialty:
                            </span>

                            <div className="flex flex-wrap gap-1.5">
                              {hosp.specialties?.map((spec, sIdx) => (
                                <span
                                  key={sIdx}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold border flex items-center space-x-1 ${
                                    spec.matchedSymptom
                                      ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-700'
                                      : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                  }`}
                                >
                                  {spec.matchedSymptom && <span>★</span>}
                                  <span>{spec.specialty}</span>
                                  <span className="font-bold text-teal-600">({spec.availableNowCount} avail)</span>
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Action Toolbar */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center space-x-2">
                              <a
                                href={hosp.googleMapsDirectionsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-lg text-[11px] flex items-center space-x-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Directions</span>
                              </a>

                              <button
                                type="button"
                                onClick={() => setExpandedHospitalId(isExpanded ? null : hosp._id)}
                                className="px-2 py-1 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-[11px] flex items-center space-x-0.5"
                              >
                                <span>{isExpanded ? 'Hide Doctors' : 'View Doctors'}</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            </div>

                            {/* 1-Tap Booking Button */}
                            <button
                              type="button"
                              onClick={() => handleQuickBook(hosp)}
                              disabled={loading}
                              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md transition flex items-center space-x-1.5 text-xs"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>{loading ? 'Alerting...' : '1-Tap Reserve ER Slot'}</span>
                            </button>
                          </div>

                          {/* Expanded Doctor Cards */}
                          {isExpanded && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2 bg-slate-50/50 dark:bg-slate-900/40 p-2.5 rounded-xl">
                              <span className="text-[10px] font-bold text-slate-500 block">Verified On-Duty Physicians:</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {hosp.specialties?.flatMap((s) => s.doctors).map((doc) => (
                                  <div
                                    key={doc.id}
                                    className="p-2 rounded-xl bg-white dark:bg-slate-800 border flex items-center justify-between"
                                  >
                                    <div>
                                      <div className="flex items-center space-x-1">
                                        <strong className="text-[11px] text-slate-900 dark:text-white">{doc.name}</strong>
                                        {doc.isVerified && <ShieldCheck className="w-3 h-3 text-teal-600" />}
                                      </div>
                                      <span className="text-[10px] text-slate-400 block">
                                        Room {doc.roomNumber} • {doc.experienceYears}y exp • Queue: {doc.queueLength}
                                      </span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleQuickBook(hosp, doc.id)}
                                      className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-[10px]"
                                    >
                                      Select Doctor
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: DETAILED INTAKE FORM */}
            {activeTab === 'intake' && (
              <form onSubmit={handleFormSubmit} className="space-y-3.5 text-xs">
                {/* Bystander Mode */}
                {user ? (
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Submitting on behalf of a family member or as a bystander?
                    </span>
                    <input
                      type="checkbox"
                      checked={isBystander}
                      onChange={(e) => setIsBystander(e.target.checked)}
                      className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                    />
                  </div>
                ) : (
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 text-amber-900 dark:text-amber-200">
                    ⚡ <strong>Guest Emergency Mode Active:</strong> Direct triage intake without login.
                  </div>
                )}

                {/* Bystander inputs */}
                {isBystander && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border">
                    <div>
                      <label className="font-semibold block mb-1">Your Name (Reporter)</label>
                      <input
                        type="text"
                        required
                        value={submittedByName}
                        onChange={(e) => setSubmittedByName(e.target.value)}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Relationship to Patient</label>
                      <select
                        value={relationship}
                        onChange={(e) => setRelationship(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border bg-white dark:bg-slate-900"
                      >
                        <option value="spouse">Spouse / Partner</option>
                        <option value="parent">Parent</option>
                        <option value="child">Child</option>
                        <option value="relative">Relative</option>
                        <option value="colleague">Colleague / Friend</option>
                        <option value="good_samaritan">Good Samaritan / Bystander</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Severity Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="font-bold">Pain / Severity Score (1 - 10):</label>
                    <span className="font-black text-rose-600 text-sm">{severityScore} / 10</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={severityScore}
                    onChange={(e) => setSeverityScore(Number(e.target.value))}
                    className="w-full accent-rose-600"
                  />
                </div>

                {/* Preferred Hospital Dropdown */}
                <div>
                  <label className="font-semibold block mb-1">Destination Hospital</label>
                  <select
                    value={preferredHospitalId}
                    onChange={(e) => setPreferredHospitalId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    {hospitals.map((h) => (
                      <option key={h._id} value={h._id}>
                        {h.name} ({h.distanceKm !== null ? `${h.distanceKm} km` : 'Near'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Onset & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="font-semibold block mb-1">Symptom Onset</label>
                    <select
                      value={symptomOnset}
                      onChange={(e) => setSymptomOnset(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border bg-slate-50 dark:bg-slate-800"
                    >
                      <option value="< 30 minutes">&lt; 30 minutes ago</option>
                      <option value="within_1_hour">Within 1 hour</option>
                      <option value="1_to_3_hours">1 to 3 hours ago</option>
                      <option value="gradual_worsening">Gradual worsening over today</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Callback Phone</label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 98765 43210"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="font-semibold block mb-1">Observed Symptoms / Details</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Sweating heavily, left arm numbness, conscious"
                    value={complaintDescription}
                    onChange={(e) => setComplaintDescription(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg transition"
                >
                  {loading ? 'Submitting Triage...' : 'Transmit Emergency Triage Protocol'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalMarkup, document.body);
}
