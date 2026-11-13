import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import RaiseBloodRequestModal from '../../components/lifeshare/RaiseBloodRequestModal';
import StaffCredentialingDesk from '../../components/admin/StaffCredentialingDesk';
import {
  Users,
  Clock,
  Activity,
  AlertTriangle,
  Building2,
  TrendingDown,
  Calendar,
  CheckCircle,
  Plus,
  Zap,
  ShieldCheck,
  Stethoscope,
  Heart,
  Droplet,
  Radio,
  Send,
  Printer,
  Loader2,
  CheckCircle2,
  Phone,
  UserCheck,
  RotateCcw
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Walk-in form state
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinSpecialty, setWalkinSpecialty] = useState('');
  const [walkinDoctorId, setWalkinDoctorId] = useState('');
  const [walkinRoom, setWalkinRoom] = useState('');
  const [walkinSymptoms, setWalkinSymptoms] = useState('');
  const [walkinSubmitting, setWalkinSubmitting] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [walkinSuccess, setWalkinSuccess] = useState(null);

  // Donor Family Fast-Track Policy State
  const [fastTrackSettings, setFastTrackSettings] = useState({
    minDonationsForFastTrack: 1,
    activeDonationMaxMonths: 12,
    waiveProcessingFee: true,
    waiveReplacementDonor: true,
    preVerifyPaperwork: true,
    annualCapPerFamily: 4
  });
  const [fastTrackSavedMsg, setFastTrackSavedMsg] = useState('');
  const [fastTrackError, setFastTrackError] = useState('');
  const [breakGlassLogs, setBreakGlassLogs] = useState([]);

  // Hospital Blood Requests State
  const [bloodRequests, setBloodRequests] = useState([]);
  const [showBloodRequestModal, setShowBloodRequestModal] = useState(false);

  const fetchData = async () => {
    try {
      const [overRes, analRes, docsRes, bgRes, ftRes, bldRes] = await Promise.all([
        api.get('/admin/overview').catch(() => ({ data: null })),
        api.get('/admin/analytics').catch(() => ({ data: null })),
        api.get('/doctors').catch(() => ({ data: { doctors: [] } })),
        api.get('/emergency-cases/break-glass-logs').catch(() => ({ data: { logs: [] } })),
        api.get('/fast-track/settings').catch(() => ({ data: { settings: null } })),
        api.get('/blood-requests').catch(() => ({ data: { requests: [] } }))
      ]);
      if (overRes.data) setOverview(overRes.data);
      if (analRes.data) setAnalytics(analRes.data);
      const docsList = docsRes.data.doctors || [];
      setDoctors(docsList);
      setBreakGlassLogs(bgRes.data.logs || []);
      setBloodRequests(bldRes.data.requests || []);
      if (ftRes.data?.settings) {
        setFastTrackSettings(ftRes.data.settings);
      }
      if (docsList.length > 0) {
        setWalkinDoctorId(prev => prev || docsList[0]._id);
        setWalkinSpecialty(prev => prev || docsList[0].specialty || '');
        setWalkinRoom(prev => prev || docsList[0].roomNumber || 'OPD-101');
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSpecialtyChange = (spec) => {
    setWalkinSpecialty(spec);
    const docsInSpec = spec ? doctors.filter(d => d.specialty?.toLowerCase() === spec.toLowerCase()) : doctors;
    if (docsInSpec.length > 0) {
      setWalkinDoctorId(docsInSpec[0]._id);
      setWalkinRoom(docsInSpec[0].roomNumber || 'OPD-101');
    } else {
      setWalkinDoctorId('');
      setWalkinRoom('');
    }
  };

  const handleDoctorChange = (docId) => {
    setWalkinDoctorId(docId);
    const doc = doctors.find(d => d._id === docId);
    if (doc) {
      setWalkinRoom(doc.roomNumber || 'OPD-101');
      if (doc.specialty) setWalkinSpecialty(doc.specialty);
    }
  };

  const handleCreateWalkIn = async (e) => {
    e.preventDefault();
    if (!walkinName.trim() || !walkinPhone.trim() || !walkinDoctorId) {
      alert('Please fill in patient name, mobile phone number, and select an assigned doctor.');
      return;
    }
    setWalkinSubmitting(true);
    const submittedPhone = walkinPhone.trim();
    const submittedRoom = walkinRoom.trim();
    try {
      const res = await api.post('/admin/walk-in', {
        patientName: walkinName.trim(),
        phone: submittedPhone,
        doctorId: walkinDoctorId,
        roomNumber: submittedRoom,
        symptoms: walkinSymptoms.trim()
      });
      setWalkinSuccess({
        ...res.data.appointment,
        patientPhone: res.data.appointment?.patientPhone || res.data.smsTo || res.data.appointment?.patientId?.phone || submittedPhone,
        roomNumber: res.data.appointment?.roomNumber || res.data.assignedRoom || submittedRoom
      });
      setWalkinName('');
      setWalkinPhone('');
      setWalkinSymptoms('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create walk-in token');
    } finally {
      setWalkinSubmitting(false);
    }
  };

  const handleUpdateFastTrack = async (e) => {
    e.preventDefault();
    setFastTrackSavedMsg('');
    setFastTrackError('');
    try {
      const res = await api.put('/fast-track/settings', fastTrackSettings);
      setFastTrackSettings(res.data.settings);
      setFastTrackSavedMsg('Donor Family Fast-Track policy successfully updated!');
      setTimeout(() => setFastTrackSavedMsg(''), 4000);
    } catch (err) {
      setFastTrackError(err.response?.data?.error || 'Failed to update Fast-Track policy');
    }
  };

  const handleVerifyDoctor = async (docId) => {
    try {
      await api.put(`/doctors/${docId}/verify`);
      alert('Doctor credentials verified! Verified Doctor Badge awarded.');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to verify doctor');
    }
  };

  const handleFlagMisuse = async (logId) => {
    const reason = prompt('Enter clinical audit reason for flagging this Break-Glass access:', 'Suspected unauthorized access without clinical resuscitation need');
    if (!reason) return;
    try {
      await api.put(`/emergency-cases/break-glass/${logId}/flag`, { adminReviewNotes: reason });
      alert('Break-Glass access flagged for clinical governance hearing.');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to flag misuse');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading Hospital Command Center...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 radar-live"></span>
            <span className="text-xs font-bold uppercase text-teal-600">Hospital Central Command</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            Real-Time Hospital & Queue Overview
          </h1>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="px-3 py-1.5 bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200 rounded-xl font-bold border border-teal-200 dark:border-teal-800">
            Average Wait: 19 mins (72% Lower)
          </span>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 block">Total In Flow Today</span>
          <span className="text-3xl font-black text-slate-900 dark:text-white mt-1 block">
            {overview?.stats?.todayTotal || 42}
          </span>
          <span className="text-[10px] text-teal-600 font-semibold">Active Tokens Streamed</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 block">Currently Waiting</span>
          <span className="text-3xl font-black text-amber-600 mt-1 block">
            {overview?.stats?.waiting || 8}
          </span>
          <span className="text-[10px] text-slate-400">In OPD lounges</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 block">In Consultation</span>
          <span className="text-3xl font-black text-teal-600 mt-1 block">
            {overview?.stats?.inConsultation || 3}
          </span>
          <span className="text-[10px] text-slate-400">Active doctor rooms</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 block">Completed Visits</span>
          <span className="text-3xl font-black text-emerald-600 mt-1 block">
            {overview?.stats?.completed || 28}
          </span>
          <span className="text-[10px] text-slate-400">With prescription</span>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-400 block">No-Show Rate</span>
          <span className="text-3xl font-black text-slate-700 dark:text-slate-300 mt-1 block">
            {analytics?.noShowRate || 6}%
          </span>
          <span className="text-[10px] text-emerald-600 font-semibold">Low (Industry avg: 22%)</span>
        </div>
      </div>

      {/* Analytics Charts: Wait Time Comparison & Peak Arrival Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Wait Time Comparison Line Chart */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Waiting Time Reduction Impact (Minutes)
              </h3>
              <p className="text-xs text-slate-400">HealthMS Dynamic Engine vs. Traditional Hospital Walk-in</p>
            </div>
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-xl">
              -72% Wait Time
            </span>
          </div>

          <div className="h-56 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.waitTimeTrends || []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="traditionalWait" stroke="#f43f5e" name="Traditional Wait (mins)" strokeWidth={2} />
                <Line type="monotone" dataKey="smartCareWait" stroke="#0d9488" name="HealthMS Wait (mins)" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Arrival Hours Bar Chart */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Peak Arrival Hours</h3>
            <p className="text-xs text-slate-400">Patient arrival density across OPD time slots</p>
          </div>

          <div className="h-56 sm:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics?.hourlyDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }} />
                <Bar dataKey="patients" fill="#14b8a6" radius={[6, 6, 0, 0]} name="Patients" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Department Overcrowding Indicator Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
          <Building2 className="w-5 h-5 text-teal-600" />
          <span>Department Overcrowding & Flow Indicators</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {overview?.departments?.map((dept, idx) => (
            <div key={idx} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-white">{dept.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    dept.overcrowdingLevel === 'High'
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      : dept.overcrowdingLevel === 'Medium'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {dept.overcrowdingLevel} Load
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Hospital: <strong>{dept.hospitalName}</strong>
              </p>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/50 dark:border-slate-700">
                <span>Waiting in Lounge: <strong>{dept.currentlyWaiting}</strong></span>
                <span className="text-slate-400">Total Today: {dept.totalToday}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operations Row: Receptionist Walk-in Token Creator + Donor Family Fast-Track Governance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rapid Walk-in Generator */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <Plus className="w-5 h-5 text-teal-600" />
              <span>Walk-in Token Generator & OPD Desk</span>
            </h3>
            <p className="text-xs text-slate-500">
              Select medical specialty, assign doctor and OPD room, and send instant SMS token confirmation to patient.
            </p>
          </div>

          {/* Token Generated Success Card */}
          {walkinSuccess && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-base font-black text-emerald-800 dark:text-emerald-200 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Token #{walkinSuccess.tokenNumber} ({walkinSuccess.tokenCode})</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  Checked In ✓
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60 text-slate-700 dark:text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Assigned Doctor:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {walkinSuccess.doctorId?.userId?.name || 'Assigned Physician'}
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    {walkinSuccess.doctorId?.specialty || walkinSpecialty || 'General'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Assigned OPD Room:</span>
                  <span className="font-bold text-teal-700 dark:text-teal-300">
                    Room {walkinSuccess.roomNumber || walkinSuccess.doctorId?.roomNumber || 'OPD-101'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Patient:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {walkinSuccess.bookedForFamilyMember || walkinSuccess.patientId?.name || 'Walk-in Patient'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Mobile Phone:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">
                    {walkinSuccess.patientPhone || walkinSuccess.patientId?.phone || 'Confidential'}
                  </span>
                </div>
              </div>

              <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-emerald-200 dark:border-emerald-800/50 flex items-center space-x-2 text-[11px] text-emerald-700 dark:text-emerald-300">
                <Phone className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>
                  Booking confirmation SMS & token alert dispatched to <strong>{walkinSuccess.patientPhone || walkinSuccess.patientId?.phone}</strong>
                </span>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center space-x-1 transition shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Token Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWalkinSuccess(null)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center space-x-1 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Issue Another Token</span>
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleCreateWalkIn} className="space-y-3.5 text-xs">
            {/* 1. Doctor Type / Medical Specialty */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Doctor Type / Medical Specialty
              </label>
              <select
                value={walkinSpecialty}
                onChange={(e) => handleSpecialtyChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
              >
                <option value="">All Medical Specialties (All Available Doctors)</option>
                {Array.from(new Set(doctors.map(d => d.specialty).filter(Boolean))).map(spec => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. Assign Doctor & Assigned OPD Room */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Assign Doctor
                </label>
                <select
                  required
                  value={walkinDoctorId}
                  onChange={(e) => handleDoctorChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                >
                  {(walkinSpecialty ? doctors.filter(d => d.specialty?.toLowerCase() === walkinSpecialty.toLowerCase()) : doctors).map(d => (
                    <option key={d._id} value={d._id}>
                      {d.userId?.name || 'Physician'} ({d.specialty} • Room {d.roomNumber || 'OPD-101'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  OPD Room
                </label>
                <input
                  type="text"
                  required
                  value={walkinRoom}
                  onChange={(e) => setWalkinRoom(e.target.value)}
                  placeholder="e.g. OPD-101"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold text-teal-700 dark:text-teal-300"
                />
              </div>
            </div>

            {/* 3. Patient Name & Mobile Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Patient Full Name
                </label>
                <input
                  type="text"
                  required
                  value={walkinName}
                  onChange={(e) => setWalkinName(e.target.value)}
                  placeholder="Walk-in Patient Name"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Patient Mobile Number (for SMS confirmation)
                </label>
                <input
                  type="tel"
                  required
                  value={walkinPhone}
                  onChange={(e) => setWalkinPhone(e.target.value)}
                  placeholder="+91-9876543210"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                />
              </div>
            </div>

            {/* 4. Reason for Visit / Symptoms */}
            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Reason for Visit / Symptoms (Optional)
              </label>
              <input
                type="text"
                value={walkinSymptoms}
                onChange={(e) => setWalkinSymptoms(e.target.value)}
                placeholder="Brief reason for walk-in consultation..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <button
              type="submit"
              disabled={walkinSubmitting || !walkinDoctorId}
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition disabled:opacity-60 flex items-center justify-center space-x-2"
            >
              {walkinSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Generating Token & Sending Confirmation...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Generate Token, Assign Room & Send SMS</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Donor Family Fast-Track Policy & Governance Console */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span>Donor Family Fast-Track Governance</span>
            </h3>
            <p className="text-xs text-slate-500">Configure administrative exemptions for verified blood donors & families. Clinical urgency strictly dictates blood units allocation.</p>
          </div>

          {fastTrackError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 text-rose-800 dark:text-rose-200 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 mb-0.5" />
              <span>{fastTrackError}</span>
            </div>
          )}

          {fastTrackSavedMsg && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{fastTrackSavedMsg}</span>
            </div>
          )}

          <form onSubmit={handleUpdateFastTrack} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Min. Verified Donations</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={fastTrackSettings.minDonationsForFastTrack}
                  onChange={(e) => setFastTrackSettings({ ...fastTrackSettings, minDonationsForFastTrack: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1">Active Window (Months)</label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  required
                  value={fastTrackSettings.activeDonationMaxMonths}
                  onChange={(e) => setFastTrackSettings({ ...fastTrackSettings, activeDonationMaxMonths: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <label className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fastTrackSettings.waiveProcessingFee}
                  onChange={(e) => setFastTrackSettings({ ...fastTrackSettings, waiveProcessingFee: e.target.checked })}
                  className="rounded text-teal-600 w-4 h-4"
                />
                <div className="text-left">
                  <span className="font-bold text-slate-800 dark:text-white block">Waive Blood Bank Processing Fee (₹0)</span>
                  <span className="text-[11px] text-slate-500">Exempt verified donors & verified family from handling charges.</span>
                </div>
              </label>

              <label className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fastTrackSettings.waiveReplacementDonor}
                  onChange={(e) => setFastTrackSettings({ ...fastTrackSettings, waiveReplacementDonor: e.target.checked })}
                  className="rounded text-teal-600 w-4 h-4"
                />
                <div className="text-left">
                  <span className="font-bold text-slate-800 dark:text-white block">Waive Replacement Donor Mandate</span>
                  <span className="text-[11px] text-slate-500">Allow instant unit dispatch without replacement donation requirement.</span>
                </div>
              </label>

              <label className="flex items-center space-x-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fastTrackSettings.preVerifyPaperwork}
                  onChange={(e) => setFastTrackSettings({ ...fastTrackSettings, preVerifyPaperwork: e.target.checked })}
                  className="rounded text-teal-600 w-4 h-4"
                />
                <div className="text-left">
                  <span className="font-bold text-slate-800 dark:text-white block">Pre-Verified Paperwork Streamlining</span>
                  <span className="text-[11px] text-slate-500">Display pre-authenticated status to Officer directly in queue.</span>
                </div>
              </label>
            </div>

            <div className="pt-1">
              <label className="font-semibold block mb-1">Annual Fee-Waived Units Cap per Family</label>
              <input
                type="number"
                min="1"
                max="20"
                value={fastTrackSettings.annualCapPerFamily}
                onChange={(e) => setFastTrackSettings({ ...fastTrackSettings, annualCapPerFamily: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-1.5"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Update Fast-Track Policy</span>
            </button>
          </form>
        </div>
      </div>

      {/* Break-Glass Governance Audit Logs */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-rose-600" />
              <span>Emergency Break-Glass Access Audit Logs ({breakGlassLogs.length})</span>
            </h3>
            <p className="text-xs text-slate-500">
              Statutory clinical governance review for all 24-hour emergency records unmasked without consent.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                <th className="pb-2.5">Case #</th>
                <th className="pb-2.5">Physician</th>
                <th className="pb-2.5">Patient</th>
                <th className="pb-2.5">Clinical Reason & Justification</th>
                <th className="pb-2.5">Records Inspected</th>
                <th className="pb-2.5">Timestamp</th>
                <th className="pb-2.5 text-right">Governance Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {breakGlassLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-4 text-center text-slate-400">No emergency break-glass accesses recorded.</td>
                </tr>
              ) : (
                breakGlassLogs.map(log => (
                  <tr key={log._id} className="py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 font-mono font-bold text-slate-900 dark:text-white">
                      {log.emergencyCaseId?.caseNumber || 'EM-CASE'}
                    </td>
                    <td className="py-2.5 font-bold text-teal-700 dark:text-teal-300">
                      Dr. {log.doctorId?.name || log.doctorName}
                    </td>
                    <td className="py-2.5 font-semibold text-slate-800 dark:text-slate-200">
                      {log.patientId?.name}
                    </td>
                    <td className="py-2.5 max-w-xs">
                      <strong className="block text-rose-600 capitalize text-[11px]">{log.reason?.replace(/_/g, ' ')}</strong>
                      <span className="text-slate-500 text-[10px] truncate block">{log.clinicalJustification}</span>
                    </td>
                    <td className="py-2.5 text-[10px] text-slate-400">
                      {log.recordsViewed?.slice(0, 2).join(', ')}...
                    </td>
                    <td className="py-2.5 text-slate-400 text-[10px]">
                      {new Date(log.accessedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-2.5 text-right">
                      {log.flaggedByAdmin ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                          Flagged for Review
                        </span>
                      ) : (
                        <button
                          onClick={() => handleFlagMisuse(log._id)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-rose-100 hover:text-rose-700 rounded-lg font-bold text-[10px] transition"
                        >
                          Flag Misuse
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hospital Blood Stock & Emergency Requests Module */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <Droplet className="w-5 h-5 text-rose-600 fill-rose-600" />
              <span>Hospital Blood Stock & Emergency Requests</span>
            </h3>
            <p className="text-xs text-slate-500">
              Raise clinical blood requests for hospital departments or patients. If inventory is insufficient, the system automatically starts an urgent voluntary donation drive.
            </p>
          </div>
          <button
            onClick={() => setShowBloodRequestModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/30 flex items-center space-x-1.5 transition"
          >
            <Droplet className="w-4 h-4 fill-white" />
            <span>Raise Blood Request (Auto Voluntary Drive)</span>
          </button>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                <th className="pb-2.5">Request ID</th>
                <th className="pb-2.5">Patient / Department</th>
                <th className="pb-2.5">Blood & Component</th>
                <th className="pb-2.5">Urgency</th>
                <th className="pb-2.5">Voluntary Drive</th>
                <th className="pb-2.5">Fast-Track Status</th>
                <th className="pb-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {bloodRequests.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-4 text-center text-slate-400">
                    No active blood requests logged yet. Click "Raise Blood Request" to log a new clinical requirement.
                  </td>
                </tr>
              ) : (
                bloodRequests.slice(0, 8).map(req => (
                  <tr key={req._id} className="py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 font-mono font-bold text-slate-900 dark:text-white">
                      {req.requestId}
                    </td>
                    <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">
                      {req.patientName || req.patientId?.name || 'Emergency Dept'}
                      <span className="block text-[10px] text-slate-400 font-normal truncate max-w-xs">
                        {req.clinicalDiagnosis}
                      </span>
                    </td>
                    <td className="py-2.5 font-bold text-rose-600 dark:text-rose-400">
                      {req.bloodGroup} • {req.unitsRequested} Unit(s)
                      <span className="block text-[10px] text-slate-400 font-normal">{req.component}</span>
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        req.clinicalUrgency === 'critical_emergency'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : req.clinicalUrgency === 'urgent_surgery'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {req.clinicalUrgency?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5">
                      {req.voluntaryDonationStarted ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-bold border border-rose-300 dark:border-rose-800">
                          <Radio className="w-3 h-3 text-rose-600 animate-pulse" />
                          <span>Active Drive</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Stock Sufficient</span>
                      )}
                    </td>
                    <td className="py-2.5">
                      {req.fastTrackApplied ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-bold">
                          <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>Pre-Verified</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Standard</span>
                      )}
                    </td>
                    <td className="py-2.5 font-semibold capitalize text-slate-700 dark:text-slate-300">
                      {req.status?.replace('_', ' ')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Credentialing & Medical Council Verification Desk */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <StaffCredentialingDesk />
      </div>

      {/* Hospital Blood Request Modal with Auto Voluntary Donation Check */}
      <RaiseBloodRequestModal
        isOpen={showBloodRequestModal}
        onClose={() => setShowBloodRequestModal(false)}
        onSuccess={() => fetchData()}
      />
    </div>
  );
}
