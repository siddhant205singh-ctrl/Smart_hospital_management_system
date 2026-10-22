import React, { useState, useEffect } from 'react';
import api from '../../services/api';
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
  QrCode,
  DollarSign,
  ShieldCheck,
  Stethoscope
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
  const [walkinDoctorId, setWalkinDoctorId] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [walkinSuccess, setWalkinSuccess] = useState(null);

  // Community Card Checkout Scanner state
  const [scanCardNumber, setScanCardNumber] = useState('SC-GOLD-84920');
  const [serviceCategory, setServiceCategory] = useState('outpatient_consultation');
  const [billAmount, setBillAmount] = useState(1500);
  const [isAdmissionLinked, setIsAdmissionLinked] = useState(false);
  const [discountResult, setDiscountResult] = useState(null);
  const [discountError, setDiscountError] = useState('');

  const fetchData = async () => {
    try {
      const [overRes, analRes, docsRes] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/analytics'),
        api.get('/doctors')
      ]);
      setOverview(overRes.data);
      setAnalytics(analRes.data);
      setDoctors(docsRes.data.doctors || []);
      if (docsRes.data.doctors?.length > 0) {
        setWalkinDoctorId(docsRes.data.doctors[0]._id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateWalkIn = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/walk-in', {
        patientName: walkinName,
        phone: walkinPhone,
        doctorId: walkinDoctorId
      });
      setWalkinSuccess(res.data.appointment);
      setWalkinName('');
      setWalkinPhone('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create walk-in token');
    }
  };

  const handleApplyCardDiscount = async (e) => {
    e.preventDefault();
    setDiscountError('');
    setDiscountResult(null);
    try {
      const res = await api.post('/discount-applications/apply', {
        cardNumber: scanCardNumber,
        serviceCategory,
        originalBillAmount: Number(billAmount),
        isAdmissionLinked
      });
      setDiscountResult(res.data);
    } catch (err) {
      setDiscountError(err.response?.data?.error || 'Failed to apply discount');
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
              <p className="text-xs text-slate-400">SmartCare Dynamic Engine vs. Traditional Hospital Walk-in</p>
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
                <Line type="monotone" dataKey="smartCareWait" stroke="#0d9488" name="SmartCare Wait (mins)" strokeWidth={3} />
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

      {/* Operations Row: Receptionist Walk-in Token Creator + Community Card OPD Billing Scanner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rapid Walk-in Generator */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <Plus className="w-5 h-5 text-teal-600" />
              <span>Receptionist Rapid Walk-in Generator</span>
            </h3>
            <p className="text-xs text-slate-500">For non-smartphone patients arriving directly at reception counter.</p>
          </div>

          {walkinSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between">
              <span>Token Generated: <strong>#{walkinSuccess.tokenNumber} ({walkinSuccess.tokenCode})</strong></span>
              <span className="text-[11px] font-bold text-emerald-600">Checked In ✓</span>
            </div>
          )}

          <form onSubmit={handleCreateWalkIn} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold block mb-1">Patient Name</label>
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
              <label className="font-semibold block mb-1">Mobile Phone (for SMS updates)</label>
              <input
                type="tel"
                required
                value={walkinPhone}
                onChange={(e) => setWalkinPhone(e.target.value)}
                placeholder="+91-9876543210"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Assign Doctor</label>
              <select
                value={walkinDoctorId}
                onChange={(e) => setWalkinDoctorId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                {doctors.map(d => (
                  <option key={d._id} value={d._id}>
                    {d.userId?.name} ({d.specialty} - Room {d.roomNumber})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition"
            >
              Print Walk-in Token & Push to Queue
            </button>
          </form>
        </div>

        {/* Community Card OPD Checkout Scanner with Compliance Guard */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
              <QrCode className="w-5 h-5 text-amber-500" />
              <span>Community Card OPD Discount Scanner</span>
            </h3>
            <p className="text-xs text-slate-500">Scan donor's digital card to verify tier and apply outpatient discount.</p>
          </div>

          {discountError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 text-rose-800 dark:text-rose-200 text-xs">
              <AlertTriangle className="w-4 h-4 text-rose-600 mb-0.5" />
              <span>{discountError}</span>
            </div>
          )}

          {discountResult && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs space-y-1">
              <strong className="block font-bold">Discount Applied ({discountResult.discountPercentage}% OFF)</strong>
              <span>Original: ₹{discountResult.originalAmount} → Saved: ₹{discountResult.discountAmount} → <strong>Final: ₹{discountResult.finalPayableAmount}</strong></span>
              <span className="text-[10px] text-slate-400 block">Txn: {discountResult.transactionId}</span>
            </div>
          )}

          <form onSubmit={handleApplyCardDiscount} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold block mb-1">Card Number (from scanned QR)</label>
              <input
                type="text"
                required
                value={scanCardNumber}
                onChange={(e) => setScanCardNumber(e.target.value)}
                placeholder="e.g. SC-GOLD-84920"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">Service Category</label>
                <select
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="outpatient_consultation">OPD Consultation</option>
                  <option value="diagnostics_lab">Diagnostics Lab</option>
                  <option value="radiology_scans">Radiology Scans</option>
                  <option value="pharmacy_opd">OPD Pharmacy</option>
                  <option value="health_checkup_packages">Health Checkup Package</option>
                  <option value="inpatient_admission">Inpatient Admission (Compliance Test)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Bill Amount (₹)</label>
                <input
                  type="number"
                  min="50"
                  required
                  value={billAmount}
                  onChange={(e) => setBillAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                />
              </div>
            </div>

            {/* Compliance simulation toggle */}
            <label className="flex items-center space-x-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 cursor-pointer">
              <input
                type="checkbox"
                checked={isAdmissionLinked}
                onChange={(e) => setIsAdmissionLinked(e.target.checked)}
                className="rounded text-amber-600"
              />
              <span className="text-[11px] text-amber-900 dark:text-amber-200">
                Simulate: Bill is linked to Inpatient Hospital Admission (Tests Compliance Rejection)
              </span>
            </label>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md transition"
            >
              Verify Card & Apply Tier Discount
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
