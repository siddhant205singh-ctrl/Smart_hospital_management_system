import React, { useState, useEffect } from 'react';
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
  Sparkles
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

  // Fetch patient's upcoming appointments
  useEffect(() => {
    api.get('/appointments/my')
      .then(res => {
        const appts = res.data.appointments || [];
        setAppointments(appts);
        // Default to first active appointment
        const active = appts.find(a => ['scheduled', 'checked_in', 'called', 'in_consultation'].includes(a.status)) || appts[0];
        if (active) setSelectedAppt(active);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Fetch live queue status when selectedAppt changes
  useEffect(() => {
    if (selectedAppt) {
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

    return () => {
      socket.off('queue:wait_time_changed');
      socket.off('queue:token_called');
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

  if (!selectedAppt) {
    return (
      <div className="max-w-2xl mx-auto my-16 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center shadow-lg">
        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">No Active Appointments Found</h2>
        <p className="text-xs text-slate-500 mt-1">Book an appointment with any network doctor to receive your live digital token!</p>
        <a
          href="/doctors"
          className="mt-5 inline-block px-5 py-2.5 bg-teal-600 text-white font-bold text-xs rounded-xl shadow-md"
        >
          Find Doctors & Book →
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Called Alert Banner */}
      {audioAlert && (
        <div className="p-4 bg-emerald-500 text-white rounded-2xl flex items-center justify-between shadow-xl animate-bounce">
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

        {/* Multi appointment dropdown if multiple exist */}
        {appointments.length > 1 && (
          <select
            value={selectedAppt._id}
            onChange={(e) => {
              const appt = appointments.find(a => a._id === e.target.value);
              setSelectedAppt(appt);
            }}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200"
          >
            {appointments.map(a => (
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
          <div className="bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-700 text-white rounded-3xl p-6 shadow-xl flex items-center justify-between">
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
              className="w-20 h-20 bg-white p-1 rounded-2xl shadow-lg cursor-pointer hover:scale-105 transition flex-shrink-0"
              title="Click to enlarge"
            >
              <img src={selectedAppt.qrCode} alt="Token QR" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
      </div>

      {/* Enlarged QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl border border-slate-200 dark:border-slate-800">
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
