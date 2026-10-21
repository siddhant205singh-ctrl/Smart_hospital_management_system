import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Activity, Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { login, quickSwitchDemoRole } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data.user.role === 'doctor') navigate('/doctor-console');
      else if (data.user.role === 'blood_bank_officer') navigate('/blood-bank-officer');
      else if (data.user.role === 'admin' || data.user.role === 'receptionist') navigate('/admin-overview');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to login with provided credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail) => {
    setError('');
    setLoading(true);
    try {
      const data = await quickSwitchDemoRole(demoEmail);
      if (data.user.role === 'doctor') navigate('/doctor-console');
      else if (data.user.role === 'blood_bank_officer') navigate('/blood-bank-officer');
      else if (data.user.role === 'admin' || data.user.role === 'receptionist') navigate('/admin-overview');
      else navigate('/dashboard');
    } catch (err) {
      setError('Quick login failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-teal-600/30">
            <Activity className="w-7 h-7" />
          </div>
          <h2 className="mt-4 text-2xl font-black text-slate-900 dark:text-white">Sign In to SmartCare</h2>
          <p className="mt-1 text-xs text-slate-500">Access your appointments, live queue tracker & LifeShare donor profile</p>
        </div>

        {/* Quick Demo Switcher Box */}
        <div className="p-4 bg-teal-50 dark:bg-teal-950/40 rounded-2xl border border-teal-200 dark:border-teal-800 text-xs">
          <span className="font-bold text-teal-800 dark:text-teal-200 block mb-2 flex items-center space-x-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>One-Click Demo Logins for Evaluation:</span>
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickLogin('patient@smartcare.hospital')}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-teal-100 text-slate-700 dark:text-slate-200 font-semibold text-[11px] shadow-sm transition border border-teal-200 dark:border-teal-700 text-left"
            >
              👤 Patient (Gold Donor)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('doctor1@smartcare.hospital')}
              className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-teal-100 text-slate-700 dark:text-slate-200 font-semibold text-[11px] shadow-sm transition border border-teal-200 dark:border-teal-700 text-left"
            >
              🩺 Doctor (Cardiology)
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
              onClick={() => handleQuickLogin('bloodofficer@smartcare.hospital')}
              className="px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-semibold text-[11px] shadow-sm transition border border-rose-200 dark:border-rose-800 text-left"
            >
              🩸 Blood Bank Officer
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@smartcare.hospital"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">Password</label>
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
            className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-600/30 transition flex items-center justify-center space-x-2"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-500">
          New to SmartCare?{' '}
          <Link to="/register" className="font-bold text-teal-600 hover:underline">
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
}
