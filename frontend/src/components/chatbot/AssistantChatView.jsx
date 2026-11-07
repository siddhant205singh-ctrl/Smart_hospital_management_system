import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeA11y } from '../../contexts/ThemeA11yContext';
import api from '../../services/api';
import {
  Send,
  Sparkles,
  AlertTriangle,
  Bot,
  User,
  Clock,
  Calendar,
  PhoneCall,
  ShieldCheck,
  Stethoscope,
  HeartPulse,
  Pill,
  CheckCircle2,
  X,
  Plus,
  Mic,
  MicOff,
  Globe,
  Trash2,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Lightweight, robust Markdown Renderer for assistant chat
 */
function SimpleMarkdown({ content }) {
  if (!content) return null;

  // Split into lines
  const lines = content.split('\n');

  return (
    <div className="space-y-1.5 leading-relaxed text-xs sm:text-sm">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Headers
        if (trimmed.startsWith('### ')) {
          return <h4 key={idx} className="font-bold text-xs uppercase tracking-wider text-teal-800 dark:text-teal-300 mt-2">{trimmed.slice(4)}</h4>;
        }
        if (trimmed.startsWith('## ')) {
          return <h3 key={idx} className="font-bold text-sm text-teal-900 dark:text-teal-200 mt-2.5">{trimmed.slice(3)}</h3>;
        }
        if (trimmed.startsWith('# ')) {
          return <h2 key={idx} className="font-bold text-base text-teal-900 dark:text-teal-100 mt-3">{trimmed.slice(2)}</h2>;
        }

        // Bullet points
        if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const bulletText = trimmed.slice(2);
          return (
            <div key={idx} className="flex items-start space-x-2 pl-1.5">
              <span className="text-teal-600 dark:text-teal-400 font-bold">•</span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(bulletText) }} />
            </div>
          );
        }

        // Numbered lists
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start space-x-2 pl-1.5">
              <span className="font-bold text-teal-700 dark:text-teal-300 text-xs">{numMatch[1]}.</span>
              <span dangerouslySetInnerHTML={{ __html: formatInline(numMatch[2]) }} />
            </div>
          );
        }

        return (
          <p key={idx} dangerouslySetInnerHTML={{ __html: formatInline(line) }} />
        );
      })}
    </div>
  );
}

function formatInline(text) {
  if (!text) return '';
  let formatted = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold **text**
  formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>');
  // Italic *text*
  formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic text-slate-700 dark:text-slate-300">$1</em>');
  // Inline code `code`
  formatted = formatted.replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[11px]">$1</code>');

  return formatted;
}

