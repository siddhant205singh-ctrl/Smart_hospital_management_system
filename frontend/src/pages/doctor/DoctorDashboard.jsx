import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import api, { getMediaUrl } from '../../services/api';
import {
  Users,
  Clock,
  Play,
  CheckCircle,
  CheckCircle2,
  PhoneCall,
  UserX,
  FileText,
  Activity,
  AlertCircle,
  Eye,
  Check,
  Stethoscope,
  Volume2,
  Sparkles,
  Paperclip,
  FolderOpen,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCw,
  X,
  Shield,
  Pin,
  ExternalLink,
  Globe,
  Loader2
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
  const [actionLoading, setActionLoading] = useState({ start: null, callNext: false });
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3500);
  };

  // Patient history drawer state
  const [historyPatient, setHistoryPatient] = useState(null);
  const [patientRecords, setPatientRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  // Feature B: Pre-consultation documents & AI clinical summary state
  const [loadedDocsAppointmentId, setLoadedDocsAppointmentId] = useState(null);
  const [patientDocsData, setPatientDocsData] = useState(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docsError, setDocsError] = useState('');
  const [viewingDoc, setViewingDoc] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [summaryLanguage, setSummaryLanguage] = useState('en');
  const [aiSummary, setAiSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [docSummaryLoadingId, setDocSummaryLoadingId] = useState(null);
  const [batchSummaryLoading, setBatchSummaryLoading] = useState(false);

  // Fetch doctor record strictly for the logged-in physician
  useEffect(() => {
    if (!user) return;
    if (user.role !== 'doctor') {
      setLoading(false);
      return;
    }

    api.get('/doctors/profile/me')
      .then(res => {
        const doc = res.data.doctor;
        if (doc) {
          setDoctorId(doc._id);
          fetchLiveQueue(doc._id);
          joinDoctorQueue(doc._id);
        }
      })
      .catch(() => {
        // Fallback by matching authenticated user email or ID in /doctors without ever blindly picking index 0
        api.get('/doctors')
          .then(fallbackRes => {
            const matched = fallbackRes.data.doctors?.find(d =>
              (d.userId?._id && (d.userId._id === user.id || d.userId._id === user._id)) ||
              (d.userId?.email && d.userId.email.toLowerCase() === user.email?.toLowerCase())
            );
            if (matched) {
              setDoctorId(matched._id);
              fetchLiveQueue(matched._id);
              joinDoctorQueue(matched._id);
            } else {
              console.warn('[DoctorDashboard] No matching doctor record for user:', user.email);
            }
          })
          .catch(console.error)
          .finally(() => setLoading(false));
      })
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
    setActionLoading(prev => ({ ...prev, callNext: true }));
    try {
      const res = await api.post('/queue/call-next', { doctorId });
      const called = res.data.calledAppointment;
      showToast(`Token #${called?.tokenNumber || ''} called! Patient notified.`, 'success');
      fetchLiveQueue(doctorId);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to call next token', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, callNext: false }));
    }
  };

  const handleStartConsultation = async (apptId) => {
    setActionLoading(prev => ({ ...prev, start: apptId }));
    
    // Instant optimistic update so screen NEVER looks frozen
    const selected = queueData?.waitingQueue?.find(a => a._id === apptId) ||
                     (queueData?.calledPatient?._id === apptId ? queueData.calledPatient : null);

    if (selected) {
      setQueueData(prev => prev ? {
        ...prev,
        currentPatient: { ...selected, status: 'in_consultation' },
        waitingQueue: prev.waitingQueue?.filter(a => a._id !== apptId) || [],
        calledPatient: prev.calledPatient?._id === apptId ? null : prev.calledPatient
      } : prev);
      showToast(`Consultation started with ${selected.bookedForFamilyMember || selected.patientId?.name || 'patient'}.`, 'success');
    }

    try {
      await api.post('/queue/start-consultation', { appointmentId: apptId });
      // Reset doc viewer state for new patient
      setLoadedDocsAppointmentId(null);
      setPatientDocsData(null);
      setAiSummary(null);
      setDocsError('');
      fetchLiveQueue(doctorId);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to start consultation', 'error');
      fetchLiveQueue(doctorId);
    } finally {
      setActionLoading(prev => ({ ...prev, start: null }));
    }
  };

  // Feature B: Load Patient Documents on Explicit Doctor Demand or Auto-Load
  const handleLoadPatientDocuments = async (appointmentId) => {
    if (!appointmentId) return;
    setLoadingDocs(true);
    setDocsError('');
    try {
      const res = await api.get(`/consultations/${appointmentId}/documents`);
      setPatientDocsData(res.data);
      setLoadedDocsAppointmentId(appointmentId);
    } catch (err) {
      setDocsError(err.response?.data?.error || 'Failed to load pre-consultation documents.');
    } finally {
      setLoadingDocs(false);
    }
  };

  // Auto-load patient documents when a patient enters active consultation
  useEffect(() => {
    const currentId = queueData?.currentPatient?._id;
    if (currentId && loadedDocsAppointmentId !== currentId) {
      handleLoadPatientDocuments(currentId);
    }
  }, [queueData?.currentPatient?._id]);

  // Toggle Reviewed status for a document
  const handleToggleDocReview = async (appointmentId, docId) => {
    try {
      const res = await api.post(`/consultations/${appointmentId}/documents/${docId}/review`);
      setPatientDocsData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          documents: prev.documents.map(d =>
            d._id === docId ? { ...d, isReviewedByDoctor: res.data.isReviewedByDoctor } : d
          )
        };
      });
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to mark document reviewed');
    }
  };

  // Pin document reference to clinical notes
  const handlePinDocToNotes = (doc) => {
    const pinSnippet = `\n[Document Verified: ${doc.title} (${doc.reportType || doc.documentType})]`;
    if (!consultNotes.includes(pinSnippet)) {
      setConsultNotes(prev => prev ? prev + pinSnippet : pinSnippet.trim());
      showToast('Document reference pinned to notes', 'success');
    }
  };

  // Generate individual AI summary for a specific document
  const handleGenerateDocSummary = async (appointmentId, docId, force = false) => {
    setDocSummaryLoadingId(docId);
    try {
      const res = await api.post(`/consultations/${appointmentId}/documents/${docId}/summary`, {
        language: summaryLanguage,
        forceRegenerate: force
      });
      const summaryText = res.data.aiSummary;
      setPatientDocsData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          documents: prev.documents.map(d =>
            d._id === docId ? { ...d, aiSummary: summaryText, aiSummaryGeneratedAt: res.data.aiSummaryGeneratedAt } : d
          )
        };
      });
      setViewingDoc(prev => (prev && prev._id === docId ? { ...prev, aiSummary: summaryText } : prev));
      showToast('AI Report Summary generated!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to generate report summary', 'error');
    } finally {
      setDocSummaryLoadingId(null);
    }
  };

  // Batch generate AI summaries for all attached reports
  const handleGenerateAllDocsSummary = async (appointmentId) => {
    setBatchSummaryLoading(true);
    try {
      const res = await api.post(`/consultations/${appointmentId}/documents/summarize-all`, {
        language: summaryLanguage
      });
      const summaries = res.data.summaries || [];
      const summaryMap = new Map(summaries.map(s => [s.docId, s.aiSummary]));
      setPatientDocsData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          documents: prev.documents.map(d =>
            summaryMap.has(d._id) ? { ...d, aiSummary: summaryMap.get(d._id) } : d
          )
        };
      });
      setViewingDoc(prev => {
        if (prev && summaryMap.has(prev._id)) {
          return { ...prev, aiSummary: summaryMap.get(prev._id) };
        }
        return prev;
      });
      showToast(`AI Summaries ready for attached report(s)!`, 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to summarize all reports', 'error');
    } finally {
      setBatchSummaryLoading(false);
    }
  };

  // Generate Assistive AI Summary for Doctor
  const handleGenerateAiSummary = async (appointmentId, forceRegenerate = false) => {
    setSummaryLoading(true);
    setSummaryError('');
    try {
      const endpoint = forceRegenerate
        ? `/consultations/${appointmentId}/documents/summary/regenerate`
        : `/consultations/${appointmentId}/documents/summary`;
      const res = await api.post(endpoint, { language: summaryLanguage });
      setAiSummary(res.data.summary);
    } catch (err) {
      setSummaryError(err.response?.data?.error || 'Summary unavailable. Please review the original documents directly.');
    } finally {
      setSummaryLoading(false);
    }
  };

  // Insert AI summary into consultation notes for permanent medical record
  const handleInsertSummaryToNotes = () => {
    if (!aiSummary) return;
    let text = `\n--- AI Clinical Summary (Reviewed by Physician) ---\n`;
    if (aiSummary.overallSummary) {
      text += `Summary: ${aiSummary.overallSummary}\n`;
    }
    if (aiSummary.keyFindings?.length > 0) {
      text += `Key Findings:\n` + aiSummary.keyFindings.map(f => `• ${f.finding}${f.isAbnormal ? ' [ABNORMAL]' : ''}`).join('\n') + '\n';
    }
    if (aiSummary.conditions?.length > 0) {
      text += `Reported Conditions: ${aiSummary.conditions.join(', ')}\n`;
    }
    if (aiSummary.medications?.length > 0) {
      text += `Medications: ${aiSummary.medications.map(m => `${m.name} ${m.dose || ''}${m.isPatientReported ? ' (Patient-reported)' : ''}`).join(', ')}\n`;
    }
    text += `--------------------------------------------------\n`;

    setConsultNotes(prev => prev ? prev + text : text.trim());
  };

  const handleEndConsultation = async () => {
    if (!queueData?.currentPatient) return;
    setCompleting(true);
    const completedAppt = queueData.currentPatient;

    // Instant optimistic update: release the desk immediately
    setQueueData(prev => prev ? {
      ...prev,
      currentPatient: null,
      completedQueue: completedAppt ? [{ ...completedAppt, status: 'completed' }, ...(prev.completedQueue || [])] : prev.completedQueue,
      completedCount: (prev.completedCount || 0) + 1
    } : prev);

    showToast('Consultation completed successfully! Patient records updated.', 'success');
    setConsultNotes('');
    setPrescriptionText('');
    setLoadedDocsAppointmentId(null);
    setPatientDocsData(null);
    setAiSummary(null);

    try {
      await api.post('/queue/end-consultation', {
        appointmentId: completedAppt._id,
        doctorNotes: consultNotes,
        prescription: prescriptionText
      });
      fetchLiveQueue(doctorId);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to complete consultation', 'error');
      fetchLiveQueue(doctorId);
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

  if (user && user.role !== 'doctor') {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading Doctor Consultation Engine...</div>;
  }

  if (!doctorId && !loading) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto">
          <Stethoscope className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Physician Profile Not Linked</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Your account (<strong>{user?.email}</strong>) does not have an active physician OPD assignment in the system. Please verify you are logged in with your assigned doctor credentials.
        </p>
      </div>
    );
  }

  const currentPatient = queueData?.currentPatient;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Feedback Toast Notification */}
      {toast.show && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 text-xs font-bold transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-teal-600 text-white'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

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
                    <span className="text-slate-400 block font-semibold">Reported Symptoms / Reason for Visit:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">{currentPatient.reasonForVisit || currentPatient.symptoms}</span>
                  </div>
                )}

                {/* Feature B: Pre-Consultation Patient Documents Panel */}
                <div className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80 dark:border-slate-700/80">
                    <div className="flex items-center space-x-2">
                      <FolderOpen className="w-4 h-4 text-teal-600" />
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                        Pre-Consultation Documents & Health Records
                      </h4>
                      {(currentPatient.documentsCount > 0 || patientDocsData?.documents?.length > 0) && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                          {patientDocsData?.documents?.length || currentPatient.documentsCount} Attached
                        </span>
                      )}
                    </div>

                    {loadedDocsAppointmentId !== currentPatient._id ? (
                      <button
                        onClick={() => handleLoadPatientDocuments(currentPatient._id)}
                        disabled={loadingDocs}
                        className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center space-x-1.5 self-start sm:self-auto"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>{loadingDocs ? 'Loading Records...' : 'Load Patient Documents'}</span>
                      </button>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center space-x-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Consent Verified</span>
                        </span>
                        {patientDocsData?.documents?.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleGenerateAllDocsSummary(currentPatient._id)}
                            disabled={batchSummaryLoading}
                            className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 transition flex items-center space-x-1 disabled:opacity-50"
                            title="Generate AI summary for all attached reports"
                          >
                            {batchSummaryLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin text-purple-600 dark:text-purple-400" />
                            ) : (
                              <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                            )}
                            <span>{batchSummaryLoading ? 'Summarizing All...' : 'Summarize All Reports'}</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleLoadPatientDocuments(currentPatient._id)}
                          title="Refresh documents"
                          className="p-1 rounded-lg border text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <RefreshCw className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {docsError && (
                    <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{docsError}</span>
                    </div>
                  )}

                  {/* Documents List when loaded */}
                  {loadedDocsAppointmentId === currentPatient._id && patientDocsData && (
                    <div className="space-y-3">
                      {patientDocsData.documents?.length === 0 ? (
                        <p className="text-xs text-slate-400 py-2 text-center">No documents were attached for this appointment.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {patientDocsData.documents.map(doc => (
                            <div
                              key={doc._id}
                              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-col justify-between space-y-2 shadow-xs"
                            >
                              <div className="flex items-start justify-between">
                                <div className="space-y-0.5">
                                  <span className="font-bold text-xs text-slate-900 dark:text-white block truncate max-w-[170px]">
                                    {doc.title}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block capitalize">
                                    {doc.reportType || doc.documentType}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  {doc.aiSummary && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 flex items-center space-x-0.5">
                                      <Sparkles className="w-2.5 h-2.5" />
                                      <span>AI</span>
                                    </span>
                                  )}
                                  {doc.isReviewedByDoctor && (
                                    <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                      Reviewed
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewingDoc(doc);
                                    setZoomLevel(1);
                                    setRotation(0);
                                  }}
                                  className="flex-1 py-1 px-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 font-semibold flex items-center justify-center space-x-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>View</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleGenerateDocSummary(currentPatient._id, doc._id, Boolean(doc.aiSummary))}
                                  disabled={docSummaryLoadingId === doc._id}
                                  className={`py-1 px-2 rounded-lg font-semibold border transition flex items-center space-x-1 ${
                                    doc.aiSummary
                                      ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                                      : 'bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800'
                                  }`}
                                  title={doc.aiSummary ? "Regenerate AI Report Summary" : "Generate AI Summary for this report"}
                                >
                                  {docSummaryLoadingId === doc._id ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
                                  ) : (
                                    <Sparkles className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                                  )}
                                  <span>{docSummaryLoadingId === doc._id ? 'Analyzing...' : doc.aiSummary ? 'AI Summary' : 'AI Summary'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleDocReview(currentPatient._id, doc._id)}
                                  className={`py-1 px-2 rounded-lg font-semibold border transition ${
                                    doc.isReviewedByDoctor
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'text-slate-600 hover:bg-slate-50 border-slate-200 dark:border-slate-700'
                                  }`}
                                  title="Mark as reviewed by physician"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePinDocToNotes(doc)}
                                  className="p-1 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-50 border border-slate-200 dark:border-slate-700"
                                  title="Pin to clinical notes"
                                >
                                  <Pin className="w-3 h-3" />
                                </button>
                              </div>

                              {/* Per-Report AI Summary block */}
                              {doc.aiSummary && (
                                <div className="mt-1.5 p-2 rounded-xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/40 text-xs">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-bold text-[10px] text-purple-900 dark:text-purple-300 flex items-center space-x-1">
                                      <Sparkles className="w-2.5 h-2.5 text-purple-600" />
                                      <span>AI Report Summary</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const pinSnippet = `\n[AI Summary - ${doc.title}]:\n${doc.aiSummary}`;
                                        if (!consultNotes.includes(pinSnippet)) {
                                          setConsultNotes(prev => prev ? prev + pinSnippet : pinSnippet.trim());
                                          showToast('Summary pinned to clinical notes!', 'success');
                                        }
                                      }}
                                      className="text-[9px] text-purple-700 dark:text-purple-300 hover:underline flex items-center space-x-0.5"
                                      title="Pin this summary to consultation notes"
                                    >
                                      <Pin className="w-2.5 h-2.5" />
                                      <span>Pin</span>
                                    </button>
                                  </div>
                                  <div className="text-[10px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-h-24 overflow-y-auto pr-1">
                                    {doc.aiSummary}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Feature B4: Assistive AI Clinical Summary (Doctor-Only) */}
                      {patientDocsData.documents?.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700/80 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center space-x-2">
                              <Sparkles className="w-4 h-4 text-purple-600" />
                              <h5 className="font-bold text-xs text-purple-900 dark:text-purple-300">
                                Assistive AI Clinical Summary (Physician Review Only)
                              </h5>
                            </div>

                            <div className="flex items-center space-x-2">
                              <div className="flex items-center space-x-1 p-0.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-[10px]">
                                <Globe className="w-3 h-3 text-slate-400 ml-1" />
                                <button
                                  type="button"
                                  onClick={() => setSummaryLanguage('en')}
                                  className={`px-1.5 py-0.5 rounded font-bold transition ${
                                    summaryLanguage === 'en' ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs' : 'text-slate-500'
                                  }`}
                                >
                                  EN
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSummaryLanguage('hi')}
                                  className={`px-1.5 py-0.5 rounded font-bold transition ${
                                    summaryLanguage === 'hi' ? 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs' : 'text-slate-500'
                                  }`}
                                >
                                  हिंदी
                                </button>
                              </div>

                              <button
                                type="button"
                                disabled={summaryLoading}
                                onClick={() => handleGenerateAiSummary(currentPatient._id, !!aiSummary)}
                                className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 flex items-center space-x-1"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>{summaryLoading ? 'Analyzing...' : aiSummary ? 'Regenerate' : 'Summarize with AI'}</span>
                              </button>
                            </div>
                          </div>

                          {summaryError && (
                            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-amber-800 dark:text-amber-200 text-xs">
                              {summaryError}
                            </div>
                          )}

                          {aiSummary && (
                            <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 space-y-3 text-xs animate-in fade-in">
                              {/* Clinical Review Disclaimer */}
                              <div className="p-2.5 rounded-xl bg-purple-100/70 dark:bg-purple-900/40 border border-purple-300 text-purple-900 dark:text-purple-200 text-[10px] leading-relaxed">
                                <strong>Physician Notice:</strong> {aiSummary.disclaimer || 'AI-generated summary for clinical review. Not a diagnosis or treatment recommendation. Verify against the original documents.'}
                              </div>

                              {/* 1. Overall Summary */}
                              {aiSummary.overallSummary && (
                                <div>
                                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] mb-0.5">
                                    Overall Summary:
                                  </span>
                                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                                    {aiSummary.overallSummary}
                                  </p>
                                </div>
                              )}

                              {/* 2. Key Findings & Flagged Abnormal Values */}
                              {aiSummary.keyFindings?.length > 0 && (
                                <div>
                                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] mb-1">
                                    Key Findings & Lab Values:
                                  </span>
                                  <div className="space-y-1">
                                    {aiSummary.keyFindings.map((f, i) => (
                                      <div
                                        key={i}
                                        className={`p-1.5 rounded-lg flex items-start justify-between text-[11px] ${
                                          f.isAbnormal
                                            ? 'bg-rose-100/70 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 border border-rose-200'
                                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                                        }`}
                                      >
                                        <span>• {f.finding}</span>
                                        {f.isAbnormal && (
                                          <span className="ml-2 px-1.5 py-0.2 rounded font-black text-[9px] uppercase bg-rose-600 text-white flex-shrink-0">
                                            Abnormal
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 3. Conditions & Allergies */}
                              {aiSummary.conditions?.length > 0 && (
                                <div>
                                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] mb-0.5">
                                    Diagnoses / Conditions:
                                  </span>
                                  <span className="text-slate-700 dark:text-slate-300">
                                    {aiSummary.conditions.join(', ')}
                                  </span>
                                </div>
                              )}

                              {/* 4. Medications */}
                              {aiSummary.medications?.length > 0 && (
                                <div>
                                  <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px] mb-1">
                                    Current Medications:
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {aiSummary.medications.map((m, i) => (
                                      <span
                                        key={i}
                                        className="px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border text-[11px] text-slate-800 dark:text-slate-200"
                                      >
                                        {m.name} {m.dose}
                                        {m.isPatientReported && (
                                          <em className="text-[9px] text-amber-600 ml-1">(Patient-reported)</em>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 5. Gaps or Missing items */}
                              {aiSummary.possibleGaps?.length > 0 && (
                                <div className="text-[10px] text-slate-500">
                                  <strong>Possible Gaps:</strong> {aiSummary.possibleGaps.join('; ')}
                                </div>
                              )}

                              {/* Insert into Notes button */}
                              <div className="pt-2 flex justify-end">
                                <button
                                  type="button"
                                  onClick={handleInsertSummaryToNotes}
                                  className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1"
                                >
                                  <Pin className="w-3.5 h-3.5" />
                                  <span>Insert Summary into Clinical Notes</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

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
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-60"
                  >
                    {completing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving Record & Recalculating...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>End Consultation & Save Record</span>
                      </>
                    )}
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
                  disabled={actionLoading.callNext}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2 mx-auto disabled:opacity-60"
                >
                  {actionLoading.callNext && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Call Next Token →</span>
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
                disabled={actionLoading.callNext}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5 disabled:opacity-60"
              >
                {actionLoading.callNext && <Loader2 className="w-3 h-3 animate-spin" />}
                <span>Call Next</span>
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
                          {(item.documentsCount > 0 || item.hasDocuments) && (
                            <span className="inline-flex items-center space-x-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              <Paperclip className="w-3 h-3" />
                              <span>Documents attached ({item.documentsCount || 1})</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleStartConsultation(item._id)}
                          disabled={actionLoading.start === item._id}
                          title="Start Consultation"
                          className="p-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 text-xs flex items-center justify-center disabled:opacity-60"
                        >
                          {actionLoading.start === item._id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5" />
                          )}
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

      {/* Inline Document Viewer Modal (Doctor Only) */}
      {viewingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  {viewingDoc.title}
                </h4>
                <span className="text-[10px] text-slate-400 capitalize">
                  {viewingDoc.reportType || viewingDoc.documentType} • Verified Consultation Access
                </span>
              </div>

              {/* Viewer Controls */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.2))}
                  className="p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono text-slate-500 w-10 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.2))}
                  className="p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation(prev => (prev + 90) % 360)}
                  className="p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  title="Rotate 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <a
                  href={getMediaUrl(viewingDoc.signedViewUrl || viewingDoc.fileUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 text-teal-600 dark:text-teal-400"
                  title="Open file in new window"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setViewingDoc(null)}
                  className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-600 dark:text-slate-300"
                  title="Close viewer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Per-Report AI Summary Banner inside Document Viewer */}
            <div className="px-4 py-2.5 bg-purple-50/70 dark:bg-purple-950/40 border-b border-purple-200/60 dark:border-purple-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-start space-x-2 flex-1">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-bold text-[11px] text-purple-900 dark:text-purple-200 block">
                    AI Clinical Report Summary
                  </span>
                  {viewingDoc.aiSummary ? (
                    <div className="text-[11px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap mt-0.5 leading-relaxed max-h-24 overflow-y-auto">
                      {viewingDoc.aiSummary}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic mt-0.5">
                      No AI summary generated for this report yet. Click "Generate Summary" to produce an instant clinical analysis.
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-1.5 flex-shrink-0 self-end sm:self-center">
                {viewingDoc.aiSummary && (
                  <button
                    type="button"
                    onClick={() => {
                      const pinSnippet = `\n[AI Summary - ${viewingDoc.title}]:\n${viewingDoc.aiSummary}`;
                      if (!consultNotes.includes(pinSnippet)) {
                        setConsultNotes(prev => prev ? prev + pinSnippet : pinSnippet.trim());
                        showToast('Summary pinned to clinical notes!', 'success');
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 hover:bg-purple-100 flex items-center space-x-1 shadow-xs"
                    title="Pin this summary to consultation notes"
                  >
                    <Pin className="w-3 h-3" />
                    <span>Pin to Notes</span>
                  </button>
                )}
                {currentPatient && (
                  <button
                    type="button"
                    onClick={() => handleGenerateDocSummary(currentPatient._id, viewingDoc._id, Boolean(viewingDoc.aiSummary))}
                    disabled={docSummaryLoadingId === viewingDoc._id}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center space-x-1 disabled:opacity-50 shadow-xs"
                    title={viewingDoc.aiSummary ? "Regenerate AI summary for this report" : "Generate AI summary for this report"}
                  >
                    {docSummaryLoadingId === viewingDoc._id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    <span>{docSummaryLoadingId === viewingDoc._id ? 'Analyzing...' : viewingDoc.aiSummary ? 'Regenerate' : 'Generate Summary'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Viewer Body */}
            <div className="flex-1 overflow-auto p-4 bg-slate-100 dark:bg-slate-950 flex items-center justify-center min-h-[400px]">
              {Boolean(
                viewingDoc.fileUrl?.toLowerCase().includes('.pdf') ||
                viewingDoc.title?.toLowerCase().endsWith('.pdf') ||
                viewingDoc.reportType === 'pdf'
              ) ? (
                <iframe
                  src={getMediaUrl(viewingDoc.signedViewUrl || viewingDoc.fileUrl)}
                  title={viewingDoc.title}
                  className="w-full h-[65vh] rounded-xl border border-slate-300 dark:border-slate-700 bg-white"
                />
              ) : (
                <div
                  className="transition-transform duration-200 max-w-full max-h-[65vh] flex items-center justify-center"
                  style={{
                    transform: `scale(${zoomLevel}) rotate(${rotation}deg)`
                  }}
                >
                  <img
                    src={getMediaUrl(viewingDoc.signedViewUrl || viewingDoc.fileUrl)}
                    alt={viewingDoc.title}
                    onError={(e) => {
                      if (viewingDoc.fileUrl && e.currentTarget.src !== getMediaUrl(viewingDoc.fileUrl)) {
                        e.currentTarget.src = getMediaUrl(viewingDoc.fileUrl);
                      }
                    }}
                    className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-md border"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs bg-white dark:bg-slate-900">
              <span className="text-[11px] text-slate-400">
                Encrypted signed token access • Access logged to patient audit trail
              </span>
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 font-bold rounded-xl text-slate-700 dark:text-slate-200"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </div>
      )}

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
