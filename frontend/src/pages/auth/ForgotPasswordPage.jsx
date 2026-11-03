import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import OtpInputSixBox from '../../components/auth/OtpInputSixBox';
import PasswordStrengthMeter from '../../components/auth/PasswordStrengthMeter';
import { 
  KeyRound, 
  Mail, 
  Lock, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Sparkles
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1: Email, 2: OTP + New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Step 1: Request Password Reset OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res.data.devOtpCode) {
        setDevOtp(res.data.devOtpCode);
        setOtp(res.data.devOtpCode);
      }
      setStep(2);
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to dispatch password reset code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password with OTP
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (otp.length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code sent to your email.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/reset-password', {
        email,
        otp,
        newPassword,
        confirmPassword
      });

      setSuccessMessage(res.data.message || 'Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const data = err.response?.data;
      if (data?.attemptsRemaining !== undefined) {
        setErrorMessage(`Invalid code. ${data.attemptsRemaining} attempt(s) remaining.`);
      } else {
        setErrorMessage(data?.error || 'Password reset failed. Please retry.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setErrorMessage('');
    try {
      const res = await api.post('/auth/resend-otp', {
        email,
        purpose: 'forgot_password'
      });
      if (res.data.devOtpCode) {
        setDevOtp(res.data.devOtpCode);
        setOtp(res.data.devOtpCode);
      }
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to resend code.');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-teal-600/30">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Reset Password
          </h1>
          <p className="text-xs text-slate-500">
            {step === 1 
              ? 'Enter your registered email to receive a 6-digit cryptographic verification code.'
              : 'Enter the code and create a new secure password.'}
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Step 1: Email Request */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Registered Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="you@smartcare.hospital"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? 'Sending Code...' : 'Send Verification Code'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Step 2: OTP + New Password */}
        {step === 2 && !successMessage && (
          <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
            {devOtp && (
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 rounded-xl text-[11px] text-indigo-800 dark:text-indigo-200 flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Dev OTP Code: <strong className="font-mono">{devOtp}</strong></span>
                </span>
                <button
                  type="button"
                  onClick={() => setOtp(devOtp)}
                  className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-bold"
                >
                  Fill Code
                </button>
              </div>
            )}

            <OtpInputSixBox
              value={otp}
              email={email}
              onChange={setOtp}
              onResend={handleResendOtp}
              disabled={loading}
            />

            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <PasswordStrengthMeter password={newPassword} />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Confirm New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{loading ? 'Updating Password...' : 'Reset Password & Invalidate Sessions'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="pt-2 text-center text-xs">
          <Link
            to="/login"
            className="inline-flex items-center space-x-1.5 text-slate-500 hover:text-teal-600 transition font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