export default function AssistantChatView({ isWidget = false, onClose = null, onMaximize = null }) {
  const { user } = useAuth();
  const { currentLanguage } = useThemeA11y();
  const navigate = useNavigate();

  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [chatLanguage, setChatLanguage] = useState(currentLanguage || 'en');
  const [isListening, setIsListening] = useState(false);

  // Privacy notice banner state
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(
    Boolean(user && user.privacySettings?.assistantConsentNoticeDismissed !== true)
  );
  const [healthDataActive, setHealthDataActive] = useState(
    user ? user.privacySettings?.useHealthDataInAssistant !== false : false
  );

  // Booking Confirmation Modal State
  const [bookingConfirmationModal, setBookingConfirmationModal] = useState(null);
  const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);

  const [quickChips, setQuickChips] = useState([
    'Check my symptoms',
    'Find a doctor',
    'What should I do now?',
    'Nearest hospital emergency',
    'Blood availability'
  ]);

  const messagesEndRef = useRef(null);
  const speechRecognitionRef = useRef(null);

  // Initialize speech recognition if available
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = chatLanguage === 'hi' ? 'hi-IN' : 'en-US';

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      speechRecognitionRef.current = recognition;
    }
  }, [chatLanguage]);

  // Load chat session & history
  useEffect(() => {
    loadSessions();
  }, [user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, loading]);

  const loadSessions = async () => {
    try {
      const res = await api.get('/ai/sessions');
      if (res.data?.success && res.data.sessions?.length > 0) {
        setSessions(res.data.sessions);
        const current = res.data.sessions[0];
        setActiveSessionId(current._id);
        loadSessionMessages(current._id);
      } else {
        startNewChat();
      }
    } catch (err) {
      console.log('Session load fallback:', err.message);
      startNewChat();
    }
  };

  const loadSessionMessages = async (sessionId) => {
    try {
      const res = await api.get(`/ai/sessions/${sessionId}/messages`);
      if (res.data?.success && res.data.messages?.length > 0) {
        setMessages(res.data.messages);
      } else {
        setWelcomeMessage();
      }
    } catch (err) {
      setWelcomeMessage();
    }
  };

  const setWelcomeMessage = () => {
    setMessages([
      {
        sender: 'assistant',
        text: user
          ? `Hello **${user.name}**! I am **HealthMS AI**.\n\nI can answer general health questions, evaluate your symptoms, help you find available doctors, review your health timeline, and check live queue tokens.\n\n*General guidance notice: I provide clinical navigation, not a definitive medical diagnosis.*`
          : `Hello! Welcome to **HealthMS AI**.\n\nI am your clinical concierge. You can ask me ANY health questions, describe symptoms, search available doctors, locate emergency care, or check blood availability.\n\n*Clinical notice: I provide health triage and navigation, not a definitive medical diagnosis.*`,
        isEmergency: false,
        quickChips: [
          'Check my symptoms',
          'Find a doctor',
          'What should I do now?',
          'Nearest hospital emergency',
          'Blood availability'
        ]
      }
    ]);
  };

  const startNewChat = async () => {
    try {
      const res = await api.post('/ai/sessions', {});
      if (res.data?.success && res.data.session) {
        setActiveSessionId(res.data.session._id);
        setSessions(prev => [res.data.session, ...prev]);
        setWelcomeMessage();
      }
    } catch (err) {
      setActiveSessionId(`local_${Date.now()}`);
      setWelcomeMessage();
    }
  };

  const dismissPrivacyNotice = async () => {
    setShowPrivacyNotice(false);
    try {
      await api.put('/ai/settings', { assistantConsentNoticeDismissed: true });
    } catch (err) {
      // safe fallback
    }
  };

  const toggleVoiceInput = () => {
    if (!speechRecognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      speechRecognitionRef.current.stop();
      setIsListening(false);
    } else {
      speechRecognitionRef.current.start();
      setIsListening(true);
    }
  };

  const toggleSymptomSelection = (symptom) => {
    setSelectedSymptoms(prev =>
      prev.includes(symptom) ? prev.filter(s => s !== symptom) : [...prev, symptom]
    );
  };

  const handleBookingInitiate = (doctor, date = null, slot = null) => {
    const todayStr = date || new Date().toISOString().split('T')[0];
    const timeSlot = slot || '10:00 - 10:15';
    setBookingConfirmationModal({
      doctorId: doctor.id || doctor._id,
      doctorName: doctor.name,
      specialty: doctor.specialty,
      hospitalName: doctor.hospitalName || 'SmartCare Hospital',
      date: todayStr,
      timeSlot,
      fee: doctor.consultationFee || 500,
      roomNumber: doctor.roomNumber || 'OPD-101'
    });
  };

  const confirmBookingExecution = async () => {
    if (!bookingConfirmationModal) return;
    setIsBookingSubmitting(true);

    try {
      const res = await api.post('/ai/execute-action', {
        actionType: 'book_appointment',
        sessionId: activeSessionId,
        payload: {
          doctorId: bookingConfirmationModal.doctorId,
          date: bookingConfirmationModal.date,
          timeSlot: bookingConfirmationModal.timeSlot,
          symptoms: 'Booked via HealthMS AI'
        }
      });

      if (res.data?.success) {
        const appt = res.data.appointment;
        setMessages(prev => [
          ...prev,
          {
            sender: 'assistant',
            text: `✅ **Appointment Confirmed!**\n\nYour consultation with **${appt.doctorName}** (${appt.specialty}) is scheduled for **${appt.date}** at **${appt.timeSlot}**.\n\n• **Token Number**: #${appt.tokenNumber} (${appt.tokenCode})\n• **Room**: ${appt.roomNumber}\n\nYou can track live queue status anytime in **Live Queue Tracker**!`,
            cards: [{ type: 'appointment_success', appointment: appt }]
          }
        ]);
        setBookingConfirmationModal(null);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Unable to complete appointment booking. Please try another slot.');
    } finally {
      setIsBookingSubmitting(false);
    }
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
    setStatusMessage('Consulting HealthMS AI engine...');
    setStreamingText('');

    try {
      // Perform Server-Sent Events (SSE) streaming call
      const token = localStorage.getItem('smartcare_token') || localStorage.getItem('token');
      const response = await fetch(`${api.defaults.baseURL || '/api'}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: query,
          currentSymptoms: symptomsToSend,
          sessionId: activeSessionId,
          language: chatLanguage
        })
      });

      if (!response.ok || !response.body) {
        throw new Error('SSE stream connection failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let receivedCompleteData = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const textChunk = decoder.decode(value, { stream: true });
        const lines = textChunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                accumulatedText += parsed.text;
                setStreamingText(accumulatedText);
              }
              if (parsed.reply) {
                receivedCompleteData = parsed;
              }
            } catch (e) {
              // chunk json parse skip
            }
          } else if (line.startsWith('event: status')) {
            // status update
          } else if (line.startsWith('event: session')) {
            // session id
          }
        }
      }

      if (receivedCompleteData) {
        setMessages(prev => [
          ...prev,
          {
            sender: 'assistant',
            text: receivedCompleteData.reply || accumulatedText,
            isEmergency: receivedCompleteData.isEmergency,
            cards: receivedCompleteData.cards || [],
            toolCalls: receivedCompleteData.toolCalls || []
          }
        ]);
        if (receivedCompleteData.quickChips) {
          setQuickChips(receivedCompleteData.quickChips);
        }
      } else if (accumulatedText) {
        setMessages(prev => [
          ...prev,
          {
            sender: 'assistant',
            text: accumulatedText,
            isEmergency: false
          }
        ]);
      }
    } catch (err) {
      console.warn('Falling back to standard chat endpoint:', err.message);
      // Fallback to standard JSON endpoint
      try {
        const res = await api.post('/ai/chat', {
          message: query,
          currentSymptoms: symptomsToSend,
          sessionId: activeSessionId,
          language: chatLanguage
        });

        setMessages(prev => [
          ...prev,
          {
            sender: 'assistant',
            text: res.data.reply,
            isEmergency: res.data.isEmergency,
            cards: res.data.cards || [],
            toolCalls: res.data.toolCalls || []
          }
        ]);

        if (res.data.quickChips) {
          setQuickChips(res.data.quickChips);
        }
      } catch (innerErr) {
        setMessages(prev => [
          ...prev,
          {
            sender: 'assistant',
            text: 'I encountered an issue connecting to the clinical engine. Please ensure your network is connected and try again.',
            isEmergency: false
          }
        ]);
      }
    } finally {
      setLoading(false);
      setStatusMessage('');
      setStreamingText('');
    }
  };

  const symptomPills = [
    'Shortness of breath / Wheezing',
    'Persistent dry cough',
    'Headache & Dizziness',
    'High Blood Pressure check',
    'Chest tightness',
    'Joint / Knee pain',
    'Skin rash / Itching',
    'Child fever / Cough'
  ];

  return (
    <div className={`flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden ${isWidget ? 'h-[78vh] sm:h-[620px] max-h-[660px] rounded-3xl' : 'h-[calc(100vh-6.5rem)] rounded-3xl'}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-teal-700 via-teal-800 to-cyan-800 text-white flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
            <Bot className="w-5 h-5 text-teal-100" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-xs sm:text-sm">HealthMS AI</h3>
              <span className="text-[10px] bg-amber-400/30 text-amber-200 px-1.5 py-0.2 rounded font-semibold border border-amber-400/30">
                Clinical AI
              </span>
            </div>
            <p className="text-[10px] text-teal-100">
              General Q&A • Clinical Triage • Doctor Navigation
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {/* Language Toggle */}
          <button
            onClick={() => setChatLanguage(prev => prev === 'en' ? 'hi' : (prev === 'hi' ? 'hinglish' : 'en'))}
            className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-teal-100 text-[11px] font-bold transition flex items-center space-x-1"
            title="Toggle Language (English / Hindi / Hinglish)"
          >
            <Globe className="w-3.5 h-3.5" />
            <span className="uppercase">{chatLanguage}</span>
          </button>

          {/* New Chat Button */}
          <button
            onClick={startNewChat}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-teal-100 hover:text-white transition"
            title="Start New Chat"
          >
            <Plus className="w-4 h-4" />
          </button>

          {isWidget && onMaximize && (
            <button
              onClick={onMaximize}
              className="p-1.5 rounded-lg hover:bg-white/20 text-teal-100 hover:text-white transition"
              title="Full Screen Mode"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {isWidget && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/20 text-teal-100 hover:text-white transition"
              title="Close Widget"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* One-time Privacy Notice Banner */}
      {showPrivacyNotice && user && (
        <div className="px-3.5 py-2.5 bg-cyan-50 dark:bg-cyan-950/70 border-b border-cyan-200 dark:border-cyan-800 text-xs text-cyan-950 dark:text-cyan-200 flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400 mt-0.5 flex-shrink-0" />
            <span className="text-[11px] leading-tight">
              HealthMS AI can use your profile and health timeline to personalize help. You can turn this off anytime in <strong>Profile Settings</strong>.
            </span>
          </div>
          <button
            onClick={dismissPrivacyNotice}
            className="px-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-[10px] font-bold transition flex-shrink-0"
          >
            Understood
          </button>
        </div>
      )}

      {/* Health Data Sharing Active Badge */}
      {user && (
        <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 text-[11px] flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-slate-700 dark:text-slate-300">
            <User className="w-3.5 h-3.5 text-teal-600" />
            <span className="font-bold">{user.name}</span>
            {healthDataActive ? (
              <span className="px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-medium text-[10px]">
                Health Data Active
              </span>
            ) : (
              <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-medium text-[10px]">
                General Mode (Privacy Off)
              </span>
            )}
          </div>
          <button
            onClick={() => navigate('/emergency')}
            className="flex items-center space-x-1 text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900"
          >
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            <span>Emergency 112/108</span>
          </button>
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 bg-slate-50 dark:bg-slate-950/40 text-xs sm:text-sm">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start space-x-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-teal-600 flex-shrink-0 flex items-center justify-center text-white mt-0.5 shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[88%] rounded-2xl p-3.5 shadow-sm ${
                m.sender === 'user'
                  ? 'bg-teal-600 text-white rounded-tr-none'
                  : m.isEmergency
                  ? 'bg-rose-50 dark:bg-rose-950/80 border-2 border-rose-500 text-rose-950 dark:text-rose-100 rounded-tl-none shadow-md'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700'
              }`}
            >
              {m.isEmergency && (
                <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-bold mb-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600 animate-bounce" />
                  <span>EMERGENCY MEDICAL RED ALERT</span>
                </div>
              )}

              {/* Message Content rendered with Markdown */}
              <SimpleMarkdown content={m.text} />

              {/* Render Cards (Doctors, Emergency, Booking) */}
              {m.cards?.map((card, cIdx) => {
                if (card.type === 'doctors' && card.doctors?.length > 0) {
                  return (
                    <div key={cIdx} className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700 space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 block">
                        Recommended Available Specialists
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {card.doctors.map((doc, dIdx) => (
                          <div
                            key={dIdx}
                            className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {doc.name}
                              </span>
                              <span className="text-slate-500 text-[10px] block">
                                {doc.specialty} • {doc.qualifications || 'MBBS'}
                              </span>
                              <span className="text-teal-600 dark:text-teal-400 font-bold text-[10px] block mt-0.5">
                                OPD Room {doc.roomNumber} • Fee: ₹{doc.consultationFee}
                              </span>
                            </div>
                            <button
                              onClick={() => handleBookingInitiate(doc)}
                              className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-xs transition shadow-sm"
                            >
                              Book Slot
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }

                if (card.type === 'booking_confirmation' && card.data?.details) {
                  const b = card.data.details;
                  return (
                    <div key={cIdx} className="mt-3 p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/70 border border-teal-300 dark:border-teal-700 text-xs">
                      <div className="font-bold text-teal-900 dark:text-teal-200 mb-1 flex items-center space-x-1.5">
                        <Calendar className="w-4 h-4 text-teal-600" />
                        <span>Ready to Book Appointment:</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 text-xs mb-2.5">
                        Dr. {b.doctorName} on <strong>{b.date}</strong> at <strong>{b.timeSlot}</strong> (OPD Room {b.roomNumber}, Fee: ₹{b.fee}).
                      </p>
                      <button
                        onClick={() => handleBookingInitiate(b, b.date, b.timeSlot)}
                        className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition text-xs shadow-md"
                      >
                        Confirm Booking Now
                      </button>
                    </div>
                  );
                }

                if (card.type === 'appointment_success' && card.appointment) {
                  const a = card.appointment;
                  return (
                    <div key={cIdx} className="mt-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-xs text-emerald-950 dark:text-emerald-200">
                      <div className="flex items-center space-x-2 font-bold text-emerald-800 dark:text-emerald-300 mb-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Token Confirmed: #{a.tokenNumber} ({a.tokenCode})</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300">
                        {a.doctorName} • {a.date} at {a.timeSlot} (Room {a.roomNumber})
                      </p>
                    </div>
                  );
                }

                return null;
              })}

              {m.isEmergency && (
                <div className="mt-3 space-y-2">
                  <a
                    href="tel:108"
                    className="w-full flex items-center justify-center space-x-2 py-2.5 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition shadow-md shadow-rose-600/30 text-xs"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Call 108 Emergency Ambulance Now</span>
                  </a>
                  <button
                    onClick={() => navigate('/emergency')}
                    className="w-full py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition text-xs"
                  >
                    Open Emergency Intake & ER Directions
                  </button>
                </div>
              )}
            </div>

            {m.sender === 'user' && (
              <div className="w-7 h-7 rounded-full bg-slate-300 dark:bg-slate-700 flex-shrink-0 flex items-center justify-center text-slate-700 dark:text-slate-200 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {/* Live Streaming Text Indicator */}
        {streamingText && (
          <div className="flex items-start space-x-2.5 justify-start">
            <div className="w-7 h-7 rounded-full bg-teal-600 flex-shrink-0 flex items-center justify-center text-white mt-0.5 shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div className="max-w-[88%] rounded-2xl p-3.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700 shadow-sm">
              <SimpleMarkdown content={streamingText} />
              <span className="inline-block w-2 h-4 ml-1 bg-teal-500 animate-pulse" />
            </div>
          </div>
        )}

        {loading && !streamingText && (
          <div className="flex items-center space-x-2 text-slate-500 text-xs p-2">
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce"></div>
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce delay-100"></div>
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce delay-200"></div>
            <span>{statusMessage || 'Evaluating health context...'}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Symptoms Multi-Select Bar */}
      <div className="px-3.5 py-1.5 bg-slate-100/90 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
          <span className="font-semibold flex items-center space-x-1.5">
            <HeartPulse className="w-3.5 h-3.5 text-teal-600" />
            <span>Select Symptoms:</span>
          </span>
          {selectedSymptoms.length > 0 && (
            <button
              onClick={() => sendMessage(null, selectedSymptoms)}
              className="font-bold text-teal-600 hover:text-teal-700 underline text-[11px]"
            >
              Analyze Selected ({selectedSymptoms.length}) →
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
                className={`whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium transition border ${
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

      {/* Quick Action Chips */}
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

      {/* Input Bar */}
      <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center space-x-2">
        <button
          type="button"
          onClick={toggleVoiceInput}
          className={`p-2.5 rounded-xl border transition ${
            isListening
              ? 'bg-rose-100 border-rose-300 text-rose-600 animate-pulse'
              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-teal-600'
          }`}
          title={isListening ? 'Listening... click to stop' : 'Voice input'}
        >
          {isListening ? <Mic className="w-4 h-4 text-rose-600" /> : <MicOff className="w-4 h-4" />}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder={
            user
              ? 'Ask health question, describe symptoms, or ask "What should I do now?"...'
              : 'Ask a question, describe symptoms, or search doctors...'
          }
          className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />

        <button
          onClick={() => sendMessage()}
          disabled={loading || (!input.trim() && selectedSymptoms.length === 0)}
          className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-40 transition shadow-sm"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Explicit Booking Confirmation Modal */}
      {bookingConfirmationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center space-x-2 text-teal-700 dark:text-teal-300 font-bold">
              <Calendar className="w-5 h-5 text-teal-600" />
              <h3 className="text-sm">Confirm OPD Appointment</h3>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">
                {bookingConfirmationModal.doctorName}
              </p>
              <p className="text-slate-500">
                {bookingConfirmationModal.specialty} • {bookingConfirmationModal.hospitalName}
              </p>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Date</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{bookingConfirmationModal.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Time Slot</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{bookingConfirmationModal.timeSlot}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Room</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{bookingConfirmationModal.roomNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Consultation Fee</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400">₹{bookingConfirmationModal.fee}</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              A verified live token number and arrival alert will be issued upon confirmation.
            </p>

            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={() => setBookingConfirmationModal(null)}
                disabled={isBookingSubmitting}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmBookingExecution}
                disabled={isBookingSubmitting}
                className="flex-1 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 font-bold text-xs text-white transition shadow-md"
              >
                {isBookingSubmitting ? 'Confirming...' : 'Yes, Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
