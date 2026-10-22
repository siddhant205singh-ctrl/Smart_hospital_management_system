import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Home, Stethoscope, Clock, Droplet, User, Activity, ShieldCheck } from 'lucide-react';

export default function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();

  // Determine queue route based on role
  let queueRoute = '/my-queue';
  let queueLabel = 'Queue';
  if (user?.role === 'doctor') {
    queueRoute = '/doctor-console';
    queueLabel = 'Console';
  } else if (user?.role === 'admin' || user?.role === 'receptionist') {
    queueRoute = '/admin-overview';
    queueLabel = 'Command';
  } else if (user?.role === 'blood_bank_officer') {
    queueRoute = '/blood-bank-officer';
    queueLabel = 'Blood Bank';
  }

  const profileRoute = user ? '/dashboard' : '/login';

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-lg px-2 py-1.5 flex items-center justify-around text-[10px] font-medium safe-area-pb">
      {/* Home */}
      <NavLink
        to="/"
        className={({ isActive }) =>
          `flex flex-col items-center py-1 px-2 rounded-xl transition ${
            isActive ? 'text-teal-600 dark:text-teal-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`
        }
      >
        <Home className="w-5 h-5 mb-0.5" />
        <span>Home</span>
      </NavLink>

      {/* Find Doctors */}
      <NavLink
        to="/doctors"
        className={({ isActive }) =>
          `flex flex-col items-center py-1 px-2 rounded-xl transition ${
            isActive ? 'text-teal-600 dark:text-teal-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`
        }
      >
        <Stethoscope className="w-5 h-5 mb-0.5" />
        <span>Doctors</span>
      </NavLink>

      {/* Live Queue / Console */}
      <NavLink
        to={queueRoute}
        className={({ isActive }) =>
          `flex flex-col items-center py-1 px-2 rounded-xl transition relative ${
            isActive ? 'text-teal-600 dark:text-teal-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`
        }
      >
        <div className="relative">
          <Clock className="w-5 h-5 mb-0.5" />
          <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
        <span>{queueLabel}</span>
      </NavLink>

      {/* LifeShare */}
      <NavLink
        to="/lifeshare"
        className={({ isActive }) =>
          `flex flex-col items-center py-1 px-2 rounded-xl transition ${
            isActive ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`
        }
      >
        <Droplet className="w-5 h-5 mb-0.5 fill-rose-500/20" />
        <span>LifeShare</span>
      </NavLink>

      {/* Dashboard / Profile */}
      <NavLink
        to={profileRoute}
        className={({ isActive }) =>
          `flex flex-col items-center py-1 px-2 rounded-xl transition ${
            isActive ? 'text-teal-600 dark:text-teal-400 font-bold' : 'text-slate-500 dark:text-slate-400'
          }`
        }
      >
        <User className="w-5 h-5 mb-0.5" />
        <span>{user ? 'Profile' : 'Sign In'}</span>
      </NavLink>
    </div>
  );
}
