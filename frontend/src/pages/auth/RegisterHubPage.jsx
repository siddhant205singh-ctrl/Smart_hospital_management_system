import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  Stethoscope, 
  Building2, 
  Droplet, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  FileCheck2, 
  Activity 
} from 'lucide-react';

export default function RegisterHubPage() {
  const navigate = useNavigate();

  const roles = [
    {
      id: 'patient',
      title: 'Patient Account',
      subtitle: 'Immediate Active Access',
      badge: 'Instant Activation',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200',
      description: 'Book doctor appointments, track live OPD queue tokens, access health timeline records, and participate in voluntary blood donation.',
      icon: User,
      iconBg: 'bg-emerald-500 text-white',
      accentBorder: 'hover:border-emerald-500',
      flow: 'Email OTP Verification -> Immediate Active',
      path: '/register/patient'
    },
    {
      id: 'doctor',
      title: 'Medical Doctor',
      subtitle: 'Clinical Practice & Teleconsult',
      badge: 'Hospital Admin Approval',
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-200',
      description: 'Manage clinical queue, issue e-prescriptions, update medical reports, and perform emergency break-glass record reviews.',
      icon: Stethoscope,
      iconBg: 'bg-blue-600 text-white',
      accentBorder: 'hover:border-blue-500',
      flow: 'Email OTP -> Document Upload -> Hospital Admin Review',
      path: '/register/doctor'
    },
    {
      id: 'hospital-admin',
      title: 'Hospital Administrator',
      subtitle: 'Facility & Operations Head',
      badge: 'Super Admin Oversight',
      badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-200',
      description: 'Register a hospital branch, manage bed counts, verify affiliated doctors and officers, and inspect hospital-wide clinical analytics.',
      icon: Building2,
      iconBg: 'bg-purple-600 text-white',
      accentBorder: 'hover:border-purple-500',
      flow: 'Email OTP -> Hospital License Upload -> Super Admin Review',
      path: '/register/hospital-admin'
    },
    {
      id: 'blood-bank-officer',
      title: 'Blood Bank Officer',
      subtitle: 'LifeShare Inventory & Verification',
      badge: 'Hospital Admin Approval',
      badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200',
      description: 'Manage voluntary blood bank stock, dispatch emergency donor alerts, verify donor family links, and approve fast-track requests.',
      icon: Droplet,
      iconBg: 'bg-rose-600 text-white',
      accentBorder: 'hover:border-rose-500',
      flow: 'Email OTP -> License Upload -> Hospital Admin Review',
      path: '/register/blood-bank-officer'
    }
  ];

  return (
    <div className="min-h-[85vh] py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Role-Based Verified Access Architecture</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          Join SmartCare Healthcare Network
        </h1>
        <p className="text-sm text-slate-500">
          Select your registration type below. Professional roles undergo cryptographic document verification and admin approval before activation.
        </p>
      </div>

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {roles.map((r) => {
          const Icon = r.icon;
          return (
            <div
              key={r.id}
              onClick={() => navigate(r.path)}
              className={`cursor-pointer group relative p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col justify-between ${r.accentBorder}`}
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md ${r.iconBg}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${r.badgeColor}`}>
                    {r.badge}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-teal-600 transition">
                  {r.title}
                </h3>
                <p className="text-xs font-semibold text-slate-400 mb-2">{r.subtitle}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  {r.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-medium">
                  {r.flow}
                </span>
                <span className="font-bold text-teal-600 group-hover:translate-x-1 transition flex items-center space-x-1">
                  <span>Register</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info Box */}
      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center space-x-3">
          <FileCheck2 className="w-6 h-6 text-teal-600 shrink-0" />
          <div>
            <p className="font-bold text-slate-900 dark:text-white">Already applied for a professional account?</p>
            <p className="text-slate-500">Track your verification progress or resubmit requested credentials.</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            to="/account-status"
            className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-teal-500 font-semibold text-slate-700 dark:text-slate-200 rounded-xl transition shadow-sm"
          >
            Check Application Status
          </Link>
          <Link
            to="/login"
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 font-bold text-white rounded-xl transition shadow-md shadow-teal-600/20"
          >
            Sign In Instead
          </Link>
        </div>
      </div>
    </div>
  );
}
