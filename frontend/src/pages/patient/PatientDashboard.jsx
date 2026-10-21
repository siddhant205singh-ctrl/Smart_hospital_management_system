import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  Clock,
  Calendar,
  Users,
  ShieldCheck,
  Droplet,
  ArrowRight,
  Activity,
  FileText,
  Sparkles,
  PhoneCall
} from 'lucide-react';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [donorData, setDonorData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get('/appointments/my'),
      api.get('/donors/me').catch(() => null)
    ]).then(([apptRes, donorRes]) => {
      setAppointments(apptRes.data.appointments || []);
      if (donorRes?.data) setDonorData(donorRes.data);
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [user]);

  const activeAppt = appointments.find(a => ['scheduled', 'checked_in', 'called', 'in_consultation'].includes(a.status));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-teal-200">Patient Command Portal</span>
          <h1 className="text-2xl sm:text-3xl font-black mt-1">Welcome back, {user?.name}!</h1>
          <p className="text-xs text-teal-100 mt-1 max-w-lg">
            SmartCare has estimated your wait times and travel window so you don't spend unnecessary hours in hospital lounges.
          </p>
        </div>

        {donorData?.donor ? (
          <div className="p-3.5 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20 text-center flex-shrink-0">
            <span className="text-[10px] uppercase font-bold text-amber-300 block">LifeShare Donor Tier</span>
            <span className="text-xl font-black text-white">{donorData.card?.tier || 'Gold'} Tier</span>
            <span className="text-[10px] text-teal-100 block">{donorData.card?.discountPercentage || 30}% Outpatient Welfare Off</span>
          </div>
        ) : (
          <Link
            to="/lifeshare"
            className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 flex-shrink-0"
          >
            <Droplet className="w-4 h-4 fill-white" />
            <span>Join LifeShare Network</span>
          </Link>
        )}
      </div>

      {/* Active Token Callout (if active appointment exists) */}
      {activeAppt ? (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 flex flex-col items-center justify-center text-center">
              <span className="text-[9px] uppercase font-bold text-teal-700 dark:text-teal-300">Token</span>
              <span className="text-2xl font-black text-slate-900 dark:text-white">#{activeAppt.tokenNumber}</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {activeAppt.doctorId?.userId?.name || 'Doctor Consultation'}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 capitalize">
                  {activeAppt.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Hospital: <strong>{activeAppt.hospitalId?.name}</strong> • Slot: {activeAppt.timeSlot}
              </p>
            </div>
          </div>

          <Link
            to="/my-queue"
            className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2 flex-shrink-0"
          >
            <Clock className="w-4 h-4" />
            <span>Track Live Queue & Turn</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="w-8 h-8 text-teal-600" />
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">No Appointments Today</h3>
              <p className="text-xs text-slate-400">Search 16+ specialists across 3 connected hospitals.</p>
            </div>
          </div>
          <Link
            to="/doctors"
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            Find Doctors
          </Link>
        </div>
      )}

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/doctors"
          className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-2 group"
        >
          <div className="w-10 h-10 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Book Appointment</h3>
          <p className="text-xs text-slate-400">View live slots and generate digital tokens instantly.</p>
        </Link>

        <Link
          to="/my-queue"
          className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-2 group"
        >
          <div className="w-10 h-10 rounded-2xl bg-cyan-100 dark:bg-cyan-950 text-cyan-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Live Queue</h3>
          <p className="text-xs text-slate-400">Real-time turn countdown and "Leave Now" alerts.</p>
        </Link>

        <Link
          to="/health-timeline"
          className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-2 group"
        >
          <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">Health Timeline</h3>
          <p className="text-xs text-slate-400">Prescriptions, labs & plain-language AI summaries.</p>
        </Link>

        <Link
          to="/lifeshare"
          className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-2 group"
        >
          <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Droplet className="w-5 h-5 fill-rose-500" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">LifeShare & Card</h3>
          <p className="text-xs text-slate-400">Digital Community Card & priority family blood.</p>
        </Link>
      </div>

      {/* Family Members Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
          <Users className="w-4 h-4 text-teal-600" />
          <span>Registered Family Members ({user?.familyMembers?.length || 0})</span>
        </h3>
        {user?.familyMembers && user.familyMembers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {user.familyMembers.map((fm, idx) => (
              <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-100 block">{fm.name}</span>
                <span className="text-[11px] text-slate-500 capitalize">{fm.relation} • Age {fm.age || 30} • {fm.bloodGroup}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No family members saved yet.</p>
        )}
      </div>
    </div>
  );
}
