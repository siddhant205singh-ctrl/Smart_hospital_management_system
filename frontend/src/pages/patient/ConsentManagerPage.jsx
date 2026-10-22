import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Lock,
  Clock,
  Trash2,
  Plus,
  History,
  Building2,
  CheckCircle2,
  XCircle
} from 'lucide-react';

export default function ConsentManagerPage() {
  const { user } = useAuth();
  const [grants, setGrants] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGrantModal, setShowGrantModal] = useState(false);

  // New Grant Form
  const [newGrant, setNewGrant] = useState({
    granteeType: 'doctor',
    granteeName: 'Dr. Anita Desai',
    granteeId: '675d00000000000000000001',
    scope: 'full_history',
    validDays: 30
  });

  const fetchData = async () => {
    try {
      const [grantsRes, auditRes] = await Promise.all([
        api.get('/consent/my-grants'),
        api.get('/consent/audit-log')
      ]);
      setGrants(grantsRes.data.grants || []);
      setAuditLogs(auditRes.data.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGrantConsent = async (e) => {
    e.preventDefault();
    try {
      await api.post('/consent/grant', newGrant);
      setShowGrantModal(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to grant consent');
    }
  };

  const handleRevoke = async (consentId) => {
    if (!window.confirm('Are you sure you want to revoke medical record access for this doctor/hospital?')) return;
    try {
      await api.post(`/consent/${consentId}/revoke`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to revoke consent');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-teal-600" />
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Consent & Privacy Governance</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            You own your healthcare records. Grant temporary access to consulting specialists or revoke access instantly.
          </p>
        </div>

        <button
          onClick={() => setShowGrantModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Grant Specialist Access</span>
        </button>
      </div>

      {/* Active Consent Grants */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <span>Active Record Permissions</span>
        </h2>

        {grants.length === 0 ? (
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border text-center text-xs text-slate-400">
            No active permissions. Your medical records are currently locked from external viewers.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {grants.map((g) => (
              <div
                key={g._id}
                className={`p-5 rounded-3xl border transition shadow-sm ${
                  g.status === 'active'
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-teal-600 font-bold">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{g.granteeName}</h4>
                      <span className="text-[11px] text-teal-600 font-medium capitalize">
                        Scope: {g.scope.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      g.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {g.status}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>Valid until: <strong>{new Date(g.validUntil).toLocaleDateString()}</strong></span>
                  {g.status === 'active' && (
                    <button
                      onClick={() => handleRevoke(g._id)}
                      className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg font-bold text-xs flex items-center space-x-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Revoke</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Access Audit Log Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
          <History className="w-5 h-5 text-indigo-500" />
          <span>Immutable Record Access Log</span>
        </h2>
        <p className="text-xs text-slate-500">
          Every consultation, record view, or consent update is cryptographically timestamped in an append-only audit trail.
        </p>

        <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
          <table className="w-full text-left text-xs min-w-[550px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                <th className="pb-2">Accessor</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Action</th>
                <th className="pb-2">Resource</th>
                <th className="pb-2">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-4 text-center text-slate-400">No audit entries yet.</td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log._id} className="py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 font-bold text-slate-800 dark:text-slate-200">{log.userName}</td>
                    <td className="py-2.5 capitalize text-slate-500">{log.userRole}</td>
                    <td className="py-2.5 font-mono text-[11px] text-teal-600 dark:text-teal-400">{log.action}</td>
                    <td className="py-2.5 text-slate-500">{log.resourceType}</td>
                    <td className="py-2.5 text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grant Modal */}
      {showGrantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Authorize Specialist Access</h3>
            <p className="text-xs text-slate-500 mt-1">Specify which doctor can view your health timeline.</p>

            <form onSubmit={handleGrantConsent} className="space-y-4 text-xs mt-4">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Doctor Name</label>
                <input
                  type="text"
                  required
                  value={newGrant.granteeName}
                  onChange={(e) => setNewGrant({ ...newGrant, granteeName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Scope of Records</label>
                <select
                  value={newGrant.scope}
                  onChange={(e) => setNewGrant({ ...newGrant, scope: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                >
                  <option value="full_history">Full Historical Timeline</option>
                  <option value="past_30_days">Past 30 Days Only</option>
                  <option value="current_visit_only">Current Consultation Only</option>
                  <option value="prescriptions_only">Prescriptions Only</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={newGrant.validDays}
                  onChange={(e) => setNewGrant({ ...newGrant, validDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl"
                >
                  Approve Consent Grant
                </button>
                <button
                  type="button"
                  onClick={() => setShowGrantModal(false)}
                  className="px-4 py-2.5 border rounded-xl font-semibold text-slate-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
