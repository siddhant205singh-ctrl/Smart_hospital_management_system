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
  Mail, 
  Sparkles,
  Info
} from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthTokens } = useAuth();

  const emailParam = searchParams.get('email') || '';
  const devOtpParam = searchParams.get('devOtp') || '';

  const [email, setEmail] = useState(emailParam);
  const [activeCode, setActiveCode] = useState(devOtpParam);
  const [otp, setOtp] = useState(devOtpParam);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resendStatus, setResendStatus] = useState('');
  const [verifiedState, setVerifiedState] = useState(null); // 'active' | 'pending_approval'

  // If email changes in URL, sync local state
  useEffect(() => {
    if (emailParam && emailParam !== email) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  // Fetch active OTP from server assistant if not present in URL
  useEffect(() => {
    if (!email) return;

    const fetchActiveOtp = async () => {
      try {
        const res = await api.get('/auth/latest-otp', {
          params: { email, purpose: 'verify_email' }
        });
        if (res.data.success && res.data.otp) {
          setActiveCode(res.data.otp);
          if (!otp) {
            setOtp(res.data.otp);
          }
        }
      } catch (err) {
        // Silently skip if endpoint not available or in production
      }
    };

    fetchActiveOtp();
  }, [email]);

  const handleVerify = async (codeToVerify) => {
    if (submitting) return;
    const code = codeToVerify || otp || activeCode;
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
    setSubmitting(true);

    try {
      const res = await api.post('/auth/verify-email', {
        email: targetEmail,
        otp: code
      });

      if (res.data.status === 'active') {
        // Patient activated
        setVerifiedState('active');
        if (res.data.accessToken && setAuthTokens) {
          setAuthTokens(res.data.user, res.data.accessToken, res.data.refreshToken);
        }
        setTimeout(() => {
          navigate('/dashboard');
        }, 2200);
      } else if (res.data.status === 'pending_approval') {
        // Professional account pending admin review
        setVerifiedState('pending_approval');
      }
    } catch (err) {
      console.error('[Verify Email Error]', err);
      const data = err.response?.data;
      if (data?.attemptsRemaining !== undefined) {
        setErrorMessage(`Invalid code. ${data.attemptsRemaining} attempt(s) remaining.`);
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
      setErrorMessage('Please enter your email address to request a verification code.');
      return;
    }

    setErrorMessage('');
    setResendStatus('');

    try {
      const res = await api.post('/auth/resend-otp', {
        email: targetEmail,
        purpose: 'verify_email'
      });
      setResendStatus('A fresh verification code has been generated.');
      if (res.data.devOtpCode) {
        setActiveCode(res.data.devOtpCode);
        setOtp(res.data.devOtpCode);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to resend code. Please try again.');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
        
        {/* Verification Success: Active (Patient) */}
        {verifiedState === 'active' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-50 dark:ring-emerald-900/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Email Verified!</h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Welcome to SmartCare. Your patient account is now <strong className="text-emerald-600">ACTIVE</strong>. Redirecting you to your patient dashboard...
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

        {/* Verification Success: Pending Approval (Doctor / Hospital Admin / Blood Officer) */}
        {verifiedState === 'pending_approval' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center mx-auto ring-8 ring-amber-50 dark:ring-amber-900/30">
              <Clock className="w-10 h-10" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Application Under Review</h2>
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-xs text-amber-800 dark:text-amber-200 text-left space-y-1.5">
              <div className="flex items-center space-x-2 font-bold">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Account Status: PENDING_APPROVAL</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Your email has been verified. Your medical credentials and license documents have been forwarded to the reviewing hospital/platform administration.
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                You will receive an email as soon as an administrator verifies your application.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <Link
                to={`/account-status?email=${encodeURIComponent(email)}`}
                className="flex-1 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-teal-600/20 text-center"
              >
                Track Status & Feedback
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

        {/* Normal Verification Input Form */}
        {!verifiedState && (
          <>
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-teal-600/30">
                <Mail className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Verify Your Email</h1>
              <p className="text-xs text-slate-500">
                Enter your 6-digit cryptographic verification code to verify your account.
              </p>
            </div>

            {/* Email Address Field (if not pre-populated) */}
            {!emailParam && (
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1 text-xs">Registered Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@smartcare.hospital"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>
              </div>
            )}

            {/* Prominent Verification Code Box */}
            {activeCode && (
              <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border-2 border-teal-500/40 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-900 dark:text-teal-200 flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <span>Your 6-Digit Verification Code:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtp(activeCode);
                      handleVerify(activeCode);
                    }}
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-xs shadow-sm transition flex items-center space-x-1"
                  >
                    <span>Auto-Fill & Verify</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="bg-white dark:bg-slate-900 py-2 rounded-xl border border-teal-200 dark:border-teal-800 text-center">
                  <span className="font-mono text-3xl font-black tracking-[0.4em] text-teal-700 dark:text-teal-300">
                    {activeCode}
                  </span>
                </div>
                <p className="text-[11px] text-teal-800/80 dark:text-teal-300/80 text-center">
                  Code dispatched for <strong>{email}</strong>. Click <strong>Auto-Fill & Verify</strong> or enter the digits below.
                </p>
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {resendStatus && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{resendStatus}</span>
              </div>
            )}

            <div className="py-2">
              <OtpInputSixBox
                value={otp}
                email={email}
                onChange={setOtp}
                onComplete={handleVerify}
                onResend={handleResend}
                disabled={submitting}
              />
            </div>

            <button
              type="button"
              onClick={() => handleVerify(otp)}
              disabled={submitting || (otp || activeCode).length !== 6}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50 text-xs"
            >
              <span>{submitting ? 'Verifying Code...' : 'Verify Code & Complete'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Helpful testing advice */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 flex items-start space-x-2">
              <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <span>
                <strong>Testing Notice:</strong> Verification codes are displayed on-screen and logged to the server console. To dispatch real emails to live external inboxes (like Gmail), configure SMTP in <code className="text-teal-600">backend/.env</code>.
              </span>
            </div>

            <div className="pt-2 text-center text-xs text-slate-400">
              Entered wrong email?{' '}
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
