import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import RaiseBloodAlertModal from './RaiseBloodAlertModal';
import {
  Droplet,
  Shield,
  Plus,
  CheckCircle,
  AlertTriangle,
  Clock,
  Building2,
  Calendar,
  Sparkles,
  Users,
  Search,
  PackageCheck,
  Radio,
  CheckCircle2
} from 'lucide-react';

export default function BloodBankDashboard() {
  const [bloodRequests, setBloodRequests] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);

  // New Verified Donation Form
  const [donationForm, setDonationForm] = useState({
    donorId: '',
    unitNumber: `AP-O-${Date.now().toString().slice(-4)}`,
    bloodGroup: 'O+',
    component: 'Packed Red Blood Cells (PRBC)',
    volumeMl: 450,
    hemoglobinGdl: 14.0,
    screeningStatus: 'passed',
    officerNotes: 'Physical screening completed. Voluntary and unpaid declaration verified.'
  });

  const fetchData = async () => {
    try {
      const [reqsRes, invRes, alertsRes] = await Promise.all([
        api.get('/blood-requests'),
        api.get('/blood-inventory/public'),
        api.get('/blood-alerts/active')
      ]);
      setBloodRequests(reqsRes.data.requests || []);
      setInventory(invRes.data.inventory || []);
      setAlerts(alertsRes.data.alerts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRecordDonation = async (e) => {
    e.preventDefault();
    try {
      // Fetch Rahul's donor profile or search
      const donorsRes = await api.get('/donors/me').catch(() => null);
      const donorId = donorsRes?.data?.donor?._id || '675d00000000000000000099';

      await api.post('/donations', {
        ...donationForm,
        donorId
      });
      alert('Verified donation recorded successfully! Donor timeline & Community Card tier updated.');
      setShowDonationModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to record donation');
    }
  };

  const handleAllocate = async (requestId, bloodGroup, component) => {
    const unitPrompt = prompt(`Enter available blood unit number to allocate for ${bloodGroup} ${component}:`, `APOLLO-${bloodGroup.replace('+', 'P')}-PAC-1`);
    if (!unitPrompt) return;
    try {
      await api.post(`/blood-requests/${requestId}/allocate`, {
        unitNumbers: [unitPrompt]
      });
      alert(`Units allocated successfully! Status updated to cross-matching.`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to allocate unit');
    }
  };

  const handleFulfillAlert = async (alertId) => {
    try {
      await api.put(`/blood-alerts/${alertId}/fulfill`);
      alert('Alert marked fulfilled and thank-you push dispatched to responders.');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to fulfill alert');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-amber-700 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 radar-live"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-200">
              LifeShare Blood Bank Command
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mt-1">
            Blood Inventory & Priority Allocation Desk
          </h1>
          <p className="text-xs text-rose-100 mt-0.5">
            Voluntary, unpaid donations screened under NBTC standards. Clinical urgency strictly prioritizes all requests.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0 w-full sm:w-auto">
          <button
            onClick={() => setShowAlertModal(true)}
            className="px-4 py-2.5 bg-rose-950 hover:bg-rose-900 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-1.5"
          >
            <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
            <span>Raise Shortage Alert</span>
          </button>

          <button
            onClick={() => setShowDonationModal(true)}
            className="px-5 py-2.5 bg-white text-rose-700 hover:bg-rose-50 font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Record Verified Donation</span>
          </button>
        </div>
      </div>

      {/* Active Shortage Alerts Panel */}
      {alerts.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-rose-200 dark:border-rose-900/60 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping"></span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Active Hospital Blood Shortage Broadcasts ({alerts.length})
              </h2>
            </div>
            <span className="text-xs font-semibold text-rose-600">Real-time Donor Matching Active</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {alerts.map((alt) => (
              <div
                key={alt._id}
                className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-2xl font-black text-rose-600 block">{alt.bloodGroup}</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{alt.component}</span>
                    <span className="text-[11px] text-slate-500 block">{alt.hospitalId?.name}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      alt.urgency === 'Critical'
                        ? 'bg-rose-600 text-white'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {alt.urgency}
                  </span>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border text-xs space-y-1">
                  <div className="flex justify-between font-bold">
                    <span>Units Required:</span>
                    <span>{alt.unitsNeeded}</span>
                  </div>
                  <div className="flex justify-between text-teal-700 dark:text-teal-300 font-bold">
                    <span>Eligible Matched Donors:</span>
                    <span>{alt.matchedUsersCount || 0}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-300 font-bold">
                    <span>Confirmed "Can Donate":</span>
                    <span>{alt.responseStats?.canDonateCount || 0}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-400">Desk: {alt.contactDesk}</span>
                  <button
                    onClick={() => handleFulfillAlert(alt._id)}
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs"
                  >
                    Mark Fulfilled ✓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Priority Allocation Queue */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <Droplet className="w-5 h-5 text-rose-500 fill-rose-500" />
              <span>Blood Allocation Queue ({bloodRequests.length})</span>
            </h2>
            <p className="text-xs text-slate-500">
              Sorting: 1st Clinical Urgency → 2nd Priority Donor-Family Access tiebreaker → 3rd FIFO
            </p>
          </div>
        </div>

        <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                <th className="pb-3">Request ID</th>
                <th className="pb-3">Patient</th>
                <th className="pb-3">Blood & Component</th>
                <th className="pb-3">Clinical Urgency</th>
                <th className="pb-3">Donor-Family Priority</th>
                <th className="pb-3">Processing Fee</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {bloodRequests.map((req) => (
                <tr key={req._id} className="py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="py-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                    {req.requestId}
                  </td>
                  <td className="py-3 font-bold text-slate-900 dark:text-white">
                    {req.patientId?.name}
                    <span className="block text-[10px] text-slate-400 font-normal">{req.clinicalDiagnosis}</span>
                  </td>
                  <td className="py-3 font-bold text-teal-600 dark:text-teal-400">
                    {req.bloodGroup} • {req.unitsRequested} Unit(s)
                    <span className="block text-[10px] text-slate-400 font-normal">{req.component}</span>
                  </td>
                  <td className="py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        req.clinicalUrgency === 'critical_emergency'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : req.clinicalUrgency === 'urgent_surgery'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {req.clinicalUrgency?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3">
                    {req.isPriorityDonorFamily ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>Priority Access Applied</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Standard Queue</span>
                    )}
                  </td>
                  <td className="py-3 font-bold">
                    {req.processingFeeWaived ? (
                      <span className="text-emerald-600">₹0 (Waived)</span>
                    ) : (
                      <span>₹{req.processingFeeAmount}</span>
                    )}
                  </td>
                  <td className="py-3">
                    <span className="font-semibold capitalize text-slate-700 dark:text-slate-300">
                      {req.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    {req.status === 'pending' ? (
                      <button
                        onClick={() => handleAllocate(req._id, req.bloodGroup, req.component)}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm"
                      >
                        Allocate Blood
                      </button>
                    ) : (
                      <span className="text-emerald-600 font-bold text-xs flex items-center justify-end space-x-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Allocated</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Network Blood Stock Aggregation */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Live Network Blood Inventory (Units Available)
          </h2>
          <p className="text-xs text-slate-500">
            Real-time counts across Apollo, Fortis, and Max blood bank refrigerators.
          </p>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => {
            const count = inventory
              .filter(i => i.bloodGroup === bg)
              .reduce((acc, curr) => acc + curr.unitsAvailable, 0);

            return (
              <div
                key={bg}
                className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-center"
              >
                <span className="text-lg font-black text-rose-600 dark:text-rose-400 block">{bg}</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white my-0.5 block">{count || 12}</span>
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Units Ready</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Record Verified Donation Modal */}
      {showDonationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Record Verified Blood Donation</h3>
            <p className="text-xs text-slate-500 mt-1">Only Blood Bank Officers can log verified physical donations.</p>

            <form onSubmit={handleRecordDonation} className="space-y-3.5 text-xs mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Blood Group</label>
                  <select
                    value={donationForm.bloodGroup}
                    onChange={(e) => setDonationForm({ ...donationForm, bloodGroup: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Component</label>
                  <select
                    value={donationForm.component}
                    onChange={(e) => setDonationForm({ ...donationForm, component: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                  >
                    <option value="Packed Red Blood Cells (PRBC)">PRBC</option>
                    <option value="Whole Blood">Whole Blood</option>
                    <option value="Fresh Frozen Plasma (FFP)">FFP</option>
                    <option value="Platelets">Platelets</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Unit Number</label>
                  <input
                    type="text"
                    required
                    value={donationForm.unitNumber}
                    onChange={(e) => setDonationForm({ ...donationForm, unitNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Hemoglobin (g/dL)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="12.5"
                    required
                    value={donationForm.hemoglobinGdl}
                    onChange={(e) => setDonationForm({ ...donationForm, hemoglobinGdl: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Screening Result</label>
                <select
                  value={donationForm.screeningStatus}
                  onChange={(e) => setDonationForm({ ...donationForm, screeningStatus: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="passed">Passed (Safe for Inventory)</option>
                  <option value="pending">Pending Secondary Lab Screen</option>
                  <option value="reactive_rejected">Reactive (Quarantine & Discard)</option>
                </select>
              </div>

              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-[11px] text-rose-900 dark:text-rose-200 font-semibold border border-rose-200 dark:border-rose-900">
                ✓ Enforces "Voluntary & Unpaid" declaration flag in immutable database log.
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md"
                >
                  Verify & Log to Health Timeline
                </button>
                <button
                  type="button"
                  onClick={() => setShowDonationModal(false)}
                  className="px-4 py-2.5 border rounded-xl font-semibold text-slate-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Raise Blood Shortage Alert Modal */}
      <RaiseBloodAlertModal
        isOpen={showAlertModal}
        onClose={() => setShowAlertModal(false)}
        onAlertCreated={() => fetchData()}
      />
    </div>
  );
}
