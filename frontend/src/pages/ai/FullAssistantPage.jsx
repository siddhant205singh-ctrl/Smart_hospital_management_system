import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeA11y } from '../../contexts/ThemeA11yContext';
import api from '../../services/api';
import {
  Bot,
  User,
  Sparkles,
  Send,
  AlertTriangle,
  PhoneCall,
  Clock,
  Calendar,
  Droplet,
  ShieldCheck,
  Stethoscope,
  HeartPulse,
  Pill,
  Activity,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function FullAssistantPage() {
  const { user } = useAuth();
  const { currentLanguage } = useThemeA11y();
  const navigate = useNavigate();
  const [patientContext, setPatientContext] = useState(null);
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: "Welcome to **SmartCare Clinical Concierge**!\n\nI analyze your **longitudinal medical history, documented allergies, chronic conditions, and current symptoms** to provide personalized clinical triage and doctor recommendations.\n\n*Notice: I provide health triage and navigation, not a definitive medical diagnosis.*",
      isEmergency: false
    }
  ]);
  const [input, setInput] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [quickChips, setQuickChips] = useState([
    'Shortness of breath / Wheezing',
    'High Blood Pressure check',
    'Headache & Dizziness',
    'Persistent dry cough',
    'Review my active medications',
    'Check Live Queue Status'
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (user) {
      api.get('/ai/patient-context')
        .then(res => {
          if (res.data?.success) {
            setPatientContext(res.data.patient);
            if (res.data.suggestedSymptomChips?.length > 0) {
              setQuickChips(res.data.suggestedSymptomChips);
            }
          }
        })
        .catch(err => console.log('Patient context fetch:', err.message));
    }
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const toggleSymptomSelection = (symptom) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
  };

  const sendMessage = async (textToSend, customSymptoms = null) => {
    const symptomsToSend = customSymptoms || selectedSymptoms;
    const query = (textToSend || input).trim();

    if (!query && symptomsToSend.length === 0) return;

    const displayMsg = query || `Reporting symptoms: ${symptomsToSend.join(', ')}`;
    setMessages(prev => [...prev, { sender: 'user', text: displayMsg, isEmergency: false }]);
    setInput('');
    setSelectedSymptoms([]);
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        message: query || `Current symptoms: ${symptomsToSend.join(', ')}`,
        currentSymptoms: symptomsToSend,
        language: currentLanguage
      });

      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: res.data.reply,
          isEmergency: res.data.isEmergency,
          allergyAlerts: res.data.allergyAlerts || [],
          conditionInsights: res.data.conditionInsights || [],
          recommendedDoctors: res.data.recommendedDoctors || [],
          recommendedSpecialty: res.data.recommendedSpecialty || null,
          toolResult: res.data.toolResult
        }
      ]);

      if (res.data.quickChips) {
        setQuickChips(res.data.quickChips);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: "I am unable to connect to the healthcare AI proxy. Please check backend connection.",
          isEmergency: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const symptomPills = [
    'Shortness of breath / Wheezing',
    'Persistent dry cough',
    'High Blood Pressure check',
    'Headache & Dizziness',
    'Chest tightness',
    'Joint / Knee pain'
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 h-[calc(100vh-6.5rem)] flex flex-col">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-md">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>SmartCare Clinical Concierge</span>
              <span className="text-[10px] bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 px-2 py-0.5 rounded-full font-bold">
                Customized AI Doctor
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Personalized symptom triage cross-referencing your medical history, allergies & active prescriptions
            </p>
          </div>
        </div>

        {user && patientContext && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700">
            <span className="font-bold text-slate-800 dark:text-slate-100">
              {patientContext.name} {patientContext.age ? `(${patientContext.age}y)` : ''}
            </span>
            <span className="px-2 py-0.5 bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 font-mono rounded-lg font-bold text-[11px]">
              {patientContext.bloodGroup}
            </span>
            {patientContext.allergies?.length > 0 && (
              <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 rounded-lg text-[11px] font-semibold">
                Allergic: {patientContext.allergies.join(', ')}
              </span>
            )}
            {patientContext.conditions?.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 rounded-lg text-[11px] font-semibold">
                {patientContext.conditions.join(', ')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Messages Stream */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start space-x-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-4 text-xs ${
                m.sender === 'user'
                  ? 'bg-teal-600 text-white rounded-tr-none shadow-sm'
                  : m.isEmergency
                  ? 'bg-rose-50 dark:bg-rose-950/70 border-2 border-rose-500 text-rose-950 dark:text-rose-100 rounded-tl-none shadow-md'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700 shadow-sm'
              }`}
            >
              {m.isEmergency && (
                <div className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400 font-bold mb-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600 animate-bounce" />
                  <span>EMERGENCY CLINICAL RED ALERT</span>
                </div>
              )}

              {/* Allergy Alert Card */}
              {m.allergyAlerts?.length > 0 && (
                <div className="mb-2.5 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs space-y-1 font-semibold">
                  {m.allergyAlerts.map((alert, aIdx) => (
                    <div key={aIdx}>{alert}</div>
                  ))}
                </div>
              )}

              {/* Pre-existing Condition Insights */}
              {m.conditionInsights?.length > 0 && (
                <div className="mb-2.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                  {m.conditionInsights.map((insight, cIdx) => (
                    <div key={cIdx}>{insight}</div>
                  ))}
                </div>
              )}

              <div className="whitespace-pre-line leading-relaxed text-xs sm:text-[13px]">
                {m.text}
              </div>

              {/* Recommended Specialists Card */}
              {m.recommendedDoctors?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 block">
                    Recommended Available Network Specialists:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {m.recommendedDoctors.map((doc, dIdx) => (
                      <div
                        key={dIdx}
                        className="p-3 rounded-2xl bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex items-center justify-between shadow-sm"
                      >
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white block text-xs">
                            {doc.name}
                          </span>
                          <span className="text-slate-500 text-[11px]">
                            {doc.specialty} • Room {doc.roomNumber}
                          </span>
                          <span className="text-teal-600 dark:text-teal-400 font-bold text-[10px] block mt-0.5">
                            Fee: ₹{doc.consultationFee}
                          </span>
                        </div>
                        <button
                          onClick={() => navigate('/doctors')}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs transition"
                        >
                          Book Slot
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {m.isEmergency && (
                <a
                  href="tel:108"
                  className="mt-3 inline-flex items-center space-x-2 px-4 py-2 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition shadow-md shadow-rose-600/30"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Call 108 Emergency Ambulance Helpline</span>
                </a>
              )}
            </div>

            {m.sender === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-xs text-slate-400 p-2">
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce"></div>
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce delay-100"></div>
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce delay-200"></div>
            <span>Evaluating clinical dossier & correlating records...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Symptoms Multi-Select Bar */}
      <div className="px-4 py-2 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl my-2">
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 mb-1">
          <span className="font-semibold flex items-center space-x-1.5">
            <HeartPulse className="w-3.5 h-3.5 text-teal-600" />
            <span>Select Current Symptoms to Cross-Reference:</span>
          </span>
          {selectedSymptoms.length > 0 && (
            <button
              onClick={() => sendMessage(null, selectedSymptoms)}
              className="font-bold text-teal-600 hover:text-teal-700 underline text-xs"
            >
              Send Selected ({selectedSymptoms.length}) →
            </button>
          )}
        </div>
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
          {symptomPills.map((symptom, idx) => {
            const isSelected = selectedSymptoms.includes(symptom);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => toggleSymptomSelection(symptom)}
                className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium transition border ${
                  isSelected
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:border-teal-400'
                }`}
              >
                {isSelected ? '✓ ' : '+ '}
                {symptom}
              </button>
            );
          })}
        </div>
      </div>

      {/* Suggested Quick Chips */}
      <div className="py-1.5 flex items-center space-x-2 overflow-x-auto text-xs no-scrollbar">
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => sendMessage(chip)}
            className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-700 font-medium transition"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-2 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
          placeholder="Ask a question, describe current symptoms, or ask about queue tokens..."
          className="flex-1 px-4 py-2.5 text-xs bg-transparent border-none text-slate-900 dark:text-slate-100 focus:outline-none"
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || (!input.trim() && selectedSymptoms.length === 0)}
          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
