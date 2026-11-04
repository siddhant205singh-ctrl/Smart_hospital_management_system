import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import OtpInputSixBox from '../../components/auth/OtpInputSixBox';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Mail
} from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthTokens } = useAuth();

  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendStatus, setResendStatus] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [verifiedState, setVerifiedState] = useState(null); // 'active' | 'pending_approval'

  // Sync email from URL if it changes
  useEffect(() => {
    if (emailParam && emailParam !== email) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  const handleVerify = async (codeToVerify) => {
    if (submitting) return;
    const code = (codeToVerify || otp || '').toString().trim();
    const targetEmail = (email || '').toLowerCase().trim();

    if (!targetEmail) {
      setErrorMessage('Please provide your registered email address.');
      return;
    }
    if (!code || code.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setErrorMessage('');
    setResendStatus('');
    setSubmitting(true);

    try {
      const res = await api.post('/auth/verify-email', {
        email: targetEmail,
        otp: code
      });

      if (res.data.status === 'active') {
        setVerifiedState('active');
        if (res.data.accessToken && setAuthTokens) {
          setAuthTokens(res.data.user, res.data.accessToken, res.data.refreshToken);
        }
        setTimeout(() => navigate('/dashboard'), 2000);
      } else if (res.data.status === 'pending_approval') {
        setVerifiedState('pending_approval');
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.attemptsRemaining !== undefined) {
        setErrorMessage(`Incorrect code. ${data.attemptsRemaining} attempt(s) remaining.`);
      } else {
        setErrorMessage(data?.error || 'Verification failed. Please check the code and retry.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    const targetEmail = (email || '').toLowerCase().trim();
    if (!targetEmail) {
      setErrorMessage('Please enter your email address first.');
      return;
    }

    setErrorMessage('');
    setResendStatus('');
    setResendLoading(true);

    try {
      await api.post('/auth/resend-otp', {
        email: targetEmail,
        purpose: 'verify_email'
      });
      setResendStatus('✅ A new verification code has been sent to your email.');
      setOtp(''); // Clear old code so user types the new one
    } catch (err) {
      const data = err.response?.data;
      if (data?.alreadyActive) {
        setErrorMessage(data.error);
        setTimeout(() => navigate('/login'), 2200);
      } else if (data?.cooldown) {
        setErrorMessage(`Please wait ${data.waitSeconds} second(s) before requesting a new code.`);
      } else {
        setErrorMessage(data?.error || 'Failed to resend code. Please try again.');
      }
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">

        {/* ── Success: Patient activated ── */}
        {verifiedState === 'active' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50 dark:ring-emerald-900/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Email Verified!</h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Welcome to HealthMS. Your account is now <strong className="text-emerald-600">ACTIVE</strong>. Redirecting to your dashboard…
            </p>
            <div className="pt-2">
              <Link
                to="/dashboard"
                className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/30 transition"
              >
                <span>Go to Dashboard Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* ── Success: Professional pending approval ── */}
        {verifiedState === 'pending_approval' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto ring-8 ring-amber-50 dark:ring-amber-900/30">
              <Clock className="w-10 h-10" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Application Under Review</h2>
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-amber-800 dark:text-amber-200 text-left space-y-1.5">
              <div className="flex items-center space-x-2 font-bold">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Account Status: PENDING APPROVAL</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Your email has been verified. Your documents have been submitted for administrative review.
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                You will receive an email once an administrator approves your application.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <Link
                to={`/account-status?email=${encodeURIComponent(email)}`}
                className="flex-1 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-teal-600/20 text-center"
              >
                Track Status
              </Link>
              <Link
                to="/login"
                className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition text-center"
              >
                Back to Sign In
              </Link>
            </div>
          </div>
        )}

        {/* ── Normal OTP input form ── */}
        {!verifiedState && (
          <>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-teal-600/30">
                <Mail className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Verify Your Email</h1>
              <p className="text-xs text-slate-500">
                We sent a 6-digit code to <strong className="text-slate-700 dark:text-slate-200">{email || 'your email'}</strong>.<br />
                Enter it below to activate your account.
              </p>
            </div>

            {/* Email field — shown only when not pre-filled from URL */}
            {!emailParam && (
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1 text-xs">Registered Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Error message */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Resend success message */}
            {resendStatus && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{resendStatus}</span>
              </div>
            )}

            {/* OTP boxes + resend timer */}
            <div className="py-2">
              <OtpInputSixBox
                value={otp}
                email={email}
                onChange={setOtp}
                onComplete={handleVerify}
                onResend={handleResend}
                disabled={submitting || resendLoading}
              />
            </div>

            {/* Verify button */}
            <button
              type="button"
              onClick={() => handleVerify(otp)}
              disabled={submitting || otp.length !== 6}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50 text-xs"
            >
              <span>{submitting ? 'Verifying…' : 'Verify Code & Complete'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="text-center text-xs text-slate-400">
              Wrong email?{' '}
              <Link to="/register" className="text-teal-600 font-semibold hover:underline">
                Re-register
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
