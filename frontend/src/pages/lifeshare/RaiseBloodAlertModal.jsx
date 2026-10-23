import React, { useState } from 'react';
import api from '../../services/api';
import {
  Droplet,
  AlertTriangle,
  X,
  Sparkles,
  Users,
  Building2,
  Clock,
  Phone
} from 'lucide-react';

export default function RaiseBloodAlertModal({ isOpen, onClose, onAlertCreated, hospitalName }) {
  const [form, setForm] = useState({
    bloodGroup: 'B+',
    component: 'Packed Red Blood Cells (PRBC)',
    unitsNeeded: 3,
    urgency: 'Critical',
    matchingMode: 'exact_match',
    contactDesk: 'Hospital Blood Bank Ground Floor Counter (Room 004)',
    contactPhone: '+91-11-26925858',
    radiusKm: 20,
    validHours: 12
  });
  const [loading, setLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResultMsg('');
    try {
      const res = await api.post('/blood-alerts', form);
      setResultMsg(res.data.message);
      if (onAlertCreated) onAlertCreated(res.data.alert);
      setTimeout(() => {
        onClose();
        setResultMsg('');
      }, 2000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to raise blood shortage alert');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 my-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center font-bold">
              <Droplet className="w-4 h-4 fill-rose-600" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Raise Blood Shortage Alert</h3>
              <span className="text-[10px] text-slate-400">Targeted real-time notification to matching eligible donors</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {resultMsg && (
          <div className="my-3 p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
            ✓ {resultMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Blood Group Needed</label>
              <select
                value={form.bloodGroup}
                onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-black text-rose-600 text-sm"
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold block mb-1">Units Required</label>
              <input
                type="number"
                min="1"
                max="50"
                required
                value={form.unitsNeeded}
                onChange={(e) => setForm({ ...form, unitsNeeded: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Blood Component</label>
              <select
                value={form.component}
                onChange={(e) => setForm({ ...form, component: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              >
                <option value="Packed Red Blood Cells (PRBC)">PRBC</option>
                <option value="Platelets">Platelets</option>
                <option value="Whole Blood">Whole Blood</option>
                <option value="Fresh Frozen Plasma (FFP)">FFP</option>
              </select>
            </div>

            <div>
              <label className="font-semibold block mb-1">Urgency Level</label>
              <select
                value={form.urgency}
                onChange={(e) => setForm({ ...form, urgency: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              >
                <option value="Critical">🚨 Critical (Widened Radius)</option>
                <option value="High">⚠️ High Urgency</option>
                <option value="Normal">Standard Shortage</option>
              </select>
            </div>
          </div>

          {/* Matching Mode Selector (Exact vs Compatible) */}
          <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900 space-y-2">
            <span className="font-bold text-rose-900 dark:text-rose-200 block">
              Donor Matching Logic:
            </span>
            <div className="space-y-1.5">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="matchingMode"
                  value="exact_match"
                  checked={form.matchingMode === 'exact_match'}
                  onChange={() => setForm({ ...form, matchingMode: 'exact_match' })}
                  className="text-rose-600"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Exact Match Only ({form.bloodGroup} donors exclusively)
                </span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="matchingMode"
                  value="include_compatible"
                  checked={form.matchingMode === 'include_compatible'}
                  onChange={() => setForm({ ...form, matchingMode: 'include_compatible' })}
                  className="text-rose-600"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Include Medically Compatible Donors (Per standard transfusion compatibility)
                </span>
              </label>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              Only alerts donors who are eligible (donation gap enforced), opted-in, and within the hospital's vicinity.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold block mb-1">Contact Desk / Counter</label>
              <input
                type="text"
                required
                value={form.contactDesk}
                onChange={(e) => setForm({ ...form, contactDesk: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="font-semibold block mb-1">Desk Phone Number</label>
              <input
                type="tel"
                required
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500">
            ✓ Strictly complies with NBTC: All notifications clearly state that blood donation is 100% voluntary and unpaid. No patient names or sensitive clinical details are exposed.
          </div>

          <div className="flex space-x-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center space-x-1.5"
            >
              <Droplet className="w-4 h-4 fill-white" />
              <span>{loading ? 'Broadcasting Alert...' : 'Dispatch Emergency Shortage Alert'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 border rounded-xl font-semibold text-slate-500"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
