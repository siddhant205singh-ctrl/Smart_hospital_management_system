import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import OtpInputSixBox from '../../components/auth/OtpInputSixBox';
import { 
  Activity, 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  Clock, 
  XCircle, 
  AlertTriangle,
  KeyRound
} from 'lucide-react';

export default function LoginPage() {
  const { login, complete2faLogin, quickSwitchDemoRole } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [statusAlert, setStatusAlert] = useState(null); // { status, message, email, role, rejectionReason, canResubmit, locked, remainingMinutes }
  const [loading, setLoading] = useState(false);

  // 2FA State
  const [show2faModal, setShow2faModal] = useState(false);
  const [twoFactorOtp, setTwoFactorOtp] = useState('');
  const [devOtp2fa, setDevOtp2fa] = useState('');
  const [twoFactorSubmitting, setTwoFactorSubmitting] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState('');

  const routeByRole = (userRole) => {
    if (userRole === 'doctor') navigate('/doctor-console');
    else if (userRole === 'blood_bank_officer') navigate('/blood-bank-officer');
    else if (userRole === 'super_admin') navigate('/super-admin/approvals');
    else if (userRole === 'admin' || userRole === 'hospital_admin' || userRole === 'receptionist' || userRole === 'hospital') navigate('/hospital-dashboard');
    else navigate('/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStatusAlert(null);
    setLoading(true);

    try {
      const data = await login(email, password);

      if (data?.requires2FA) {
        setShow2faModal(true);
        if (data.devOtpCode) {
          setDevOtp2fa(data.devOtpCode);
          setTwoFactorOtp(data.devOtpCode);
        }
        return;
      }

      routeByRole(data.user.role);
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.status) {
        setStatusAlert({
          status: resp.status,
          message: resp.error || resp.message,
          email: resp.email || email,
          role: resp.role,
          rejectionReason: resp.rejectionReason,
          canResubmit: resp.canResubmit
        });
      } else if (resp?.locked) {
        setStatusAlert({
          locked: true,
          remainingMinutes: resp.remainingMinutes,
          message: resp.error
        });
      } else {
        setError(resp?.error || 'Failed to login with provided credentials');
      }
    } finally {
      setLoading(false);
    }
  };

  const handle2faVerify = async (codeToVerify) => {
    const code = codeToVerify || twoFactorOtp;
    if (!code || code.length !== 6) {
      setTwoFactorError('Please enter the 6-digit 2FA code.');
      return;
    }

    setTwoFactorError('');
    setTwoFactorSubmitting(true);

    try {
      const data = await complete2faLogin(email, code);
      setShow2faModal(false);
      routeByRole(data.user.role);
    } catch (err) {
      setTwoFactorError(err.response?.data?.error || 'Invalid 2FA code. Please retry.');
    } finally {
      setTwoFactorSubmitting(false);
    }
  };

  const handleQuickLogin = async (demoEmail) => {
    setError('');
    setStatusAlert(null);
    setLoading(true);
    try {
      const data = await quickSwitchDemoRole(demoEmail);
      routeByRole(data.user.role);
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.status) {
        setStatusAlert({
          status: resp.status,
          message: resp.error || resp.message,
          email: demoEmail,
          role: resp.role,
          rejectionReason: resp.rejectionReason,
          canResubmit: resp.canResubmit
        });
      } else {
        setError('Quick login failed: ' + (resp?.error || err.message));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8 bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800">
        
        {/* Logo & Title */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-teal-600/30">
            <Activity className="w-7 h-7" />
          </div>
          <h2 className="mt-4 text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {t('auth.signInTitle') || 'Sign In to HealthMS'}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {t('auth.signInSubtitle') || 'Access healthcare portal with verified credentials'}
          </p>
        </div>

        {/* Quick Demo Switcher Box */}
        <div className="p-4 bg-teal-50/70 dark:bg-teal-950/40 rounded-2xl border border-teal-200 dark:border-teal-800 text-xs">
          <span className="font-bold text-teal-900 dark:text-teal-200 block mb-2 flex items-center justify-between">
            <span className="flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>One-Click Role Demonstration Login:</span>
            </span>
          </span>

          <div className="grid grid-cols-2 gap-1.5 mb-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('patient@smartcare.hospital')}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-teal-100 text-slate-700 dark:text-slate-200 font-semibold text-[11px] shadow-sm transition border border-teal-200 dark:border-teal-700 text-left"
            >
              👤 Patient (Active)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('doctor1@smartcare.hospital')}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-teal-100 text-slate-700 dark:text-slate-200 font-semibold text-[11px] shadow-sm transition border border-teal-200 dark:border-teal-700 text-left"
            >
              🩺 Doctor (Verified)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@smartcare.hospital')}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-teal-100 text-slate-700 dark:text-slate-200 font-semibold text-[11px] shadow-sm transition border border-teal-200 dark:border-teal-700 text-left"
            >
              🏛️ Hospital Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('superadmin@smartcare.hospital')}
              className="px-2.5 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-semibold text-[11px] shadow-sm transition border border-purple-200 dark:border-purple-800 text-left"
            >
              🛡️ Super Admin Desk
            </button>
          </div>

          {/* Test Status Lifecycle Row */}
          <div className="pt-2 border-t border-teal-200/50 dark:border-teal-800/50">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Test Account Lifecycle Blocking:
            </span>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => handleQuickLogin('doctor.pending@smartcare.hospital')}
                className="px-2 py-1 rounded bg-amber-100/70 hover:bg-amber-200 text-amber-800 font-medium text-[10px]"
              >
                ⏳ Doctor Pending
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('doctor.rejected@smartcare.hospital')}
                className="px-2 py-1 rounded bg-rose-100/70 hover:bg-rose-200 text-rose-800 font-medium text-[10px]"
              >
                ✕ Doctor Rejected
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('patient.unverified@smartcare.hospital')}
                className="px-2 py-1 rounded bg-blue-100/70 hover:bg-blue-200 text-blue-800 font-medium text-[10px]"
              >
                ✉️ Email Unverified
              </button>
            </div>
          </div>
        </div>

        {/* Account Status Alert Callouts */}
        {statusAlert && (
          <div className="space-y-3">
            {statusAlert.status === 'pending_email_verification' && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 rounded-2xl text-xs text-blue-800 dark:text-blue-200 space-y-2">
                <div className="flex items-center space-x-1.5 font-bold">
                  <Mail className="w-4 h-4 text-blue-600" />
                  <span>Email Verification Pending</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Your account was created but requires 6-digit OTP verification before access is granted.
                </p>
                <Link
                  to={`/verify-email?email=${encodeURIComponent(statusAlert.email)}`}
                  className="inline-flex items-center space-x-1 font-bold text-blue-700 dark:text-blue-300 hover:underline pt-1"
                >
                  <span>Verify Email Address Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {statusAlert.status === 'pending_approval' && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-2xl text-xs text-amber-800 dark:text-amber-200 space-y-2">
                <div className="flex items-center space-x-1.5 font-bold">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Application Under Administrative Review</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Your email has been verified. Your uploaded medical credentials and license documents are currently under review by hospital administration.
                </p>
                <Link
                  to={`/account-status?email=${encodeURIComponent(statusAlert.email)}`}
                  className="inline-flex items-center space-x-1 font-bold text-amber-700 dark:text-amber-300 hover:underline pt-1"
                >
                  <span>Check Verification Status & Notes</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {statusAlert.status === 'rejected' && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs text-rose-800 dark:text-rose-200 space-y-2">
                <div className="flex items-center space-x-1.5 font-bold">
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>Credential Application Not Approved</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Reason: <strong className="font-semibold">{statusAlert.rejectionReason}</strong>
                </p>
                <Link
                  to={`/account-status?email=${encodeURIComponent(statusAlert.email)}`}
                  className="inline-flex items-center space-x-1 font-bold text-rose-700 dark:text-rose-300 hover:underline pt-1"
                >
                  <span>Resubmit Corrected Documents</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {statusAlert.status === 'suspended' && (
              <div className="p-4 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-xs text-slate-800 dark:text-slate-200 space-y-1">
                <div className="flex items-center space-x-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Account Suspended</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  This account has been suspended by system administration. Please contact support.
                </p>
              </div>
            )}

            {statusAlert.locked && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs text-rose-800 dark:text-rose-200 space-y-2">
                <div className="flex items-center space-x-1.5 font-bold">
                  <Lock className="w-4 h-4 text-rose-600" />
                  <span>Account Temporarily Locked</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Too many consecutive failed login attempts. For security, login is locked for{' '}
                  <strong>{statusAlert.remainingMinutes} minute(s)</strong>.
                </p>
                <Link
                  to="/forgot-password"
                  className="inline-flex items-center space-x-1 font-bold text-rose-700 dark:text-rose-300 hover:underline"
                >
                  <span>Reset Password with OTP</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}

        {error && !statusAlert && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              {t('auth.emailLabel') || 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@healthms.hospital"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                {t('auth.passwordLabel') || 'Password'}
              </label>
              <Link to="/forgot-password" className="text-[11px] text-teal-600 hover:underline font-semibold">
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <span>{loading ? (t('common.loading') || 'Authenticating...') : (t('auth.signInBtn') || 'Sign In')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          {t('auth.noAccount') || "Don't have an account?"}{' '}
          <Link to="/register" className="font-bold text-teal-600 hover:underline">
            {t('auth.registerLink') || 'Register Here'}
          </Link>
        </p>
      </div>

      {/* 2FA Verification Modal */}
      {show2faModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto shadow-md">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Two-Factor Authentication</h3>
              <p className="text-xs text-slate-500">
                Enter the 6-digit verification code sent to <br />
                <span className="font-bold text-slate-800 dark:text-slate-200">{email}</span>
              </p>
            </div>

            {devOtp2fa && (
              <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-[11px] text-indigo-800 flex justify-between items-center">
                <span>Dev 2FA Code: <strong className="font-mono">{devOtp2fa}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setTwoFactorOtp(devOtp2fa);
                    handle2faVerify(devOtp2fa);
                  }}
                  className="px-2 py-0.5 bg-indigo-600 text-white rounded font-bold text-[10px]"
                >
                  Auto-Verify
                </button>
              </div>
            )}

            {twoFactorError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                {twoFactorError}
              </div>
            )}

            <OtpInputSixBox
              value={twoFactorOtp}
              onChange={setTwoFactorOtp}
              onComplete={handle2faVerify}
              disabled={twoFactorSubmitting}
            />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShow2faModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handle2faVerify(twoFactorOtp)}
                disabled={twoFactorSubmitting || twoFactorOtp.length !== 6}
                className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md shadow-teal-600/20 transition disabled:opacity-50"
              >
                {twoFactorSubmitting ? 'Verifying...' : 'Verify & Log In'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
