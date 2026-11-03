import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  ShieldCheck, 
  Stethoscope, 
  Droplet, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Eye, 
  AlertCircle, 
  RefreshCw,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

export default function StaffCredentialingDesk({ roleFilter = null }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'

  // Action Modals State
  const [selectedReq, setSelectedReq] = useState(null);
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject' | 'request_info' | 'view_doc'
  const [actionComments, setActionComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  const fetchApprovals = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (activeTab !== 'all') params.status = activeTab;
      if (roleFilter) params.role = roleFilter;

      const res = await api.get('/approvals/pending', { params });
      setRequests(res.data.requests || []);
    } catch (err) {
      console.error('[Fetch Approvals Error]', err);
      setError(err.response?.data?.error || 'Failed to load credentialing requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [activeTab]);

  const handleActionSubmit = async () => {
    if (!selectedReq || !actionType) return;
    setActionLoading(true);
    setError('');

    try {
      if (actionType === 'approve') {
        await api.post(`/approvals/${selectedReq._id}/approve`);
      } else if (actionType === 'reject') {
        if (!actionComments || actionComments.trim().length < 5) {
          setError('A rejection reason of at least 5 characters is required.');
          setActionLoading(false);
          return;
        }
        await api.post(`/approvals/${selectedReq._id}/reject`, { reason: actionComments });
      } else if (actionType === 'request_info') {
        if (!actionComments || actionComments.trim().length < 5) {
          setError('Clarification comments of at least 5 characters are required.');
          setActionLoading(false);
          return;
        }
        await api.post(`/approvals/${selectedReq._id}/request-info`, { comments: actionComments });
      }

      // Reset modal and reload
      setSelectedReq(null);
      setActionType(null);
      setActionComments('');
      await fetchApprovals();
    } catch (err) {
      console.error('[Action Submit Error]', err);
      setError(err.response?.data?.error || 'Failed to execute approval action.');
    } finally {
      setActionLoading(false);
    }
  };

  const openDocViewer = (doc) => {
    // If running with proxy or full URL
    const docUrl = `/api/approvals/document/${doc._id}`;
    window.open(docUrl, '_blank');
  };

  return (
    <div className="space-y-5">
      {/* Header and Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            <span>Staff Credentialing & License Verification Desk</span>
          </h3>
          <p className="text-xs text-slate-500">
            Review uploaded government IDs, medical council registrations, and qualifications before granting active clinical access.
          </p>
        </div>

        <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
          {['pending', 'approved', 'rejected', 'all'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-lg capitalize transition ${
                activeTab === tab
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
          <button
            onClick={fetchApprovals}
            title="Refresh list"
            className="p-1 rounded-lg text-slate-400 hover:text-teal-600 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
          <span>Loading credential verification requests...</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <span>No {activeTab} credential verification requests found.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const applicant = req.applicantId;
            const prof = req.professionalDetails || {};
            const isDoctor = req.applicantRole === 'doctor';
            const isOfficer = req.applicantRole === 'blood_bank_officer';
            const isHospAdmin = req.applicantRole === 'hospital_admin';

            return (
              <div
                key={req._id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center font-bold text-sm">
                      {isDoctor ? <Stethoscope className="w-5 h-5" /> : isOfficer ? <Droplet className="w-5 h-5 text-rose-600" /> : <ShieldCheck className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{applicant?.name || 'Applicant'}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                          {req.applicantRole?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">{applicant?.email} • {applicant?.phone}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full capitalize border ${
                      req.status === 'approved' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : req.status === 'rejected'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : req.status === 'info_requested'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      Status: {req.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Professional Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs">
                  {isDoctor && (
                    <>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold">Council Registration No.</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{prof.medicalCouncilRegNumber || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold">Specialization & Experience</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{prof.specialization || 'Clinical'} • {prof.experienceYears || 0} yrs</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold">Council / State</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{prof.councilState || 'National'}</span>
                      </div>
                    </>
                  )}

                  {isOfficer && (
                    <>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold">Blood Bank License</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{prof.bloodBankLicenseNumber || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold">Designation</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{prof.designation || 'Blood Officer'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold">Qualification</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{prof.qualifications?.[0]?.degree || 'MLT'}</span>
                      </div>
                    </>
                  )}

                  {isHospAdmin && req.hospitalDetails && (
                    <>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold">Hospital Name & City</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{req.hospitalDetails.name} ({req.hospitalDetails.city})</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold">Hospital License No.</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{req.hospitalDetails.licenseNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-semibold">Capacity</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{req.hospitalDetails.bedsCount} Beds • {req.hospitalDetails.hasEmergencyDept ? '24/7 Trauma' : 'Standard'}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Uploaded Documents List */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Verification Documents ({req.documentIds?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {req.documentIds && req.documentIds.length > 0 ? (
                      req.documentIds.map((doc) => (
                        <button
                          key={doc._id}
                          type="button"
                          onClick={() => openDocViewer(doc)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-xl text-xs flex items-center space-x-1.5 transition border border-slate-200 dark:border-slate-700"
                        >
                          <FileText className="w-3.5 h-3.5 text-teal-600" />
                          <span className="font-medium capitalize">{doc.documentType?.replace(/_/g, ' ')}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </button>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No document records attached</span>
                    )}
                  </div>
                </div>

                {/* Rejection / Request Reason Banner if any */}
                {req.rejectionReason && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 rounded-xl text-xs text-rose-700 dark:text-rose-300">
                    <strong>Rejection Feedback:</strong> {req.rejectionReason}
                  </div>
                )}
                {req.requestedInfoComments && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 rounded-xl text-xs text-purple-700 dark:text-purple-300">
                    <strong>Clarification Requested:</strong> {req.requestedInfoComments}
                  </div>
                )}

                {/* Action Buttons for Pending or Info Requested */}
                {req.status !== 'approved' && (
                  <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReq(req);
                        setActionType('request_info');
                        setActionComments('');
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition flex items-center space-x-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Request Info</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReq(req);
                        setActionType('reject');
                        setActionComments('');
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs transition border border-rose-200 flex items-center space-x-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReq(req);
                        setActionType('approve');
                      }}
                      className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center space-x-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Verify & Approve</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation / Feedback Modal */}
      {selectedReq && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <h4 className="text-base font-bold text-slate-900 dark:text-white capitalize flex items-center space-x-2">
              {actionType === 'approve' && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {actionType === 'reject' && <XCircle className="w-5 h-5 text-rose-600" />}
              {actionType === 'request_info' && <MessageSquare className="w-5 h-5 text-purple-600" />}
              <span>{actionType.replace('_', ' ')} Applicant: {selectedReq.applicantId?.name}</span>
            </h4>

            {actionType === 'approve' && (
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Are you sure you want to verify and activate this account? The applicant will receive an activation email and full access to their clinical console.
              </p>
            )}

            {(actionType === 'reject' || actionType === 'request_info') && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {actionType === 'reject' ? 'Rejection Reason (Required) *' : 'Information / Document Required *'}
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder={
                    actionType === 'reject'
                      ? 'e.g. State medical council registration certificate is illegible. Please re-upload a clear scanned copy.'
                      : 'e.g. Please provide your updated hospital appointment letter showing current department affiliation.'
                  }
                  value={actionComments}
                  onChange={e => setActionComments(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedReq(null);
                  setActionType(null);
                }}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleActionSubmit}
                className={`flex-1 py-2 font-bold rounded-xl text-xs text-white transition ${
                  actionType === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : actionType === 'reject'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {actionLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
