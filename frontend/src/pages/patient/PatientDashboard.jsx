import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
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
  PhoneCall,
  XCircle,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import EmergencyIntakeModal from '../../components/emergency/EmergencyIntakeModal';

export default function PatientDashboard() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [appointments, setAppointments] = useState([]);
  const [donorData, setDonorData] = useState(null);
  const [matchingAlerts, setMatchingAlerts] = useState([]);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [respondingAlertId, setRespondingAlertId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchAppointments = () => {
    api.get('/appointments/my')
      .then(res => setAppointments(res.data.appointments || []))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.get('/appointments/my'),
      api.get('/donors/me').catch(() => null),
      api.get('/blood-alerts/active').catch(() => ({ data: { alerts: [] } }))
    ]).then(([apptRes, donorRes, alertsRes]) => {
      setAppointments(apptRes.data.appointments || []);
      if (donorRes?.data) setDonorData(donorRes.data);
      setMatchingAlerts(alertsRes.data.alerts || []);
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [user]);

  // Listen for real-time appointment cancellation or queue refresh events
  useEffect(() => {
    if (!socket) return;

    socket.on('appointment:cancelled', (data) => {
      setAppointments(prev => prev.map(a => a._id === data.appointmentId ? { ...a, status: 'cancelled' } : a));
    });

    socket.on('queue:refresh', () => {
      fetchAppointments();
    });

    return () => {
      socket.off('appointment:cancelled');
      socket.off('queue:refresh');
    };
  }, [socket]);

  const handleRespondAlert = async (alertId, status) => {
    setRespondingAlertId(alertId);
    try {
      const res = await api.post(`/blood-alerts/${alertId}/respond`, { status });
      alert(res.data.message);
      // Remove or mark answered
      setMatchingAlerts(prev => prev.filter(a => a._id !== alertId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit alert response');
    } finally {
      setRespondingAlertId(null);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this appointment? This will immediately release your queue token and recalculate wait times for all waiting patients.'
    );
    if (!confirmed) return;

    setCancellingId(appointmentId);
    // 1. Instantly reflect cancellation in local state for instantaneous 0ms feedback
    setAppointments(prev => prev.map(a => a._id === appointmentId ? { ...a, status: 'cancelled' } : a));

    try {
      await api.put(`/appointments/${appointmentId}/cancel`);
      // 2. Refresh from server to ensure full sync
      fetchAppointments();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel appointment');
      fetchAppointments();
    } finally {
      setCancellingId(null);
    }
  };

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

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowEmergencyModal(true)}
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-1.5 animate-pulse"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Emergency Intake</span>
          </button>

          {donorData?.donor ? (
            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20 text-center">
              <span className="text-[10px] uppercase font-bold text-amber-300 block">LifeShare Donor Tier</span>
              <span className="text-xl font-black text-white">{donorData.card?.tier || 'Gold'} Tier</span>
              <span className="text-[10px] text-teal-100 block">{donorData.card?.discountPercentage || 30}% Outpatient Welfare Off</span>
            </div>
          ) : (
            <Link
              to="/lifeshare"
              className="px-4 py-2.5 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-1.5"
            >
              <Droplet className="w-4 h-4 fill-white" />
              <span>Join LifeShare Network</span>
            </Link>
          )}
        </div>
      </div>

      {/* Matching Blood Shortage Emergency Alerts */}
      {matchingAlerts.length > 0 && (
        <div className="space-y-3">
          {matchingAlerts.map(alt => (
            <div
              key={alt._id}
              className="p-5 bg-gradient-to-r from-rose-950 via-slate-900 to-slate-900 rounded-3xl border-2 border-rose-500 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div className="flex items-start space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-600 flex items-center justify-center text-white font-black text-xl flex-shrink-0 shadow-lg">
                  {alt.bloodGroup}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 uppercase tracking-wider">{alt.urgency} Shortage</span>
                    <span className="text-xs text-rose-300 font-semibold">{alt.hospitalId?.name}</span>
                  </div>
                  <h3 className="font-bold text-sm sm:text-base mt-0.5">
                    {alt.unitsNeeded} Units of {alt.bloodGroup} {alt.component} Urgently Needed
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    Voluntary and unpaid donation under NBTC guidelines. Contact Desk: {alt.contactDesk} ({alt.contactPhone})
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 w-full md:w-auto">
                <button
                  onClick={() => handleRespondAlert(alt._id, 'can_donate')}
                  disabled={respondingAlertId === alt._id}
                  className="flex-1 md:flex-initial px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  I Can Donate
                </button>
                <button
                  onClick={() => handleRespondAlert(alt._id, 'not_available')}
                  disabled={respondingAlertId === alt._id}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-slate-300 font-semibold text-xs rounded-xl transition"
                >
                  Not Available
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            <Link
              to="/my-queue"
              className="w-full sm:w-auto px-5 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 flex-shrink-0"
            >
              <Clock className="w-4 h-4" />
              <span>Track Live Queue & Turn</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            {['scheduled', 'checked_in', 'called'].includes(activeAppt.status) && (
              <button
                onClick={() => handleCancelAppointment(activeAppt._id)}
                disabled={cancellingId === activeAppt._id}
                className="w-full sm:w-auto px-4 py-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl font-bold text-xs transition flex items-center justify-center space-x-1.5 flex-shrink-0"
              >
                <XCircle className="w-4 h-4 text-rose-500" />
                <span>{cancellingId === activeAppt._id ? 'Cancelling...' : 'Cancel Appointment'}</span>
              </button>
            )}
          </div>
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

      {/* Appointments List & Status */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-teal-600" />
            <span>My Bookings & Queue Tokens ({appointments.length})</span>
          </h3>
          <Link
            to="/doctors"
            className="text-xs font-bold text-teal-600 hover:text-teal-700"
          >
            + Book New
          </Link>
        </div>

        {appointments.length === 0 ? (
          <p className="text-xs text-slate-400 py-3">No appointments found.</p>
        ) : (
          <div className="space-y-3">
            {appointments.map((appt) => {
              const isCancellable = ['scheduled', 'checked_in', 'called'].includes(appt.status);
              return (
                <div
                  key={appt._id}
                  className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start space-x-3.5">
                    <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center flex-shrink-0 shadow-sm">
                      <span className="text-[8px] uppercase font-bold text-slate-400">Token</span>
                      <span className="text-lg font-black text-slate-900 dark:text-white">#{appt.tokenNumber}</span>
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                          {appt.doctorId?.userId?.name || 'Specialist Consultation'}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                            appt.status === 'cancelled'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : appt.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                          }`}
                        >
                          {appt.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {appt.hospitalId?.name} • <strong>{appt.date}</strong> at {appt.timeSlot}
                      </p>
                      {appt.bookedForFamilyMember && (
                        <span className="text-[10px] text-teal-600 block mt-0.5">
                          Patient: {appt.bookedForFamilyMember}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-stretch sm:self-auto justify-end">
                    {appt.status !== 'cancelled' && (
                      <Link
                        to="/my-queue"
                        className="px-3.5 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-teal-700 transition"
                      >
                        Queue Turn
                      </Link>
                    )}

                    {isCancellable ? (
                      <button
                        onClick={() => handleCancelAppointment(appt._id)}
                        disabled={cancellingId === appt._id}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>{cancellingId === appt._id ? 'Cancelling...' : 'Cancel'}</span>
                      </button>
                    ) : appt.status === 'cancelled' ? (
                      <span className="text-[11px] text-rose-500 font-semibold px-2">Cancelled</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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

      {/* Emergency Intake Modal */}
      <EmergencyIntakeModal
        isOpen={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
      />
    </div>
  );
}
