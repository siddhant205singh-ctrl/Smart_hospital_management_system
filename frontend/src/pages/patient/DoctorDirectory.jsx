import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  Search,
  Filter,
  Star,
  Clock,
  Building2,
  Calendar,
  CheckCircle,
  X,
  Languages,
  User,
  Activity,
  ArrowRight
} from 'lucide-react';

export default function DoctorDirectory() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [doctors, setDoctors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [hospitalId, setHospitalId] = useState('');
  const [language, setLanguage] = useState('');
  const [liveStatus, setLiveStatus] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  // Booking Modal State
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [familyMember, setFamilyMember] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [travelTime, setTravelTime] = useState(25);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(null);

  // Initialize query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search');
    const hospitalParam = params.get('hospitalId');
    if (searchParam) setSearch(searchParam);
    if (hospitalParam) setHospitalId(hospitalParam);
  }, [location.search]);

  // Fetch Hospitals
  useEffect(() => {
    api.get('/hospitals')
      .then(res => setHospitals(res.data.hospitals || []))
      .catch(err => console.log(err));
  }, []);

  // Fetch Doctors with filters
  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (specialty) params.append('specialty', specialty);
    if (hospitalId) params.append('hospitalId', hospitalId);
    if (language) params.append('language', language);
    if (liveStatus) params.append('liveStatus', liveStatus);
    if (verifiedOnly) params.append('verifiedOnly', 'true');

    api.get(`/doctors?${params.toString()}`)
      .then(res => setDoctors(res.data.doctors || []))
      .catch(err => console.log(err))
      .finally(() => setLoading(false));
  }, [search, specialty, hospitalId, language, liveStatus]);

  // Fetch slots when doctor or date changes in modal
  useEffect(() => {
    if (selectedDoctor && bookingDate) {
      api.get(`/doctors/${selectedDoctor._id}/slots?date=${bookingDate}`)
        .then(res => setAvailableSlots(res.data.slots || []))
        .catch(err => console.log(err));
    }
  }, [selectedDoctor, bookingDate]);

  const handleOpenBooking = (doc) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setSelectedDoctor(doc);
    setSelectedSlot('');
    setBookingSuccess(null);
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!selectedSlot) return;
    setBookingLoading(true);
    try {
      const res = await api.post('/appointments', {
        doctorId: selectedDoctor._id,
        date: bookingDate,
        timeSlot: selectedSlot,
        bookedForFamilyMember: familyMember,
        symptoms,
        userTravelTimeMinutes: travelTime
      });
      setBookingSuccess(res.data.appointment);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to book appointment');
    } finally {
      setBookingLoading(false);
    }
  };

  const specialtiesList = ['Cardiology', 'Orthopedics', 'Pediatrics', 'General Medicine', 'Neurology', 'Dermatology'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Find Doctors Across Network</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Real-time availability, dynamic wait times, and instant digital token generation across 3 connected hospitals.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search text */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Doctor or symptom..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Specialty */}
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Specialties</option>
            {specialtiesList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Hospital */}
          <select
            value={hospitalId}
            onChange={(e) => setHospitalId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All 3 Connected Hospitals</option>
            {hospitals.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
          </select>

          {/* Language */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Any Language</option>
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
            <option value="Bengali">Bengali</option>
            <option value="Punjabi">Punjabi</option>
          </select>

          {/* Live Status */}
          <select
            value={liveStatus}
            onChange={(e) => setLiveStatus(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">All Live Statuses</option>
            <option value="available">🟢 Available Now</option>
            <option value="in_consultation">🟡 In Consultation</option>
            <option value="on_break">☕ On Break</option>
          </select>
        </div>

        {/* Verified Doctor Filter Toggle */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <label className="flex items-center space-x-2 cursor-pointer font-semibold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500"
            />
            <span>Show Verified Medical Council Practitioners Only</span>
          </label>
          <span className="text-slate-400 text-[11px]">{doctors.length} Specialists Available</span>
        </div>
      </div>

      {/* Doctor Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="h-64 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-3xl"></div>
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-base text-slate-700 dark:text-slate-300">No doctors match your filters</h3>
          <p className="text-xs text-slate-400 mt-1">Try resetting the specialty or hospital filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doc) => (
            <div
              key={doc._id}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Top Row: Avatar & Live Status Badge */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <img
                      src={doc.userId?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.userId?.name || 'Doctor')}&background=0d9488&color=fff`}
                      alt={doc.userId?.name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(doc.userId?.name || 'Doctor')}&background=0d9488&color=fff`;
                      }}
                      className="w-14 h-14 rounded-2xl object-cover border-2 border-teal-500 shadow-md"
                    />
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                          {doc.userId?.name}
                        </h3>
                        {doc.isVerified && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center space-x-0.5">
                            <CheckCircle className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Verified</span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 block mt-0.5">
                        {doc.specialty}
                      </span>
                      {doc.medicalCouncilRegNumber && (
                        <span className="text-[10px] text-slate-400 font-mono block">
                          Council Reg: {doc.medicalCouncilRegNumber}
                        </span>
                      )}
                      <div className="flex items-center space-x-1 text-amber-500 text-xs mt-0.5">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span className="font-bold">{doc.rating || 4.8}</span>
                        <span className="text-slate-400 text-[10px]">({doc.reviewCount || 42})</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      doc.liveStatus === 'available'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : doc.liveStatus === 'in_consultation'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {doc.liveStatus?.replace('_', ' ')}
                  </span>
                </div>

                {/* Details */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <p className="flex items-center space-x-1.5">
                    <Building2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                    <span className="truncate">{doc.hospitalId?.name}</span>
                  </p>
                  <p className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-600 flex-shrink-0" />
                    <span>Consultation Room: <strong>{doc.roomNumber}</strong></span>
                  </p>
                  {doc.qualifications?.length > 0 && (
                    <p className="text-[11px] text-teal-700 dark:text-teal-300 font-semibold truncate">
                      🎓 {doc.qualifications.map(q => q.degree || q).join(', ')}
                    </p>
                  )}
                  <p className="flex items-center space-x-1.5">
                    <Languages className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="text-[11px]">{doc.languages?.join(', ')}</span>
                  </p>
                </div>
              </div>

              {/* Fee & Book Button */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">Consultation Fee</span>
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    ₹{doc.consultationFee}
                  </span>
                </div>

                <button
                  onClick={() => handleOpenBooking(doc)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Book Slot</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Booking Modal */}
      {selectedDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-7 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 my-4 sm:my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Book Smart Consultation</h3>
                <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">
                  {selectedDoctor.userId?.name} ({selectedDoctor.specialty})
                </p>
              </div>
              <button
                onClick={() => setSelectedDoctor(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bookingSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white">Token Generated!</h4>
                  <p className="text-xs text-slate-500 mt-1">Your appointment and live queue tracking are confirmed.</p>
                </div>

                {/* Big Token Preview */}
                <div className="p-4 bg-teal-50 dark:bg-teal-950/40 rounded-2xl border border-teal-200 dark:border-teal-800 inline-block">
                  <span className="text-[10px] uppercase font-bold text-teal-800 dark:text-teal-200 block">Token Number</span>
                  <span className="text-4xl font-black text-teal-700 dark:text-teal-300">#{bookingSuccess.tokenNumber}</span>
                  <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 block mt-0.5">{bookingSuccess.tokenCode}</span>
                </div>

                <div className="flex justify-center">
                  <img src={bookingSuccess.qrCode} alt="Token QR" className="w-36 h-36 border rounded-xl p-2 bg-white" />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={() => { setSelectedDoctor(null); navigate(`/my-queue`); }}
                    className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                  >
                    Open Live Queue Tracker →
                  </button>
                  <button
                    onClick={() => setSelectedDoctor(null)}
                    className="px-4 py-2.5 border rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmBooking} className="space-y-4 text-xs mt-4">
                {/* Date Picker */}
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Appointment Date</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>

                {/* Time Slots */}
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Available 15-Minute Slots</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1 border rounded-xl border-slate-200 dark:border-slate-700">
                    {availableSlots.map((slot, idx) => (
                      <button
                        key={idx}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setSelectedSlot(slot.timeSlot)}
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition ${
                          selectedSlot === slot.timeSlot
                            ? 'bg-teal-600 text-white border-teal-600'
                            : slot.available
                            ? 'bg-white dark:bg-slate-800 hover:bg-teal-50 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                            : 'opacity-40 bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {slot.timeSlot.split(' - ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Booking for Family Member */}
                {user?.familyMembers && user.familyMembers.length > 0 && (
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Book For</label>
                    <select
                      value={familyMember}
                      onChange={(e) => setFamilyMember(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    >
                      <option value="">Myself ({user.name})</option>
                      {user.familyMembers.map((fm, idx) => (
                        <option key={idx} value={fm.name}>{fm.name} ({fm.relation})</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Travel Time Input */}
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Your Travel Time to Hospital (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={travelTime}
                    onChange={(e) => setTravelTime(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                  <span className="text-[10px] text-slate-400">Used by SmartCare to calculate your "Leave Now" alert.</span>
                </div>

                {/* Symptoms */}
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Symptoms or Notes</label>
                  <textarea
                    rows={2}
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="Briefly describe your symptoms or reason for visit..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  disabled={bookingLoading || !selectedSlot}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-600/30 transition disabled:opacity-50"
                >
                  {bookingLoading ? 'Generating Token...' : `Confirm & Generate Token (₹${selectedDoctor.consultationFee})`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
