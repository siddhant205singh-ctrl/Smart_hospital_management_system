import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import confetti from 'canvas-confetti';
import {
  Search,
  Filter,
  Star,
  Clock,
  Building2,
  Calendar,
  CheckCircle,
  CheckCircle2,
  X,
  Languages,
  User,
  Activity,
  ArrowRight,
  FileText,
  Pill,
  UploadCloud,
  Shield,
  Trash2,
  Paperclip,
  CheckSquare,
  Square,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';

export default function DoctorDirectory() {
  const { user } = useAuth();
  const { t } = useTranslation();
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
  const [copiedToken, setCopiedToken] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  // Feature B: Pre-consultation document sharing & consent state
  const [bookingStep, setBookingStep] = useState(1);
  const [availableReports, setAvailableReports] = useState([]);
  const [availableMedicines, setAvailableMedicines] = useState([]);
  const [selectedReportIds, setSelectedReportIds] = useState([]);
  const [selectedMedicineIds, setSelectedMedicineIds] = useState([]);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [documentConsent, setDocumentConsent] = useState(false);
  const [recordsTab, setRecordsTab] = useState('reports');
  const [recordsLoading, setRecordsLoading] = useState(false);

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

  const loadPatientRecords = async () => {
    if (!user) return;
    setRecordsLoading(true);
    try {
      const [reportsRes, medsRes] = await Promise.allSettled([
        api.get('/reports/my').catch(() => api.get('/reports')).catch(() => api.get('/medical-reports')),
        api.get('/medicines')
      ]);
      if (reportsRes.status === 'fulfilled' && reportsRes.value?.data?.reports) {
        setAvailableReports(reportsRes.value.data.reports);
      }
      if (medsRes.status === 'fulfilled' && medsRes.value?.data?.medicines) {
        setAvailableMedicines(medsRes.value.data.medicines);
      }
    } catch (err) {
      console.warn('[DoctorDirectory] Error fetching patient records:', err);
    } finally {
      setRecordsLoading(false);
    }
  };

  // Refresh patient records when advancing to step 2 (document selection)
  useEffect(() => {
    if (selectedDoctor && bookingStep === 2) {
      loadPatientRecords();
    }
  }, [bookingStep, selectedDoctor]);

  const handleOpenBooking = (doc) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setSelectedDoctor(doc);
    setSelectedSlot('');
    setBookingStep(1);
    setSelectedReportIds([]);
    setSelectedMedicineIds([]);
    setUploadFiles([]);
    setDocumentConsent(false);
    setBookingSuccess(null);

    // Load patient's existing records for sharing
    loadPatientRecords();
  };

  const toggleSelectReport = (id) => {
    setSelectedReportIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectMedicine = (id) => {
    setSelectedMedicineIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadFiles(prev => [...prev, ...files]);
  };

  const removeUploadFile = (index) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const totalSharedCount = selectedReportIds.length + selectedMedicineIds.length + uploadFiles.length;

  const handleConfirmBooking = async (e) => {
    if (e) e.preventDefault();
    if (!selectedSlot) return;
    if (totalSharedCount > 0 && !documentConsent) {
      alert('Please check the consent box to share selected documents with your doctor.');
      return;
    }

    setBookingLoading(true);
    try {
      // Unified single-roundtrip booking payload with pre-attached records & consent
      const res = await api.post('/appointments', {
        doctorId: selectedDoctor._id,
        date: bookingDate,
        timeSlot: selectedSlot,
        bookedForFamilyMember: familyMember,
        symptoms,
        reasonForVisit: symptoms,
        userTravelTimeMinutes: travelTime,
        selectedReportIds,
        selectedMedicineIds,
        consentGiven: totalSharedCount > 0 && documentConsent
      });

      const appt = res.data.appointment;

      // If patient uploaded newly snapped photos or local files, upload them in parallel
      if (uploadFiles.length > 0) {
        const formData = new FormData();
        uploadFiles.forEach(f => {
          formData.append('files', f);
          formData.append('documentFile', f);
        });
        api.post(`/appointments/${appt._id}/documents/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        }).catch(upErr => {
          console.warn('Error uploading booking documents:', upErr);
        });
      }

      // Instant success display with token details & celebratory confetti
      setBookingSuccess({
        ...appt,
        doctor: selectedDoctor
      });

      showToast(`🎉 Token #${appt.tokenNumber} generated successfully!`, 'success');

      try {
        confetti({
          particleCount: 75,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (confettiErr) {
        // Safe fallback if canvas not available
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to book appointment', 'error');
    } finally {
      setBookingLoading(false);
    }
  };

  const specialtiesList = ['Cardiology', 'Orthopedics', 'Pediatrics', 'General Medicine', 'Neurology', 'Dermatology'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Toast Alert */}
      {toast.show && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 text-xs font-bold transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-teal-600 text-white'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">{t('doctors.title')}</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {t('doctors.subtitle')}
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
              placeholder={t('doctors.searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Specialty */}
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">{t('doctors.allSpecialties')}</option>
            {specialtiesList.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Hospital */}
          <select
            value={hospitalId}
            onChange={(e) => setHospitalId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">{t('doctors.allHospitals')}</option>
            {hospitals.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
          </select>

          {/* Language */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">{t('common.all')} Languages</option>
            <option value="English">English</option>
            <option value="Hindi">हिन्दी (Hindi)</option>
            <option value="Bengali">বাংলা (Bengali)</option>
            <option value="Punjabi">ਪੰਜਾਬੀ (Punjabi)</option>
          </select>

          {/* Live Status */}
          <select
            value={liveStatus}
            onChange={(e) => setLiveStatus(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">{t('common.all')} Statuses</option>
            <option value="available">🟢 {t('common.available')}</option>
            <option value="in_consultation">🟡 {t('common.busy')}</option>
            <option value="on_break">☕ {t('common.offline')}</option>
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
            <span>{t('doctors.filterVerified')}</span>
          </label>
          <span className="text-slate-400 text-[11px]">{doctors.length} {t('doctors.title')}</span>
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
          <h3 className="font-bold text-base text-slate-700 dark:text-slate-300">{t('doctors.noDoctors')}</h3>
          <p className="text-xs text-slate-400 mt-1">{t('doctors.resetFilters')}</p>
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
                            <span>{t('common.verified')}</span>
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
                    {doc.liveStatus === 'available' ? t('common.available') : doc.liveStatus === 'in_consultation' ? t('common.busy') : t('common.offline')}
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
                    <span>{t('common.room')}: <strong>{doc.roomNumber}</strong></span>
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
                  <span className="text-[10px] uppercase text-slate-400 block">{t('common.fee')}</span>
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    ₹{doc.consultationFee}
                  </span>
                </div>

                <button
                  onClick={() => handleOpenBooking(doc)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{t('doctors.bookSlot')}</span>
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
                <h3 className="font-bold text-base text-slate-900 dark:text-white">{t('doctors.bookSlot')}</h3>
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
              <div className="text-center py-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/20">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div>
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                    <Sparkles className="w-3 h-3" />
                    <span>Token Confirmed & Active</span>
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 dark:text-white">Token Generated!</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Your appointment with <strong className="text-slate-800 dark:text-slate-200">Dr. {bookingSuccess.doctor?.userId?.name || selectedDoctor?.userId?.name}</strong> is confirmed.
                  </p>
                </div>

                {/* Big Token Pass */}
                <div className="p-4 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/50 dark:to-emerald-950/50 rounded-2xl border border-teal-200 dark:border-teal-800/80 shadow-inner max-w-xs mx-auto">
                  <span className="text-[10px] uppercase font-bold text-teal-800 dark:text-teal-200 block">Queue Token Number</span>
                  <span className="text-4xl font-black text-teal-700 dark:text-teal-300 block my-1">#{bookingSuccess.tokenNumber}</span>
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-slate-800/70 px-2 py-0.5 rounded-lg border">
                      {bookingSuccess.tokenCode}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(bookingSuccess.tokenCode);
                        setCopiedToken(true);
                        setTimeout(() => setCopiedToken(false), 2000);
                      }}
                      className="p-1 rounded-md text-slate-500 hover:text-teal-600 hover:bg-white dark:hover:bg-slate-800"
                      title="Copy Token Code"
                    >
                      {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="mt-3 pt-2 border-t border-teal-200/60 dark:border-teal-800/60 text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
                    <span>{bookingSuccess.date}</span>
                    <span>Slot: <strong>{bookingSuccess.timeSlot}</strong></span>
                  </div>
                </div>

                {/* QR Code */}
                <div className="space-y-1">
                  <div className="flex justify-center">
                    <img src={bookingSuccess.qrCode} alt="Token QR" className="w-32 h-32 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 bg-white shadow-sm" />
                  </div>
                  <span className="text-[10px] text-slate-400 block">Show QR at hospital reception or self-service kiosk</span>
                </div>

                {(bookingSuccess.documentsCount > 0 || totalSharedCount > 0) && (
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200 dark:border-indigo-800">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>{bookingSuccess.documentsCount || totalSharedCount} Document(s) securely attached for consultation</span>
                  </div>
                )}

                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={() => { setSelectedDoctor(null); navigate(`/my-queue`); }}
                    className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-600/30 transition flex items-center justify-center space-x-1.5"
                  >
                    <span>Open Live Queue Tracker</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setSelectedDoctor(null)}
                    className="px-5 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs mt-3">
                {/* Step Tabs Header */}
                <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <button
                    type="button"
                    onClick={() => setBookingStep(1)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
                      bookingStep === 1
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
                    <span>Slot & Patient</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedSlot) {
                        alert('Please select a time slot first');
                        return;
                      }
                      setBookingStep(2);
                    }}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold transition ${
                      bookingStep === 2
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
                    <span>Share Documents (Optional)</span>
                    {totalSharedCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 rounded-full bg-teal-200 text-teal-900 text-[10px]">
                        {totalSharedCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* STEP 1: Slot and Patient Details */}
                {bookingStep === 1 && (
                  <div className="space-y-3.5">
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
                      <span className="text-[10px] text-slate-400">Used by HealthMS to calculate your "Leave Now" alert.</span>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        disabled={!selectedSlot}
                        onClick={() => setBookingStep(2)}
                        className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
                      >
                        <span>Next: Share Documents (Optional)</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Pre-Consultation Document Sharing & Consent */}
                {bookingStep === 2 && (
                  <div className="space-y-4">
                    {/* Symptoms / Reason for Visit */}
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                        Reason for Visit / Symptoms (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                        placeholder="Briefly describe what brings you in or any recent symptoms..."
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                      />
                    </div>

                    {/* Document Selection Tabs */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-teal-600" />
                          <span>Attach Records For Dr. {selectedDoctor?.name || selectedDoctor?.user?.name}</span>
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={loadPatientRecords}
                            disabled={recordsLoading}
                            className="p-1 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                            title="Refresh records and medicines"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${recordsLoading ? 'animate-spin' : ''}`} />
                          </button>
                          <span className="text-[10px] text-slate-400">
                            {totalSharedCount} document(s) attached
                          </span>
                        </div>
                      </div>

                      {/* Subtabs: Existing Reports, Medicines, Upload New */}
                      <div className="flex space-x-1 border-b border-slate-200 dark:border-slate-700 pb-2">
                        <button
                          type="button"
                          onClick={() => setRecordsTab('reports')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                            recordsTab === 'reports'
                              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          Medical Reports ({availableReports.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecordsTab('medicines')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                            recordsTab === 'medicines'
                              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          My Medicines ({availableMedicines.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecordsTab('upload')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                            recordsTab === 'upload'
                              ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          + Upload Files ({uploadFiles.length})
                        </button>
                      </div>

                      {/* Tab 1: Available Medical Reports */}
                      {recordsTab === 'reports' && (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {recordsLoading ? (
                            <div className="py-4 flex items-center justify-center space-x-2 text-slate-400 text-xs">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                              <span>Loading reports...</span>
                            </div>
                          ) : availableReports.length === 0 ? (
                            <p className="text-[11px] text-slate-400 text-center py-3">No existing medical reports saved in your profile.</p>
                          ) : (
                            availableReports.map(rep => {
                              const isSelected = selectedReportIds.includes(rep._id);
                              return (
                                <div
                                  key={rep._id}
                                  onClick={() => toggleSelectReport(rep._id)}
                                  className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                                    isSelected
                                      ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-400'
                                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2">
                                    {isSelected ? (
                                      <CheckSquare className="w-4 h-4 text-teal-600 flex-shrink-0" />
                                    ) : (
                                      <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                    )}
                                    <div>
                                      <span className="font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[200px]">
                                        {rep.title}
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        {rep.reportType ? rep.reportType.replace(/_/g, ' ') : 'Medical Report'} • {new Date(rep.reportDate || rep.createdAt).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                  <FileText className="w-4 h-4 text-slate-400" />
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}

                      {/* Tab 2: Available Medicines */}
                      {recordsTab === 'medicines' && (
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {recordsLoading ? (
                            <div className="py-4 flex items-center justify-center space-x-2 text-slate-400 text-xs">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                              <span>Loading medicines...</span>
                            </div>
                          ) : availableMedicines.length === 0 ? (
                            <p className="text-[11px] text-slate-400 text-center py-3">No medicines saved in "My Medicines".</p>
                          ) : (
                            availableMedicines.map(med => {
                              const isSelected = selectedMedicineIds.includes(med._id);
                              return (
                                <div
                                  key={med._id}
                                  onClick={() => toggleSelectMedicine(med._id)}
                                  className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                                    isSelected
                                      ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-400'
                                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2">
                                    {isSelected ? (
                                      <CheckSquare className="w-4 h-4 text-teal-600 flex-shrink-0" />
                                    ) : (
                                      <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                    )}
                                    <div>
                                      <span className="font-bold text-slate-800 dark:text-slate-200 block truncate max-w-[200px]">
                                        {med.brandName || med.name} {med.strength || ''}
                                      </span>
                                      <span className="text-[10px] text-slate-400">
                                        {med.dosageForm || 'Medicine'} • {(med.status || 'currently_taking').replace(/_/g, ' ')}
                                      </span>
                                    </div>
                                  </div>
                                  <Pill className="w-4 h-4 text-slate-400" />
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}

                      {/* Tab 3: Upload New Files */}
                      {recordsTab === 'upload' && (
                        <div className="space-y-2">
                          <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 text-center block cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/80 transition">
                            <UploadCloud className="w-6 h-6 text-teal-600 mx-auto mb-1" />
                            <span className="font-bold text-slate-700 dark:text-slate-300 block">
                              Click or Drag files to attach (PDF, JPG, PNG)
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Uploaded files will automatically sync to your Medical Reports & Health Timeline
                            </span>
                            <input
                              type="file"
                              multiple
                              accept=".pdf,image/png,image/jpeg,image/webp"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </label>

                          {uploadFiles.length > 0 && (
                            <div className="space-y-1 max-h-28 overflow-y-auto">
                              {uploadFiles.map((file, idx) => (
                                <div key={idx} className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-slate-800 border text-[11px]">
                                  <span className="truncate max-w-[220px] font-medium text-slate-800 dark:text-slate-200">{file.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeUploadFile(idx)}
                                    className="text-rose-500 hover:text-rose-700 p-0.5"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Feature B2: Single Required Final Consent Checkbox */}
                    {totalSharedCount > 0 ? (
                      <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-2">
                        <div className="flex items-start space-x-2">
                          <Shield className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-amber-900 dark:text-amber-200 block text-[11px]">
                              Consultation Document Sharing Scope:
                            </span>
                            <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                              Doctor: <strong>Dr. {selectedDoctor?.name || selectedDoctor?.user?.name}</strong> • Documents: <strong>{totalSharedCount} item(s)</strong> • Purpose: <strong>For this appointment's consultation only</strong>.
                            </p>
                          </div>
                        </div>

                        <label className="flex items-start space-x-2.5 pt-1.5 border-t border-amber-200/60 dark:border-amber-800/60 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={documentConsent}
                            onChange={(e) => setDocumentConsent(e.target.checked)}
                            className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="text-[11px] font-medium text-slate-800 dark:text-slate-200 leading-snug">
                            I consent to share the selected documents with Dr. {selectedDoctor?.name || selectedDoctor?.user?.name} for this consultation. The doctor may use assistive software to help review them.
                          </span>
                        </label>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-[11px] text-slate-500 text-center">
                        No documents attached. You can proceed directly with your token generation.
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2">
                      {bookingLoading && (
                        <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs flex items-center space-x-2 animate-pulse">
                          <Sparkles className="w-4 h-4 text-teal-600 animate-spin flex-shrink-0" />
                          <span>Reserving your token and positioning you in the live queue...</span>
                        </div>
                      )}

                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={() => setBookingStep(1)}
                          disabled={bookingLoading}
                          className="px-4 py-2.5 border rounded-xl text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-1 disabled:opacity-50"
                        >
                          <ChevronLeft className="w-4 h-4" />
                          <span>Back</span>
                        </button>

                        <button
                          type="button"
                          disabled={bookingLoading || (totalSharedCount > 0 && !documentConsent)}
                          onClick={handleConfirmBooking}
                          className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-600/30 transition disabled:opacity-50 flex items-center justify-center space-x-2"
                        >
                          {bookingLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Generating Token & Slot...</span>
                            </>
                          ) : (
                            <span>Confirm & Generate Token (₹{selectedDoctor.consultationFee})</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
