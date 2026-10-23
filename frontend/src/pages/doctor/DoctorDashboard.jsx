import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';
import {
  Users,
  Clock,
  Play,
  CheckCircle,
  PhoneCall,
  UserX,
  FileText,
  Activity,
  AlertCircle,
  Eye,
  Check,
  Stethoscope,
  Volume2
} from 'lucide-react';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { socket, joinDoctorQueue } = useSocket();

  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState(null);

  // End consultation notes modal state
  const [consultNotes, setConsultNotes] = useState('');
  const [prescriptionText, setPrescriptionText] = useState('');
  const [completing, setCompleting] = useState(false);

  // Patient history drawer state
  const [historyPatient, setHistoryPatient] = useState(null);
  const [patientRecords, setPatientRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  // Fetch doctor record
  useEffect(() => {
    api.get('/doctors')
      .then(res => {
        const doc = res.data.doctors?.find(d => d.userId?._id === user?.id || d.userId?.email === user?.email) || res.data.doctors?.[0];
        if (doc) {
          setDoctorId(doc._id);
          fetchLiveQueue(doc._id);
          joinDoctorQueue(doc._id);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [user]);

  const fetchLiveQueue = (id) => {
    api.get(`/queue/doctor/${id}/live`)
      .then(res => setQueueData(res.data))
      .catch(err => console.error(err));
  };

  // Socket listener for real-time queue updates
  useEffect(() => {
    if (!socket || !doctorId) return;

    socket.on('queue:updated', (data) => {
      if (!data?.doctorId || data.doctorId.toString() === doctorId.toString()) {
        fetchLiveQueue(doctorId);
      }
    });

    socket.on('queue:refresh', (data) => {
      if (!data?.doctorId || data.doctorId.toString() === doctorId.toString()) {
        fetchLiveQueue(doctorId);
      }
    });

    return () => {
      socket.off('queue:updated');
      socket.off('queue:refresh');
    };
  }, [socket, doctorId]);

  // Actions
  const handleCallNext = async () => {
    try {
      await api.post('/queue/call-next', { doctorId });
      fetchLiveQueue(doctorId);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to call next token');
    }
  };

  const handleStartConsultation = async (apptId) => {
    try {
      await api.post('/queue/start-consultation', { appointmentId: apptId });
      fetchLiveQueue(doctorId);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start consultation');
    }
  };

  const handleEndConsultation = async () => {
    if (!queueData?.currentPatient) return;
    setCompleting(true);
    try {
      await api.post('/queue/end-consultation', {
        appointmentId: queueData.currentPatient._id,
        doctorNotes: consultNotes,
        prescription: prescriptionText
      });
      setConsultNotes('');
      setPrescriptionText('');
      fetchLiveQueue(doctorId);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to complete consultation');
    } finally {
      setCompleting(false);
    }
  };

  const handleNoShow = async (apptId) => {
    if (!window.confirm('Mark this patient as No-Show? This will advance the waiting queue.')) return;
    try {
      await api.post('/queue/no-show', { appointmentId: apptId });
      fetchLiveQueue(doctorId);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to mark no-show');
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await api.put('/doctors/status', { status });
      fetchLiveQueue(doctorId);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update live status');
    }
  };

  // View patient health history (consent enforced on backend!)
  const handleViewPatientHistory = async (patientId, patientName) => {
    setHistoryPatient(patientName);
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const res = await api.get(`/records/patient/${patientId}`);
      setPatientRecords(res.data.records || []);
    } catch (err) {
      setHistoryError(err.response?.data?.error || 'Consent blocked: Patient has not granted active consent.');
      setPatientRecords([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading Doctor Consultation Engine...</div>;
  }

  const currentPatient = queueData?.currentPatient;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Banner: Doctor Info & Live Availability Toggles */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 radar-live"></span>
            <span className="text-xs font-bold uppercase text-teal-600">Active Consultation Desk</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {queueData?.doctor?.name} ({queueData?.doctor?.specialty})
          </h1>
          <p className="text-xs text-slate-500">
            Room: <strong>{queueData?.doctor?.roomNumber}</strong>
          </p>
        </div>

        {/* Live Availability Toggles */}
        <div className="w-full md:w-auto flex items-center justify-between sm:justify-start space-x-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => handleStatusChange('available')}
            className={`flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-xl transition ${queueData?.doctor?.liveStatus === 'available' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'}`}
          >
            🟢 Available
          </button>
          <button
            onClick={() => handleStatusChange('in_consultation')}
            className={`flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-xl transition ${queueData?.doctor?.liveStatus === 'in_consultation' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'}`}
          >
            🟡 Consulting
          </button>
          <button
            onClick={() => handleStatusChange('on_break')}
            className={`flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-xl transition ${queueData?.doctor?.liveStatus === 'on_break' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300'}`}
          >
            ☕ On Break
          </button>
        </div>
      </div>

      {/* Main Grid: Active Consultation Workspace & Waiting Line */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Active Consultation Station */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs uppercase font-extrabold text-teal-600">Active Consultation Desk</span>
              {currentPatient && (
                <span className="text-xs font-mono font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                  Started at {new Date(currentPatient.consultationStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>

            {currentPatient ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <span className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
                      Token #{currentPatient.tokenNumber}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-teal-700 dark:text-teal-300">
                      {currentPatient.bookedForFamilyMember || currentPatient.patientId?.name}
                    </h3>
                    <p className="text-xs text-slate-500">Phone: {currentPatient.patientId?.phone || 'Confidential'}</p>
                  </div>

                  <button
                    onClick={() => handleViewPatientHistory(currentPatient.patientId?._id, currentPatient.patientId?.name)}
                    className="self-start px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-xs font-bold border border-teal-200 dark:border-teal-800 hover:bg-teal-100 flex items-center space-x-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Health History</span>
                  </button>
                </div>

                {currentPatient.symptoms && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl text-xs">
                    <span className="text-slate-400 block font-semibold">Reported Symptoms:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">{currentPatient.symptoms}</span>
                  </div>
                )}

                {/* Consultation Notes & Prescriptions */}
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Clinical Diagnosis & Notes</label>
                    <textarea
                      rows={2}
                      value={consultNotes}
                      onChange={(e) => setConsultNotes(e.target.value)}
                      placeholder="Add diagnosis, vital findings, ECG analysis..."
                      className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Prescription / Treatment Plan</label>
                    <textarea
                      rows={2}
                      value={prescriptionText}
                      onChange={(e) => setPrescriptionText(e.target.value)}
                      placeholder="e.g. Tab Telmisartan 40mg (1-0-0) x 30 days..."
                      className="w-full text-xs p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>

                  <button
                    onClick={handleEndConsultation}
                    disabled={completing}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>{completing ? 'Updating Dynamic Engine...' : 'End Consultation & Recalculate Wait Times'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 space-y-3">
                <div className="w-14 h-14 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-600 flex items-center justify-center mx-auto">
                  <Stethoscope className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">No Patient in Consultation</h3>
                <p className="text-xs text-slate-400">Call the next waiting token to start your consultation timer.</p>
                <button
                  onClick={handleCallNext}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition"
                >
                  Call Next Token →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Today's Waiting Queue List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Waiting Queue ({queueData?.waitingQueue?.length || 0})</h3>
                <span className="text-[11px] text-slate-400">Completed today: {queueData?.completedCount || 0}</span>
              </div>
              <button
                onClick={handleCallNext}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
              >
                Call Next
              </button>
            </div>

            {queueData?.waitingQueue && queueData.waitingQueue.length > 0 ? (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {queueData.waitingQueue.map((item, idx) => (
                  <div
                    key={item._id}
                    className={`p-3.5 rounded-2xl border transition ${
                      item.status === 'called'
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700'
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        <span className="text-lg font-black text-slate-900 dark:text-white">
                          #{item.tokenNumber}
                        </span>
                        <div>
                          <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">
                            {item.bookedForFamilyMember || item.patientId?.name}
                          </h4>
                          <span className="text-[10px] text-slate-400 block">
                            Slot: {item.timeSlot} • Status: <strong className="capitalize">{item.status.replace('_', ' ')}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleStartConsultation(item._id)}
                          title="Start Consultation"
                          className="p-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 text-xs"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleNoShow(item._id)}
                          title="Mark No-Show"
                          className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-rose-100 hover:text-rose-600 text-xs"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">No more patients waiting in queue.</p>
            )}
          </div>
        </div>
      </div>

      {/* Patient Health History Modal with Consent Enforcement */}
      {historyPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Medical Records: {historyPatient}
              </h3>
              <button onClick={() => setHistoryPatient(null)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">
                Close ✕
              </button>
            </div>

            {historyLoading ? (
              <p className="py-8 text-center text-xs text-slate-400">Verifying patient consent & decrypting records...</p>
            ) : historyError ? (
              <div className="my-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200">
                <AlertCircle className="w-5 h-5 text-rose-600 mb-1" />
                <strong className="block font-bold">Access Blocked by Privacy Engine</strong>
                <span>{historyError}</span>
              </div>
            ) : (
              <div className="my-4 space-y-3 max-h-96 overflow-y-auto text-xs">
                {patientRecords.map(r => (
                  <div key={r._id} className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                    <div className="flex items-center justify-between font-bold">
                      <span>{r.title}</span>
                      <span className="text-[10px] text-slate-400">{new Date(r.date).toLocaleDateString()}</span>
                    </div>
                    {r.aiSummary && <p className="text-teal-800 dark:text-teal-300 text-[11px]">{r.aiSummary}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
