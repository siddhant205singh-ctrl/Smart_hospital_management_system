import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';
import LiveProgressRing from '../../components/queue/LiveProgressRing';
import LeaveNowBanner from '../../components/queue/LeaveNowBanner';
import {
  Clock,
  QrCode,
  Building2,
  User,
  Activity,
  CheckCircle,
  AlertCircle,
  Volume2,
  Calendar,
  Sparkles,
  XCircle,
  ArrowRight
} from 'lucide-react';

export default function LiveQueueTrackerPage() {
  const { user } = useAuth();
  const { socket, joinPatientQueue } = useSocket();

  const [appointments, setAppointments] = useState([]);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQrModal, setShowQrModal] = useState(false);
  const [audioAlert, setAudioAlert] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchAppointments = async () => {
    try {
      const res = await api.get('/appointments/my');
      const appts = res.data.appointments || [];
      setAppointments(appts);
      return appts;
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  // Fetch patient's upcoming appointments on mount
  useEffect(() => {
    fetchAppointments()
      .then(appts => {
        // Only select an active appointment (do not select cancelled or completed by default)
        const active = appts.find(a => ['scheduled', 'checked_in', 'called', 'in_consultation'].includes(a.status));
        setSelectedAppt(active || null);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCancelAppointment = async () => {
    if (!selectedAppt) return;
    const confirmed = window.confirm(
      `Cancel your appointment (Token #${selectedAppt.tokenNumber}) with Dr. ${selectedAppt.doctorId?.userId?.name || 'Doctor'}? This will immediately release your spot in the waiting queue.`
    );
    if (!confirmed) return;

    const cancelledId = selectedAppt._id;
    setCancelling(true);

    // 1. Immediately reflect cancellation in local state
    setAppointments(prev => prev.map(a => a._id === cancelledId ? { ...a, status: 'cancelled' } : a));

    try {
      await api.put(`/appointments/${cancelledId}/cancel`);

      // 2. Fetch fresh list from server
      const freshAppts = await fetchAppointments();
      // If patient has another active appointment, switch to it, otherwise clear to null
      const anotherActive = freshAppts.find(a => ['scheduled', 'checked_in', 'called', 'in_consultation'].includes(a.status));
      setSelectedAppt(anotherActive || null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel appointment');
      fetchAppointments();
    } finally {
      setCancelling(false);
    }
  };

  // Fetch live queue status when selectedAppt changes
  useEffect(() => {
    if (selectedAppt && selectedAppt.status !== 'cancelled') {
      api.get(`/queue/appointment/${selectedAppt._id}/status`)
        .then(res => {
          setQueueStatus(res.data.queueStatus);
        })
        .catch(err => console.error(err));

      // Join socket room for this appointment
      joinPatientQueue(selectedAppt._id);
    }
  }, [selectedAppt]);

  // Listen for real-time socket events
  useEffect(() => {
    if (!socket) return;

    socket.on('queue:wait_time_changed', (data) => {
      if (selectedAppt && data.appointmentId === selectedAppt._id) {
        setQueueStatus(prev => ({
          ...prev,
          patientsAhead: data.patientsAhead,
          estimatedWaitMinutes: data.waitMinutes,
          estimatedTurnTime: data.estimatedTurnTime,
          doctorStatus: data.doctorStatus
        }));
      }
    });

    socket.on('queue:token_called', (data) => {
      if (selectedAppt && data.appointmentId === selectedAppt._id) {
        setAudioAlert(true);
        setQueueStatus(prev => ({ ...prev, status: 'called' }));
      }
    });

    socket.on('appointment:cancelled', (data) => {
      setAppointments(prev => prev.map(a => a._id === data.appointmentId ? { ...a, status: 'cancelled' } : a));
      if (selectedAppt && data.appointmentId === selectedAppt._id) {
        setSelectedAppt(null);
      }
    });

    return () => {
      socket.off('queue:wait_time_changed');
      socket.off('queue:token_called');
      socket.off('appointment:cancelled');
    };
  }, [socket, selectedAppt]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-xl"></div>
        <div className="h-96 bg-slate-100 dark:bg-slate-900 animate-pulse rounded-3xl"></div>
      </div>
    );
  }

  // Active appointments list for switcher
  const activeAppts = appointments.filter(a => ['scheduled', 'checked_in', 'called', 'in_consultation'].includes(a.status));
  const pastAppts = appointments.filter(a => ['cancelled', 'completed'].includes(a.status));

  if (!selectedAppt) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-6 sm:p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center shadow-lg space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950 text-teal-600 flex items-center justify-center mx-auto shadow-sm">
          <Clock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            No Active Queue Appointments
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
            You do not currently have any active queue tokens. Any cancelled appointments have been released.
          </p>
        </div>

        <Link
          to="/doctors"
          className="inline-flex items-center space-x-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition"
        >
          <span>Find Doctors & Book Appointment</span>
          <ArrowRight className="w-4 h-4" />
        </Link>

        {pastAppts.length > 0 && (
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Past / Cancelled Appointments ({pastAppts.length})
            </h4>
            <div className="space-y-2">
              {pastAppts.map(p => (
                <div
                  key={p._id}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block">
                      Token #{p.tokenNumber} ({p.tokenCode}) • Dr. {p.doctorId?.userId?.name || 'Doctor'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {p.hospitalId?.name} • {p.date} ({p.timeSlot})
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                    p.status === 'cancelled'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Audio alert chime simulation banner */}
      {audioAlert && (
        <div className="p-4 bg-teal-600 text-white rounded-2xl flex items-center justify-between shadow-lg animate-bounce">
          <div className="flex items-center space-x-3">
            <Volume2 className="w-6 h-6" />
            <div>
              <strong className="block text-sm font-bold">YOUR TOKEN IS BEING CALLED!</strong>
              <span className="text-xs">Please proceed to Room {selectedAppt.doctorId?.roomNumber} for your consultation.</span>
            </div>
          </div>
          <button
            onClick={() => setAudioAlert(false)}
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Header & Appointment Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 radar-live"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Real-time Queue Gateway
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
            Live Queue Tracker
          </h1>
        </div>

        {/* Multi appointment dropdown for active appointments */}
        {activeAppts.length > 1 && (
          <select
            value={selectedAppt._id}
            onChange={(e) => {
              const appt = appointments.find(a => a._id === e.target.value);
              if (appt) setSelectedAppt(appt);
            }}
            className="w-full sm:w-auto px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200"
          >
            {activeAppts.map(a => (
              <option key={a._id} value={a._id}>
                Token #{a.tokenNumber} ({a.tokenCode}) - Dr. {a.doctorId?.userId?.name || 'Doctor'}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Smart Leave Now Notification Card */}
      <LeaveNowBanner
        appointmentId={selectedAppt._id}
        estimatedTurnTime={queueStatus?.estimatedTurnTime || selectedAppt.estimatedTurnTime}
        travelTimeMinutes={selectedAppt.userTravelTimeMinutes || 25}
        checkInBufferMinutes={selectedAppt.checkInBufferMinutes || 15}
        onTravelTimeUpdated={(mins) => {
          setSelectedAppt(prev => ({ ...prev, userTravelTimeMinutes: mins }));
        }}
      />

      {/* Main Queue Progress Ring & Consultation Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Big Animated Ring */}
        <div className="lg:col-span-7">
          <LiveProgressRing
            currentToken={queueStatus?.currentToken || 1}
            myToken={selectedAppt.tokenNumber}
            tokenCode={selectedAppt.tokenCode}
            patientsAhead={queueStatus?.patientsAhead ?? 1}
            estimatedWaitMinutes={queueStatus?.estimatedWaitMinutes ?? 18}
            status={queueStatus?.status || selectedAppt.status}
          />
        </div>

        {/* Right: Doctor & Token QR Passport */}
        <div className="lg:col-span-5 space-y-4">
          {/* Doctor Info Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Consulting Specialist</h3>

            <div className="flex items-center space-x-3.5">
              <img
                src={selectedAppt.doctorId?.userId?.avatar || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=200&q=80'}
                alt="Doctor"
                className="w-14 h-14 rounded-2xl object-cover border-2 border-teal-500 shadow-sm"
              />
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                  {selectedAppt.doctorId?.userId?.name || 'Dr. Anita Desai'}
                </h4>
                <span className="text-xs text-teal-600 font-semibold block mt-0.5">
                  {selectedAppt.departmentId?.name || 'Cardiology'}
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Room: <strong>{selectedAppt.doctorId?.roomNumber || 'OPD-101'}</strong>
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <p className="flex items-center justify-between">
                <span className="text-slate-400">Hospital:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedAppt.hospitalId?.name}</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-slate-400">Appointment Date:</span>
                <span className="font-bold">{selectedAppt.date} ({selectedAppt.timeSlot})</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-slate-400">Patient:</span>
                <span className="font-bold">{selectedAppt.bookedForFamilyMember || user?.name}</span>
              </p>
            </div>
          </div>

          {/* Digital QR Token Card */}
          <div className="bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-700 text-white rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-teal-200 block">
                Contactless Triage Check-in
              </span>
              <h4 className="text-xl font-black mt-0.5">Digital QR Token</h4>
              <p className="text-xs text-teal-100 max-w-[200px] mt-1">
                Scan this at the hospital reception kiosk or OPD nurse desk.
              </p>
            </div>

            <div
              onClick={() => setShowQrModal(true)}
              className="w-20 h-20 bg-white p-1 rounded-2xl shadow-lg cursor-pointer hover:scale-105 transition flex-shrink-0 self-center sm:self-auto"
              title="Click to enlarge"
            >
              <img src={selectedAppt.qrCode} alt="Token QR" className="w-full h-full object-contain" />
            </div>
          </div>

          {/* Cancellation Option for Patient */}
          {['scheduled', 'checked_in', 'called'].includes(selectedAppt.status) && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Unable to attend today?</span>
                <span className="text-[11px] text-slate-400">Cancel appointment to free up the slot for waiting patients.</span>
              </div>
              <button
                onClick={handleCancelAppointment}
                disabled={cancelling}
                className="w-full sm:w-auto px-4 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition flex-shrink-0"
              >
                <XCircle className="w-4 h-4 text-rose-500" />
                <span>{cancelling ? 'Cancelling...' : 'Cancel Appointment'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Enlarged QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto text-center shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Token #{selectedAppt.tokenNumber}</h3>
            <span className="text-xs font-mono font-bold text-teal-600">{selectedAppt.tokenCode}</span>
            <div className="my-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl inline-block border">
              <img src={selectedAppt.qrCode} alt="Enlarged QR" className="w-56 h-56 object-contain" />
            </div>
            <p className="text-[11px] text-slate-500">Hold near scanner at hospital kiosk</p>
            <button
              onClick={() => setShowQrModal(false)}
              className="mt-4 w-full py-2 bg-slate-900 dark:bg-slate-700 text-white text-xs font-bold rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}