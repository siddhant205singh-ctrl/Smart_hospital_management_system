import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeA11y } from '../../contexts/ThemeA11yContext';
import api from '../../services/api';
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  AlertTriangle,
  Bot,
  User,
  Maximize2,
  Calendar,
  Clock,
  Droplet,
  PhoneCall,
  ShieldAlert,
  Stethoscope,
  Pill,
  HeartPulse,
  Activity,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function SmartCareChatWidget() {
  const { user } = useAuth();
  const { currentLanguage } = useThemeA11y();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [patientContext, setPatientContext] = useState(null);
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: "Hello! I am your **SmartCare Clinical Assistant**.\n\nI provide **personalized answers** based on your **past medical records, known allergies, chronic conditions, and current symptoms**.\n\n*Notice: I provide clinical navigation and guidance, not a definitive diagnosis.*",
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
    'Review my active medications',
    'Check Live Queue Status',
    'Blood Availability'
  ]);

  const messagesEndRef = useRef(null);

  // Fetch patient profile context when widget opens and user is logged in
  useEffect(() => {
    if (user && isOpen) {
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
  }, [user, isOpen]);

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
    const userMsg = { sender: 'user', text: displayMsg, isEmergency: false };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSelectedSymptoms([]);
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        message: query || `Current symptoms: ${symptomsToSend.join(', ')}`,
        currentSymptoms: symptomsToSend,
        language: currentLanguage
      });

      const botMsg = {
        sender: 'assistant',
        text: res.data.reply,
        isEmergency: res.data.isEmergency,
        allergyAlerts: res.data.allergyAlerts || [],
        conditionInsights: res.data.conditionInsights || [],
        recommendedDoctors: res.data.recommendedDoctors || [],
        recommendedSpecialty: res.data.recommendedSpecialty || null,
        toolResult: res.data.toolResult
      };

      setMessages(prev => [...prev, botMsg]);
      if (res.data.quickChips) {
        setQuickChips(res.data.quickChips);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: "I am having trouble connecting to the healthcare engine. Please ensure the backend server is running.",
          isEmergency: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const symptomPills = [
    'Shortness of breath / Wheezing',
    'Persistent dry cough',
    'Headache & Dizziness',
    'High Blood Pressure check',
    'Chest tightness',
    'Joint / Knee pain'
  ];

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center space-x-2 px-3.5 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-teal-600 via-teal-700 to-cyan-600 text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-white/30"
          title="Open Personalized Medical Assistant"
        >
          <div className="relative">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white"></span>
          </div>
          <span className="text-xs font-bold tracking-wide">SmartCare AI</span>
          <span className="hidden sm:inline text-[10px] text-teal-100 bg-white/20 px-2 py-0.5 rounded-full font-medium">
            Personalized Clinical Bot
          </span>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="w-[calc(100vw-24px)] sm:w-[440px] h-[78vh] sm:h-[600px] max-h-[660px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-teal-700 via-teal-800 to-cyan-800 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shadow-inner">
                <Bot className="w-5 h-5 text-teal-100" />
              </div>
              <div>
                <h3 className="font-bold text-xs flex items-center space-x-1.5">
                  <span>SmartCare Clinical Assistant</span>
                  <span className="text-[9px] bg-amber-400/30 text-amber-200 px-1.5 py-0.2 rounded font-semibold border border-amber-400/40">
                    Customized for Patient
                  </span>
                </h3>
                <p className="text-[10px] text-teal-100">
                  Past Records + Current Symptoms Cross-Analysis
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <Link
                to="/ai-assistant"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-teal-100 hover:text-white transition"
                title="Full Page Mode"
              >
                <Maximize2 className="w-4 h-4" />
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/20 text-teal-100 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Patient Dossier Banner */}
          {user && (
            <div className="px-3.5 py-2 bg-teal-50/90 dark:bg-teal-950/60 border-b border-teal-200/70 dark:border-teal-900/60 text-[11px] text-teal-900 dark:text-teal-200 flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex items-center space-x-1.5">
                <span className="font-bold flex items-center space-x-1">
                  <span>👤 {user.name}</span>
                  {patientContext?.bloodGroup && (
                    <span className="px-1.5 py-0.2 bg-teal-200 dark:bg-teal-800 rounded font-mono text-[10px]">
                      {patientContext.bloodGroup}
                    </span>
                  )}
                </span>
                {patientContext?.allergies?.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded font-semibold text-[10px] border border-rose-300 dark:border-rose-800">
                    Allergic: {patientContext.allergies.join(', ')}
                  </span>
                )}
                {patientContext?.conditions?.length > 0 && (
                  <span className="px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 rounded font-semibold text-[10px] border border-amber-300 dark:border-amber-800">
                    {patientContext.conditions.join(', ')}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-teal-700 dark:text-teal-300 font-medium">
                Live Records Active
              </span>
            </div>
          )}

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50 dark:bg-slate-950/50 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex items-start space-x-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-teal-600 flex-shrink-0 flex items-center justify-center text-white mt-0.5 shadow-sm">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] rounded-2xl p-3 ${
                    m.sender === 'user'
                      ? 'bg-teal-600 text-white rounded-tr-none shadow-sm'
                      : m.isEmergency
                      ? 'bg-rose-50 dark:bg-rose-950/70 border-2 border-rose-500 text-rose-950 dark:text-rose-100 rounded-tl-none shadow-md'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-none shadow-sm'
                  }`}
                >
                  {m.isEmergency && (
                    <div className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400 font-bold mb-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce" />
                      <span>CLINICAL EMERGENCY RED ALERT</span>
                    </div>
                  )}

                  {/* Allergy Warnings */}
                  {m.allergyAlerts?.length > 0 && (
                    <div className="mb-2 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-[11px] space-y-1">
                      {m.allergyAlerts.map((alert, aIdx) => (
                        <div key={aIdx} className="font-bold flex items-start space-x-1">
                          <span>{alert}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pre-existing Condition Insights */}
                  {m.conditionInsights?.length > 0 && (
                    <div className="mb-2 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px] space-y-1">
                      {m.conditionInsights.map((insight, cIdx) => (
                        <div key={cIdx} className="flex items-start space-x-1">
                          <span>{insight}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="whitespace-pre-line leading-relaxed text-xs">
                    {m.text}
                  </div>

                  {/* Recommended Doctors Card */}
                  {m.recommendedDoctors?.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400 block">
                        Available Network Specialists
                      </span>
                      {m.recommendedDoctors.map((doc, dIdx) => (
                        <div
                          key={dIdx}
                          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 flex items-center justify-between text-[11px]"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {doc.name}
                            </span>
                            <span className="text-slate-500 text-[10px]">
                              {doc.specialty} • {doc.hospitalName} • Room {doc.roomNumber}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setIsOpen(false);
                              navigate('/doctors');
                            }}
                            className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-[10px] transition"
                          >
                            Book Slot
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {m.isEmergency && (
                    <a
                      href="tel:108"
                      className="mt-2.5 w-full flex items-center justify-center space-x-2 py-2 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition shadow-md shadow-rose-600/30"
                    >
                      <PhoneCall className="w-4 h-4" />
                      <span>Call 108 Emergency Ambulance Now</span>
                    </a>
                  )}
                </div>

                {m.sender === 'user' && (
                  <div className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center text-slate-700 dark:text-slate-200 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-2 text-slate-400 text-xs p-2">
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce delay-100"></div>
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce delay-200"></div>
                <span>Analyzing past medical records & current symptoms...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Symptoms Multi-Select Bar */}
          <div className="px-3 py-1.5 bg-slate-100/80 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
              <span className="font-semibold flex items-center space-x-1">
                <HeartPulse className="w-3 h-3 text-teal-600" />
                <span>Select Current Symptoms:</span>
              </span>
              {selectedSymptoms.length > 0 && (
                <button
                  onClick={() => sendMessage(null, selectedSymptoms)}
                  className="font-bold text-teal-600 hover:text-teal-700 underline text-[10px]"
                >
                  Send Selected ({selectedSymptoms.length}) →
                </button>
              )}
            </div>
            <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar py-0.5">
              {symptomPills.map((symptom, idx) => {
                const isSelected = selectedSymptoms.includes(symptom);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleSymptomSelection(symptom)}
                    className={`whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-medium transition border ${
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

          {/* Quick Reply Chips */}
          <div className="px-3 py-1.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-1.5 overflow-x-auto text-[11px] no-scrollbar">
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(chip)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 hover:bg-teal-50 hover:text-teal-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 text-slate-600 border border-slate-200 dark:border-slate-700 transition"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={user ? "Describe current symptoms or ask about records..." : "Describe symptoms or ask about doctors..."}
              className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || (!input.trim() && selectedSymptoms.length === 0)}
              className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-40 transition shadow-sm"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
