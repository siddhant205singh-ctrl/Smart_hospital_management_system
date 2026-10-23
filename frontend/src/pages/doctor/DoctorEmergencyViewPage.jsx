import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';
import {
  ShieldAlert,
  AlertTriangle,
  PhoneCall,
  User,
  Heart,
  Activity,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  Sparkles,
  FileText,
  Pill,
  Send,
  Eye,
  Building2,
  Volume2,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  X,
  ShieldCheck
} from 'lucide-react';

export default function DoctorEmergencyViewPage() {
  const { user } = useAuth();
  const { socket } = useSocket();

  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [loading, setLoading] = useState(true);

  // Break-glass modal & state
  const [showBreakGlassModal, setShowBreakGlassModal] = useState(false);
  const [breakGlassReason, setBreakGlassReason] = useState('unconscious_patient');
  const [clinicalJustification, setClinicalJustification] = useState('Acute trauma/collapse. Immediate access required to inspect drug allergies and active cardiac medications.');
  const [breakGlassLoading, setBreakGlassLoading] = useState(false);
  const [unlockedRecords, setUnlockedRecords] = useState(null);

  // Treatment update form
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentGiven, setTreatmentGiven] = useState('');
  const [newStatus, setNewStatus] = useState('under_treatment');
  const [updating, setUpdating] = useState(false);
  const [audioNotification, setAudioNotification] = useState(false);

  // Key Reports & AI Summary state
  const [emergencyReports, setEmergencyReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [privateReportsNotice, setPrivateReportsNotice] = useState(null);
  const [previewReport, setPreviewReport] = useState(null);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  const fetchEmergencyReports = async (caseId) => {
    if (!caseId) return;
    setReportsLoading(true);
    try {
      const res = await api.get(`/emergency-cases/${caseId}/reports`);
      setEmergencyReports(res.data.reports || []);
      setPrivateReportsNotice(res.data.privateNotice || null);
    } catch (err) {
      console.warn('Reports load error:', err.message);
      setEmergencyReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  const handleGenerateAiSummary = async () => {
    if (!selectedCase?._id) return;
    setAiSummaryLoading(true);
    try {
      const res = await api.post(`/emergency-cases/${selectedCase._id}/reports/summary`);
      setAiSummary(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate AI summary.');
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const fetchCases = async () => {
    try {
      const res = await api.get('/emergency-cases/active');
      const caseList = res.data.cases || [];
      setCases(caseList);
      if (caseList.length > 0 && !selectedCase) {
        setSelectedCase(caseList[0]);
      } else if (selectedCase) {
        // preserve or update selected case
        const updated = caseList.find(c => c._id === selectedCase._id) || caseList[0];
        setSelectedCase(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    if (selectedCase?._id) {
      fetchEmergencyReports(selectedCase._id);
      setAiSummary(null);
    }
  }, [selectedCase?._id]);

  // Real-time socket listener for incoming emergencies
  useEffect(() => {
    if (!socket) return;

    socket.on('emergency:new_case', (data) => {
      setAudioNotification(true);
      fetchCases();
    });

    socket.on('emergency:status_changed', () => {
      fetchCases();
    });

    return () => {
      socket.off('emergency:new_case');
      socket.off('emergency:status_changed');
    };
  }, [socket]);

  const handleActivateBreakGlass = async (e) => {
    e.preventDefault();
    if (!selectedCase) return;

    setBreakGlassLoading(true);
    try {
      const res = await api.post(`/emergency-cases/${selectedCase._id}/break-glass`, {
        reason: breakGlassReason,
        clinicalJustification
      });

      setUnlockedRecords(res.data.unlockedRecords);
      setShowBreakGlassModal(false);
      alert('Emergency Break-Glass Protocol activated. 24-Hour read-only access granted. Patient & emergency contact notified.');
      fetchCases();
      fetchEmergencyReports(selectedCase._id);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to activate break-glass protocol');
    } finally {
      setBreakGlassLoading(false);
    }
  };

  const handleUpdateTreatment = async (e) => {
    e.preventDefault();
    if (!selectedCase) return;

    setUpdating(true);
    try {
      await api.put(`/emergency-cases/${selectedCase._id}/status`, {
        status: newStatus,
        clinicalDiagnosis: diagnosis,
        treatmentGiven
      });

      alert(`Emergency case updated to ${newStatus}. Progress logged to patient Health Timeline.`);
      setDiagnosis('');
      setTreatmentGiven('');
      fetchCases();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update treatment');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Loading Clinical Emergency Desk...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Real-time Alarm Banner */}
      {audioNotification && (
        <div className="p-4 bg-rose-600 text-white rounded-3xl flex items-center justify-between shadow-2xl animate-bounce">
          <div className="flex items-center space-x-3">
            <Volume2 className="w-6 h-6 animate-pulse" />
            <div>
              <strong className="block text-sm font-black">CRITICAL EMERGENCY CASE DISPATCHED!</strong>
              <span className="text-xs">A new high-priority patient triage has arrived in the Emergency Department.</span>
            </div>
          </div>
          <button
            onClick={() => setAudioNotification(false)}
            className="px-4 py-1.5 bg-white text-rose-700 rounded-xl text-xs font-bold shadow-md"
          >
            Acknowledge ✕
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 border-2 border-rose-500/60 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 radar-live"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
              Emergency Department Resuscitation & Triage
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black mt-1">
            Clinical Emergency & Break-Glass Console
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time ER queue prioritized strictly by clinical severity. Authorized physicians may break-glass to inspect life-saving medical history.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="px-3 py-1.5 bg-rose-950 text-rose-300 rounded-xl font-bold border border-rose-800">
            {cases.filter(c => c.triagePriority === 'P1_CRITICAL_RESUSCITATION').length} Critical P1 Cases
          </span>
          <span className="px-3 py-1.5 bg-slate-800 text-slate-200 rounded-xl font-bold border border-slate-700">
            Total In ER: {cases.length}
          </span>
        </div>
      </div>

      {/* Main Grid: Queue on Left, Active Patient Workspace on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: ER Triage Queue List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between">
              <span>Incoming ER Triage Queue</span>
              <span className="text-xs text-rose-600 font-bold">{cases.length} Waiting</span>
            </h3>

            {cases.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No active emergency cases in ER.</p>
            ) : (
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {cases.map((c) => {
                  const isSelected = selectedCase?._id === c._id;
                  const isP1 = c.triagePriority === 'P1_CRITICAL_RESUSCITATION';

                  return (
                    <div
                      key={c._id}
                      onClick={() => {
                        setSelectedCase(c);
                        setUnlockedRecords(null);
                        setNewStatus(c.status);
                      }}
                      className={`p-3.5 rounded-2xl border cursor-pointer transition text-xs space-y-1.5 ${
                        isSelected
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 shadow-md ring-2 ring-rose-500/30'
                          : isP1
                          ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-black text-slate-900 dark:text-white">
                          #{c.caseNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            isP1
                              ? 'bg-rose-600 text-white animate-pulse'
                              : c.triagePriority === 'P2_EMERGENT'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {c.triagePriority.split('_')[0]}
                        </span>
                      </div>

                      <div className="font-bold text-sm text-slate-800 dark:text-slate-100">
                        {c.patientId?.name || 'Emergency Patient'}
                      </div>

                      <div className="text-[11px] text-rose-700 dark:text-rose-300 font-semibold capitalize">
                        {c.chiefComplaint?.replace(/_/g, ' ')} (Pain: {c.severityScore}/10)
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                        <span>Onset: {c.symptomOnset}</span>
                        <span className="font-bold capitalize">{c.status?.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Selected Case Clinical Workspace */}
        <div className="lg:col-span-8 space-y-6">
          {selectedCase ? (
            <div className="space-y-6">
              {/* Patient Triage Banner */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-rose-300 dark:border-rose-900 shadow-lg space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 gap-2">
                  <div>
                    <span className="text-xs font-mono font-bold text-rose-600">
                      CASE #{selectedCase.caseNumber} • {selectedCase.triagePriority?.replace(/_/g, ' ')}
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                      {selectedCase.patientId?.name}
                    </h2>
                  </div>

                  <span
                    className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                      selectedCase.triagePriority === 'P1_CRITICAL_RESUSCITATION'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    Pain: {selectedCase.severityScore} / 10
                  </span>
                </div>

                {/* Key Vitals & Contact Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border">
                    <span className="text-slate-400 block font-semibold">Chief Symptom:</span>
                    <strong className="text-sm font-bold capitalize text-rose-600">
                      {selectedCase.chiefComplaint?.replace(/_/g, ' ')}
                    </strong>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Onset: {selectedCase.symptomOnset}</span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border">
                    <span className="text-slate-400 block font-semibold">Blood Group & Donor:</span>
                    <strong className="text-sm font-bold text-slate-900 dark:text-white">
                      {selectedCase.prefilledHealthSnapshot?.bloodGroup || selectedCase.patientId?.patientHealth?.bloodGroup || 'O+'}
                    </strong>
                    <span className="text-[10px] text-teal-600 block mt-0.5">
                      {selectedCase.patientId?.donorSettings?.willingToDonate ? 'Registered LifeShare Donor' : 'Standard Patient'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border">
                    <span className="text-slate-400 block font-semibold">Primary Emergency Contact:</span>
                    <strong className="text-xs font-bold text-slate-900 dark:text-white block">
                      {selectedCase.patientId?.emergencyContact?.name || selectedCase.submittedBy?.name || 'Family Contact'}
                    </strong>
                    <a
                      href={`tel:${selectedCase.patientId?.emergencyContact?.phone || selectedCase.patientId?.phone || '112'}`}
                      className="text-[11px] text-rose-600 font-bold hover:underline flex items-center space-x-1 mt-0.5"
                    >
                      <PhoneCall className="w-3 h-3" />
                      <span>{selectedCase.patientId?.emergencyContact?.phone || selectedCase.patientId?.phone || 'Call Contact'}</span>
                    </a>
                  </div>
                </div>

                {selectedCase.complaintDescription && (
                  <div className="p-3 bg-rose-50/70 dark:bg-rose-950/30 rounded-2xl border border-rose-200 text-xs">
                    <strong className="text-rose-900 dark:text-rose-200 block mb-0.5">Triage Observations:</strong>
                    <p className="text-slate-700 dark:text-slate-300">{selectedCase.complaintDescription}</p>
                  </div>
                )}

                {/* Pre-filled Health Snapshot (Allergies Highlighted) */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <span>Prefilled Critical Medical Snapshot (From Profile):</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-950 dark:text-rose-200">
                      <span className="font-bold block text-[11px]">Known Drug Allergies:</span>
                      <span className="font-semibold text-xs text-rose-700 dark:text-rose-300">
                        {selectedCase.prefilledHealthSnapshot?.allergies?.length > 0
                          ? selectedCase.prefilledHealthSnapshot.allergies.join(', ')
                          : 'None Reported'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border">
                      <span className="font-bold block text-[11px] text-slate-500">Existing Conditions:</span>
                      <span className="font-semibold text-xs">
                        {selectedCase.prefilledHealthSnapshot?.existingConditions?.length > 0
                          ? selectedCase.prefilledHealthSnapshot.existingConditions.join(', ')
                          : 'None Reported'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border">
                      <span className="font-bold block text-[11px] text-slate-500">Active Medications:</span>
                      <span className="font-semibold text-xs truncate block">
                        {selectedCase.prefilledHealthSnapshot?.currentMedicines?.length > 0
                          ? selectedCase.prefilledHealthSnapshot.currentMedicines.join(', ')
                          : 'None Reported'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Key Reports Panel (Emergency-Ready Diagnostic Reports) */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                        <FileText className="w-4 h-4 text-rose-500" />
                        <span>Key Reports & Diagnostics (Emergency-Ready)</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Emergency-tagged documents and recent diagnostic tests uploaded by the patient.
                      </p>
                    </div>

                    {emergencyReports.length > 0 && (
                      <button
                        type="button"
                        onClick={handleGenerateAiSummary}
                        disabled={aiSummaryLoading}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center space-x-1.5 self-start sm:self-auto"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{aiSummaryLoading ? 'Synthesizing Reports...' : 'Quick Report Summary (AI)'}</span>
                      </button>
                    )}
                  </div>

                  {/* Private Reports Note Banner */}
                  {privateReportsNotice && (
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center space-x-2">
                      <Lock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span>{privateReportsNotice}</span>
                    </div>
                  )}

                  {/* AI Clinical Summary Card */}
                  {aiSummary && aiSummary.summary && (
                    <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-black text-teal-800 dark:text-teal-200 flex items-center space-x-1.5">
                          <Sparkles className="w-4 h-4 text-teal-600" />
                          <span>AI Clinical Report Summary</span>
                        </span>
                        <span className="text-[10px] bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300 font-bold px-2 py-0.5 rounded-full">
                          AI-generated for clinical review
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <strong className="block text-[11px] text-teal-950 dark:text-teal-100">Key Clinical Findings:</strong>
                          <ul className="list-disc pl-4 space-y-0.5 text-slate-700 dark:text-slate-300">
                            {aiSummary.summary.keyFindings?.map((f, i) => (
                              <li key={i}>{f}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-1">
                          <strong className="block text-[11px] text-rose-700 dark:text-rose-300">Abnormal Values / Risks:</strong>
                          <ul className="list-disc pl-4 space-y-0.5 text-slate-700 dark:text-slate-300">
                            {aiSummary.summary.abnormalValues?.map((v, i) => (
                              <li key={i}>{v}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-1">
                          <strong className="block text-[11px] text-slate-700 dark:text-slate-300">Noted Conditions & Allergies:</strong>
                          <p className="text-slate-600 dark:text-slate-400">
                            Conditions: {aiSummary.summary.notedConditions?.join(', ') || 'None noted'} <br />
                            Allergies: {aiSummary.summary.allergies?.join(', ') || 'No drug allergies documented'}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <strong className="block text-[11px] text-slate-700 dark:text-slate-300">Active Prescriptions:</strong>
                          <p className="text-slate-600 dark:text-slate-400">
                            {aiSummary.summary.activeMedications?.join(', ') || 'None documented in shared reports'}
                          </p>
                        </div>
                      </div>

                      {/* Source Citations */}
                      {aiSummary.summary.sourceCitations?.length > 0 && (
                        <div className="pt-2 border-t border-teal-200/60 dark:border-teal-800/60 text-[10px] text-slate-500">
                          <strong className="text-teal-700 dark:text-teal-300 font-semibold">Report Citations: </strong>
                          {aiSummary.summary.sourceCitations.map((c, i) => (
                            <span key={i} className="inline-block bg-white dark:bg-slate-800 px-2 py-0.5 rounded mr-1.5 mt-1 border">
                              {c.finding ? `${c.finding} (${c.reportTitle})` : c.reportTitle}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-[10px] text-slate-400 italic">
                        * {aiSummary.disclaimer || 'AI-generated summary for clinical review, never a definitive diagnosis. Cross-verify with source reports.'}
                      </p>
                    </div>
                  )}

                  {/* Reports List */}
                  {reportsLoading ? (
                    <div className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse"></div>
                  ) : emergencyReports.length === 0 ? (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border text-center text-xs text-slate-500">
                      No emergency-shared reports uploaded for this patient.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {emergencyReports.map(rep => (
                        <div
                          key={rep._id}
                          className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border hover:border-teal-500 transition space-y-2 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-[10px] font-bold uppercase">
                                {rep.reportType?.replace('_', ' ')}
                              </span>
                              {rep.isEmergencyImportant && (
                                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-bold flex items-center space-x-1">
                                  <span>🚨</span>
                                  <span>Critical</span>
                                </span>
                              )}
                            </div>
                            <strong className="text-xs font-bold text-slate-900 dark:text-white block line-clamp-1">
                              {rep.title}
                            </strong>
                            <span className="text-[10px] text-slate-500 block">
                              {rep.issuingFacility} • {new Date(rep.reportDate).toLocaleDateString()}
                            </span>
                            {rep.notes && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 italic line-clamp-1">
                                "{rep.notes}"
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400">
                              {(rep.fileSizeBytes / 1024).toFixed(0)} KB • {rep.fileMimeType?.split('/')[1]?.toUpperCase()}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setPreviewReport(rep);
                                setPreviewZoom(1);
                              }}
                              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg text-[11px] flex items-center space-x-1"
                            >
                              <Eye className="w-3 h-3" />
                              <span>View Report</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Break-Glass Authorization Protocol Section */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                      <Lock className="w-4 h-4 text-amber-500" />
                      <span>Break-Glass Medical Record Access Protocol</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Under statutory privacy governance, accessing historical records without patient consent requires clinical justification.
                    </p>
                  </div>

                  {selectedCase.breakGlassUsed || unlockedRecords ? (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-1">
                      <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Break-Glass Active (24h)</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => setShowBreakGlassModal(true)}
                      className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 flex-shrink-0"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>Activate Break-Glass</span>
                    </button>
                  )}
                </div>

                {/* Unlocked Records View */}
                {unlockedRecords && (
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 text-xs text-emerald-900 dark:text-emerald-200">
                      ✓ Emergency Break-Glass authorized. Patient and primary emergency contact notified via SMS. Cryptographically timestamped in access audit trail.
                    </div>

                    <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                      Historical Records (Last 20 Consultations & Reports):
                    </h4>

                    <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
                      {unlockedRecords.healthRecords?.map(rec => (
                        <div key={rec._id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border space-y-1">
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-teal-700 dark:text-teal-300">{rec.title}</span>
                            <span className="text-[10px] text-slate-400">{new Date(rec.date).toLocaleDateString()}</span>
                          </div>
                          {rec.aiSummary && <p className="text-[11px] text-slate-600 dark:text-slate-300">{rec.aiSummary}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Treatment Administration & Status Progression Form */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-teal-600" />
                  <span>Clinical Interventions & Status Update</span>
                </h3>

                <form onSubmit={handleUpdateTreatment} className="space-y-3.5 text-xs">
                  <div>
                    <label className="font-semibold block mb-1">Emergency Triage Progression Status</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['under_treatment', 'stabilized', 'admitted', 'discharged'].map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setNewStatus(st)}
                          className={`py-2 px-3 rounded-xl font-bold uppercase text-[11px] border transition ${
                            newStatus === st
                              ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {st.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Clinical Diagnosis / Acute Findings</label>
                    <textarea
                      rows={2}
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      placeholder="e.g. Acute inferior wall STEMI, BP 90/60, responsive to IV nitrates..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Emergency Resuscitation & Treatment Administered</label>
                    <textarea
                      rows={2}
                      value={treatmentGiven}
                      onChange={(e) => setTreatmentGiven(e.target.value)}
                      placeholder="e.g. IV Oxygen 4L/min, Aspirin 325mg chewed, Clopidogrel 300mg, Cath lab mobilized..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={updating}
                    className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{updating ? 'Updating Case & Timeline...' : 'Log Clinical Interventions & Sync Health Timeline'}</span>
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border text-slate-400 space-y-2">
              <Activity className="w-12 h-12 mx-auto text-slate-300" />
              <h3 className="font-bold text-base text-slate-700 dark:text-slate-300">Select an emergency case</h3>
              <p className="text-xs">Choose any triage case from the ER queue on the left to begin clinical treatment.</p>
            </div>
          )}
        </div>
      </div>

      {/* Break-Glass Modal */}
      {showBreakGlassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl border-2 border-amber-500 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Emergency Break-Glass Authorization</h3>
              </div>
              <button onClick={() => setShowBreakGlassModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleActivateBreakGlass} className="space-y-4 text-xs mt-4">
              <div>
                <label className="font-semibold block mb-1">Clinical Emergency Reason</label>
                <select
                  value={breakGlassReason}
                  onChange={(e) => setBreakGlassReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-slate-50 dark:bg-slate-800 font-bold"
                >
                  <option value="unconscious_patient">Unconscious / Comatose Patient</option>
                  <option value="acute_cardiac_arrest">Acute Cardiac Arrest / Resuscitation</option>
                  <option value="severe_trauma">Severe Multi-Trauma / Shock</option>
                  <option value="critical_pediatric_emergency">Critical Pediatric Emergency</option>
                  <option value="missing_patient_consent">Life-Threatening Emergency (Consent unavailable)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold block mb-1">Physician Justification (Audit Logged)</label>
                <textarea
                  rows={3}
                  required
                  value={clinicalJustification}
                  onChange={(e) => setClinicalJustification(e.target.value)}
                  className="w-full p-2.5 rounded-xl border bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 text-amber-900 dark:text-amber-200 text-[11px] leading-tight">
                ⚠️ <strong>Audit Warning:</strong> Every Break-Glass activation is cryptographically logged under your physician ID and hospital license. Misuse is reviewed by Hospital Clinical Governance.
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  disabled={breakGlassLoading}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-md"
                >
                  {breakGlassLoading ? 'Verifying...' : 'Authorize Emergency Access'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBreakGlassModal(false)}
                  className="px-4 py-3 border rounded-xl font-semibold text-slate-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Report Preview Modal */}
      {previewReport && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center">
          <div className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center space-x-2">
                  <span>{previewReport.title}</span>
                  {previewReport.isEmergencyImportant && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                      Emergency Priority
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  {previewReport.issuingFacility} • {new Date(previewReport.reportDate).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setPreviewZoom(z => Math.max(0.6, z - 0.2))}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewZoom(z => Math.min(2.5, z + 0.2))}
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <a
                  href={previewReport.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-teal-600"
                  title="Open in new window"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewReport(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-slate-100 dark:bg-slate-950/60 min-h-[350px]">
              {previewReport.fileMimeType?.includes('pdf') ? (
                <iframe
                  src={previewReport.fileUrl}
                  title={previewReport.title}
                  className="w-full h-[65vh] rounded-2xl border border-slate-200 dark:border-slate-800 shadow"
                />
              ) : (
                <div className="overflow-auto max-h-[70vh] flex items-center justify-center">
                  <img
                    src={previewReport.fileUrl}
                    alt={previewReport.title}
                    style={{ transform: `scale(${previewZoom})`, transformOrigin: 'center center' }}
                    className="max-w-full max-h-[65vh] object-contain rounded-xl shadow-lg transition-transform duration-200"
                  />
                </div>
              )}
            </div>

            {previewReport.notes && (
              <div className="p-3.5 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs">
                <span className="font-bold text-slate-700 dark:text-slate-300">Notes from Report: </span>
                <span className="text-slate-500">{previewReport.notes}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
