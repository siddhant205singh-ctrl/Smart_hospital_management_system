import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';
import { 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Upload, 
  FileText, 
  ArrowRight, 
  Building2, 
  User, 
  Search,
  RefreshCw
} from 'lucide-react';

export default function AccountStatusPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const [emailInput, setEmailInput] = useState(emailParam);
  const [loading, setLoading] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Resubmission State
  const [resubmitFiles, setResubmitFiles] = useState({});
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitSuccess, setResubmitSuccess] = useState('');

  const fetchStatus = async (targetEmail) => {
    const emailToQuery = targetEmail || emailInput;
    if (!emailToQuery) return;

    setLoading(true);
    setErrorMessage('');
    setResubmitSuccess('');

    try {
      const res = await api.get(`/auth/account-status?email=${encodeURIComponent(emailToQuery)}`);
      setStatusData(res.data);
      setSearchParams({ email: emailToQuery });
    } catch (err) {
      console.error('[Status Fetch Error]', err);
      setStatusData(null);
      setErrorMessage(err.response?.data?.error || 'No application record found for this email address.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (emailParam) {
      fetchStatus(emailParam);
    }
  }, [emailParam]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStatus(emailInput);
  };

  const handleResubmitFileChange = (field, e) => {
    if (e.target.files && e.target.files[0]) {
      setResubmitFiles(prev => ({ ...prev, [field]: e.target.files[0] }));
    }
  };

  const handleResubmit = async (e) => {
    e.preventDefault();
    setResubmitting(true);
    setErrorMessage('');
    setResubmitSuccess('');

    try {
      const formData = new FormData();
      formData.append('email', statusData.email);
      Object.keys(resubmitFiles).forEach(key => {
        formData.append(key, resubmitFiles[key]);
      });

      const res = await api.post('/approvals/resubmit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResubmitSuccess(res.data.message || 'Credentials resubmitted successfully!');
      // Refresh status data
      fetchStatus(statusData.email);
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Resubmission failed. Please try again.');
    } finally {
      setResubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return {
          label: 'ACTIVE & VERIFIED',
          color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300',
          icon: CheckCircle2,
          desc: 'Your account is active. You have full access to clinical dashboards and platform tools.'
        };
      case 'pending_approval':
        return {
          label: 'PENDING ADMINISTRATIVE REVIEW',
          color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300',
          icon: Clock,
          desc: 'Your email is verified and application documents have been forwarded to hospital or platform administration.'
        };
      case 'pending_email_verification':
        return {
          label: 'PENDING EMAIL VERIFICATION',
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300',
          icon: Clock,
          desc: 'A verification code was sent to your email. Verification must be completed to submit for review.'
        };
      case 'rejected':
        return {
          label: 'APPLICATION NOT APPROVED',
          color: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300',
          icon: XCircle,
          desc: 'Reviewing administrators identified issues with the submitted documents or registration details.'
        };
      case 'suspended':
        return {
          label: 'ACCOUNT SUSPENDED',
          color: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-400',
          icon: AlertTriangle,
          desc: 'This account has been suspended by administration. Please contact support.'
        };
      default:
        return {
          label: status,
          color: 'bg-slate-100 text-slate-700',
          icon: ShieldCheck,
          desc: 'Current status details.'
        };
    }
  };

  return (
    <div className="min-h-[85vh] py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
      {/* Search Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-teal-600/30">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Application Credential Tracking
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Inspect the real-time status of your registration, reviewer notes, and resubmit requested documents.
        </p>

        <form onSubmit={handleSearchSubmit} className="max-w-md mx-auto pt-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="email"
              required
              placeholder="Enter your registered email..."
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none shadow-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md shadow-teal-600/20 transition flex items-center space-x-1"
          >
            <span>{loading ? 'Searching...' : 'Track'}</span>
          </button>
        </form>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-start space-x-2 max-w-md mx-auto">
          <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Status Details Card */}
      {statusData && (() => {
        const badgeMeta = getStatusBadge(statusData.status);
        const BadgeIcon = badgeMeta.icon;
        const appReq = statusData.approvalRequest;

        return (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
            {/* Header Status Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800 gap-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Applicant Profile
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>{statusData.name}</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                    {statusData.role?.replace(/_/g, ' ')}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">{statusData.email}</p>
              </div>

              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1.5 rounded-full text-xs font-black border flex items-center space-x-1.5 ${badgeMeta.color}`}>
                  <BadgeIcon className="w-4 h-4" />
                  <span>{badgeMeta.label}</span>
                </span>
              </div>
            </div>

            {/* Status Timeline Overview */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">Status Overview</span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {badgeMeta.desc}
              </p>
              {statusData.hospital && (
                <div className="flex items-center space-x-1.5 text-slate-500 pt-1">
                  <Building2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Affiliated Facility: <strong>{statusData.hospital.name} ({statusData.hospital.city})</strong></span>
                </div>
              )}
            </div>

            {/* Active Account Quick Action */}
            {statusData.status === 'active' && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-emerald-900 dark:text-emerald-200 text-xs">Account Ready to Use</h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300">You may now sign in and access all verified role features.</p>
                </div>
                <Link
                  to="/login"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
                >
                  Sign In
                </Link>
              </div>
            )}

            {/* Email Verification Pending Quick Action */}
            {statusData.status === 'pending_email_verification' && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-blue-900 dark:text-blue-200 text-xs">Email Verification Pending</h4>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300">Complete email OTP entry to advance your application.</p>
                </div>
                <Link
                  to={`/verify-email?email=${encodeURIComponent(statusData.email)}&role=${statusData.role}`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-sm"
                >
                  Verify Email
                </Link>
              </div>
            )}

            {/* Reviewer Feedback & Rejection Details */}
            {(statusData.status === 'rejected' || appReq?.status === 'rejected' || appReq?.status === 'info_requested') && (
              <div className="space-y-4 p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900">
                <div className="flex items-center space-x-2 text-rose-800 dark:text-rose-200 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Reviewer Feedback & Reason for Rejection / Info Request</span>
                </div>

                <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-rose-100 dark:border-rose-950 text-xs text-slate-800 dark:text-slate-200 font-medium">
                  {statusData.rejectionReason || appReq?.rejectionReason || appReq?.requestedInfoComments || 'Documents could not be verified against the state medical register.'}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>
                    Resubmissions used: <strong>{appReq?.resubmissionCount || 0}</strong> of <strong>{appReq?.maxResubmissions || 3}</strong> allowed.
                  </span>
                  {appReq?.reviewedAt && (
                    <span>Reviewed: {new Date(appReq.reviewedAt).toLocaleDateString()}</span>
                  )}
                </div>

                {/* Resubmission Form */}
                {(appReq?.resubmissionCount || 0) < (appReq?.maxResubmissions || 3) ? (
                  <form onSubmit={handleResubmit} className="pt-4 border-t border-rose-200/60 dark:border-rose-900/60 space-y-4">
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs">
                      Resubmit Corrected Credentials
                    </span>

                    {resubmitSuccess && (
                      <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs border border-emerald-200">
                        {resubmitSuccess}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 mb-1">Updated Registration Certificate / License</label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          onChange={e => handleResubmitFileChange('council_registration_cert', e)}
                          className="text-[11px] text-slate-500 w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 dark:text-slate-400 mb-1">Updated Govt. Photo ID / Degree</label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          onChange={e => handleResubmitFileChange('gov_photo_id', e)}
                          className="text-[11px] text-slate-500 w-full"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={resubmitting}
                      className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-rose-600/20 flex items-center space-x-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${resubmitting ? 'animate-spin' : ''}`} />
                      <span>{resubmitting ? 'Uploading Documents...' : 'Submit Updated Documents for Re-review'}</span>
                    </button>
                  </form>
                ) : (
                  <p className="text-[11px] text-rose-600 font-semibold">
                    Maximum resubmission limit reached. Please contact platform administration directly at admin@healthms.hospital.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
