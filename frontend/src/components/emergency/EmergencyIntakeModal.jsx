import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  AlertTriangle,
  PhoneCall,
  X,
  Activity,
  Heart,
  ShieldAlert,
  Clock,
  UserCheck,
  CheckCircle2
} from 'lucide-react';

const RED_FLAGS = [
  { id: 'chest_pain', label: 'Chest Pain / Pressure', icon: '💔', priority: 'P1' },
  { id: 'breathing_difficulty', label: 'Severe Breathing Trouble', icon: '🫁', priority: 'P1' },
  { id: 'severe_bleeding', label: 'Severe Uncontrolled Bleeding', icon: '🩸', priority: 'P1' },
  { id: 'stroke_signs', label: 'Stroke (Face droop, Speech)', icon: '🧠', priority: 'P1' },
  { id: 'accident_injury', label: 'Accident / Severe Fracture', icon: '🚑', priority: 'P2' },
  { id: 'high_fever_seizures', label: 'High Fever / Seizures', icon: '🔥', priority: 'P2' },
  { id: 'other', label: 'Other Acute Emergency', icon: '⚠️', priority: 'P3' }
];

export default function EmergencyIntakeModal({ isOpen, onClose, onCaseSubmitted }) {
  const { user } = useAuth();

  const [chiefComplaint, setChiefComplaint] = useState('chest_pain');
  const [severityScore, setSeverityScore] = useState(8);
  const [symptomOnset, setSymptomOnset] = useState('< 30 minutes');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [isBystander, setIsBystander] = useState(false);
  const [submittedByName, setSubmittedByName] = useState('');
  const [relationship, setRelationship] = useState('self');
  const [preferredHospitalId, setPreferredHospitalId] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submittedCase, setSubmittedCase] = useState(null);

  useEffect(() => {
    if (isOpen) {
      api.get('/hospitals')
        .then(res => {
          setHospitals(res.data.hospitals || []);
          if (res.data.hospitals?.length > 0) {
            setPreferredHospitalId(res.data.hospitals[0]._id);
          }
        })
        .catch(err => console.error(err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/emergency-cases', {
        chiefComplaint,
        severityScore,
        symptomOnset,
        complaintDescription,
        preferredHospitalId,
        submittedByName: isBystander ? submittedByName : user?.name,
        relationship: isBystander ? relationship : 'self',
        isBystander
      });

      setSubmittedCase(res.data.emergencyCase);
      if (onCaseSubmitted) onCaseSubmitted(res.data.emergencyCase);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit emergency intake');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border-2 border-rose-500 animate-in fade-in zoom-in-95 my-auto">
        {/* Urgent Direct Call Strip */}
        <div className="mb-4 p-3 bg-rose-600 text-white rounded-2xl flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-2.5">
            <ShieldAlert className="w-6 h-6 animate-pulse" />
            <div>
              <strong className="block text-xs uppercase tracking-wider">Life-Threatening Emergency?</strong>
              <span className="text-[11px] text-rose-100">National Ambulance: 112 / 108</span>
            </div>
          </div>
          <a
            href="tel:112"
            className="px-3.5 py-1.5 bg-white text-rose-700 font-black rounded-xl text-xs hover:bg-rose-50 shadow-md transition flex items-center space-x-1"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call 112 Now</span>
          </a>
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="font-black text-lg text-slate-900 dark:text-white flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 radar-live"></span>
              <span>Emergency Intake & Triage Gateway</span>
            </h3>
            <p className="text-xs text-slate-500">
              Immediate clinical response dispatch. Clinical triage priority is determined strictly by severity.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submittedCase ? (
          <div className="my-6 space-y-4 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-lg">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-teal-600 block">
                CASE NUMBER: {submittedCase.caseNumber}
              </span>
              <h4 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                Emergency Case Active ({submittedCase.triagePriority.replace('_', ' ')})
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Emergency staff and on-duty doctors at <strong>{submittedCase.hospitalId?.name}</strong> have received your live triage dispatch.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-xs text-left space-y-1.5 border">
              <div className="flex justify-between">
                <span className="text-slate-400">Chief Symptom:</span>
                <span className="font-bold capitalize">{submittedCase.chiefComplaint.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Severity Rating:</span>
                <span className="font-bold text-rose-600">{submittedCase.severityScore} / 10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Triage Assignment:</span>
                <span className="font-bold text-teal-600">{submittedCase.triagePriority}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md transition"
            >
              Close & View Emergency Status
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs mt-4">
            {/* Bystander Toggle */}
            <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800 rounded-2xl border">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Are you submitting on behalf of a family member or as a bystander?
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBystander}
                  onChange={(e) => setIsBystander(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
              </label>
            </div>

            {isBystander && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200">
                <div>
                  <label className="font-semibold block mb-1">Your Name</label>
                  <input
                    type="text"
                    required
                    value={submittedByName}
                    onChange={(e) => setSubmittedByName(e.target.value)}
                    placeholder="Submitting Person Name"
                    className="w-full px-3 py-1.5 rounded-xl border bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Relationship to Patient</label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border bg-white dark:bg-slate-800"
                  >
                    <option value="spouse">Spouse</option>
                    <option value="parent">Parent</option>
                    <option value="child">Child</option>
                    <option value="sibling">Sibling</option>
                    <option value="bystander">Good Samaritan / Bystander</option>
                  </select>
                </div>
              </div>
            )}

            {/* Quick Symptom Chips */}
            <div>
              <label className="font-bold block mb-1.5 text-slate-800 dark:text-slate-200">
                Select Main Life-Threatening Symptom (Red-Flag Priority):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {RED_FLAGS.map((rf) => (
                  <button
                    key={rf.id}
                    type="button"
                    onClick={() => setChiefComplaint(rf.id)}
                    className={`p-2.5 rounded-2xl border text-left transition flex items-start space-x-2 ${
                      chiefComplaint === rf.id
                        ? 'bg-rose-50 dark:bg-rose-950 border-rose-500 text-rose-900 dark:text-rose-100 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-base">{rf.icon}</span>
                    <span className="text-[11px] font-bold leading-tight">{rf.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Rating Slider & Onset */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-800 dark:text-slate-200">Pain / Severity Score (1-10):</label>
                  <span className="font-black text-rose-600 text-sm">{severityScore} / 10</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={severityScore}
                  onChange={(e) => setSeverityScore(Number(e.target.value))}
                  className="w-full accent-rose-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5 font-semibold">
                  <span>Mild (1-4)</span>
                  <span>Emergent (5-7)</span>
                  <span className="text-rose-600 font-bold">Critical (8-10)</span>
                </div>
              </div>

              <div>
                <label className="font-bold block mb-1 text-slate-800 dark:text-slate-200">When did symptoms start?</label>
                <select
                  value={symptomOnset}
                  onChange={(e) => setSymptomOnset(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                >
                  <option value="< 30 minutes">Just started (&lt; 30 minutes)</option>
                  <option value="1-2 hours">1 to 2 hours ago</option>
                  <option value="3-6 hours">3 to 6 hours ago</option>
                  <option value="Gradual worsening">Gradually worsening over days</option>
                </select>
              </div>
            </div>

            {/* Hospital Destination */}
            <div>
              <label className="font-bold block mb-1 text-slate-800 dark:text-slate-200">Nearest Connected Hospital ER:</label>
              <select
                value={preferredHospitalId}
                onChange={(e) => setPreferredHospitalId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold text-teal-700 dark:text-teal-300"
              >
                {hospitals.map(h => (
                  <option key={h._id} value={h._id}>
                    {h.name} ({h.city}) — Emergency Desk: {h.emergencyContact || '112'}
                  </option>
                ))}
              </select>
            </div>

            {/* Brief notes */}
            <div>
              <label className="font-semibold block mb-1">Additional Observations / Unconsciousness (Optional):</label>
              <textarea
                rows={2}
                value={complaintDescription}
                onChange={(e) => setComplaintDescription(e.target.value)}
                placeholder="e.g. Collapsed suddenly, sweating profusely, left arm radiating pain..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500">
              ⚡ Health Profile Snapshot (Allergies, chronic conditions, current medications) will be auto-attached for the emergency physician.
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs shadow-xl transition flex items-center justify-center space-x-2"
              >
                <Activity className="w-4 h-4" />
                <span>{loading ? 'Transmitting Triage...' : 'Transmit Emergency Triage to ER'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 border rounded-xl font-semibold text-slate-500"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
