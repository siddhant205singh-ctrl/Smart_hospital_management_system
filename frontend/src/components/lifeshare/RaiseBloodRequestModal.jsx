import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import {
  X,
  Droplet,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Send,
  Zap,
  Radio,
  Users
} from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const COMPONENTS = [
  'Packed Red Blood Cells (PRBC)',
  'Platelets',
  'Whole Blood',
  'Fresh Frozen Plasma (FFP)',
  'Cryoprecipitate'
];

export default function RaiseBloodRequestModal({ isOpen, onClose, onSuccess, defaultHospitalId = '' }) {
  const [hospitals, setHospitals] = useState([]);
  const [formData, setFormData] = useState({
    hospitalId: defaultHospitalId || '',
    bloodGroup: 'O+',
    component: 'Packed Red Blood Cells (PRBC)',
    unitsRequested: 2,
    clinicalUrgency: 'urgent_surgery',
    patientName: '',
    clinicalDiagnosis: ''
  });

  const [availableStock, setAvailableStock] = useState(null);
  const [checkingStock, setCheckingStock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [error, setError] = useState('');

  // Fetch Hospitals list
  useEffect(() => {
    if (isOpen) {
      api.get('/hospitals')
        .then(res => {
          const list = res.data.hospitals || [];
          setHospitals(list);
          if (!formData.hospitalId && list.length > 0) {
            setFormData(prev => ({ ...prev, hospitalId: defaultHospitalId || list[0]._id }));
          }
        })
        .catch(err => console.error(err));
    }
  }, [isOpen, defaultHospitalId]);

  // Live Inventory Stock Check
  useEffect(() => {
    if (!isOpen || !formData.bloodGroup || !formData.component) return;

    setCheckingStock(true);
    api.get('/blood-inventory/public')
      .then(res => {
        const bgData = res.data?.bloodGroups?.[formData.bloodGroup];
        if (bgData && bgData.components) {
          const count = bgData.components[formData.component] ?? 0;
          setAvailableStock(count);
        } else {
          setAvailableStock(0);
        }
      })
      .catch(() => setAvailableStock(0))
      .finally(() => setCheckingStock(false));
  }, [isOpen, formData.bloodGroup, formData.component, formData.hospitalId]);

  if (!isOpen) return null;

  const isStockDeficit = availableStock !== null && availableStock < Number(formData.unitsRequested);
  const deficitCount = isStockDeficit ? (Number(formData.unitsRequested) - availableStock) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await api.post('/blood-requests', {
        ...formData,
        unitsRequested: Number(formData.unitsRequested)
      });

      setResultData(res.data);
      if (onSuccess) onSuccess(res.data.bloodRequest);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit blood request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setResultData(null);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-rose-600 via-rose-700 to-red-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Droplet className="w-5 h-5 text-rose-100 fill-rose-100" />
            </div>
            <div>
              <h2 className="font-bold text-sm">Raise Clinical Blood Request</h2>
              <p className="text-[11px] text-rose-100">
                Blood Officer & Hospital Command • Auto-starts Voluntary Drive on Low Stock
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-lg hover:bg-white/20 text-rose-100 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Confirmation View */}
        {resultData ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Blood Request Logged Successfully!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Request ID: <span className="font-mono font-bold text-rose-600">{resultData.bloodRequest?.requestId}</span>
              </p>
            </div>

            {/* Voluntary Donation Result Banner */}
            {resultData.voluntaryDonationStarted ? (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-900 text-left space-y-2">
                <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-300 font-bold text-xs">
                  <Radio className="w-4 h-4 text-rose-600 animate-pulse" />
                  <span>Voluntary Blood Donation Drive Activated!</span>
                </div>
                <p className="text-xs text-rose-800 dark:text-rose-200">
                  {resultData.message}
                </p>
                <div className="flex items-center space-x-2 text-[11px] text-rose-700 dark:text-rose-300 font-medium">
                  <Users className="w-3.5 h-3.5" />
                  <span><strong>{resultData.matchedDonorsCount || 0}</strong> compatible voluntary donors have received real-time push alerts.</span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-900 text-left text-xs text-emerald-800 dark:text-emerald-200">
                ✅ Stock was verified. <strong>{resultData.inventoryCheck?.availableUnits} units</strong> are ready in the blood bank for cross-matching and unit allocation.
              </div>
            )}

            <button
              onClick={handleResetAndClose}
              className="w-full py-2.5 bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition"
            >
              Done & Return to Dashboard
            </button>
          </div>
        ) : (
          /* Input Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Hospital Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Hospital Center / Blood Bank
              </label>
              <select
                value={formData.hospitalId}
                onChange={(e) => setFormData({ ...formData, hospitalId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                required
              >
                {hospitals.map(h => (
                  <option key={h._id} value={h._id}>
                    {h.name} ({h.city})
                  </option>
                ))}
              </select>
            </div>

            {/* Blood Group Chips */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Target Blood Group
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {BLOOD_GROUPS.map(bg => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => setFormData({ ...formData, bloodGroup: bg })}
                    className={`py-1.5 rounded-xl font-bold text-xs transition border ${
                      formData.bloodGroup === bg
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-rose-50'
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>

            {/* Component and Units */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Component Type
                </label>
                <select
                  value={formData.component}
                  onChange={(e) => setFormData({ ...formData, component: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  {COMPONENTS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Units Needed
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.unitsRequested}
                  onChange={(e) => setFormData({ ...formData, unitsRequested: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  required
                />
              </div>
            </div>

            {/* Live Stock Check Indicator */}
            <div className="p-3 rounded-2xl border text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-600 dark:text-slate-400">
                  Current Blood Bank Stock ({formData.bloodGroup} {formData.component.split(' ')[0]}):
                </span>
                <span className="font-mono font-bold">
                  {checkingStock ? 'Checking...' : `${availableStock ?? 0} units available`}
                </span>
              </div>

              {isStockDeficit ? (
                <div className="mt-2 p-2 bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-[11px] flex items-start space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">
                      ⚠️ Stock Deficit Alert (Deficit: {deficitCount} units)
                    </span>
                    <span>
                      Submitting this request will <strong>automatically trigger an emergency voluntary donation call</strong> across the LifeShare donor network.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-200 text-[11px] flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Sufficient stock available for immediate cross-matching and unit allocation.</span>
                </div>
              )}
            </div>

            {/* Urgency and Patient / Case Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Clinical Urgency
                </label>
                <select
                  value={formData.clinicalUrgency}
                  onChange={(e) => setFormData({ ...formData, clinicalUrgency: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                >
                  <option value="critical_emergency">🚨 Critical Emergency (Immediate Transfusion)</option>
                  <option value="urgent_surgery">⏳ Urgent Surgery (Within 4 Hours)</option>
                  <option value="routine_opd">📋 Routine OPD / Scheduled Procedure</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Patient / Department Case ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma / ICU Trauma Bed 4"
                  value={formData.patientName}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  required
                />
              </div>
            </div>

            {/* Clinical Diagnosis */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Clinical Indication / Diagnosis
              </label>
              <textarea
                rows="2"
                placeholder="e.g. Acute trauma hemorrhagic shock, open heart bypass surgery, severe anemia..."
                value={formData.clinicalDiagnosis}
                onChange={(e) => setFormData({ ...formData, clinicalDiagnosis: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                required
              ></textarea>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-50"
              >
                {submitting ? (
                  <span>Processing Blood Request & Stock Check...</span>
                ) : isStockDeficit ? (
                  <>
                    <Radio className="w-4 h-4 text-white animate-pulse" />
                    <span>Log Request & Start Voluntary Donation Drive</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Request & Prepare Units</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
