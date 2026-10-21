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
  ShieldCheck
} from 'lucide-react';

export default function FullAssistantPage() {
  const { user } = useAuth();
  const { currentLanguage } = useThemeA11y();
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: "Welcome to **SmartCare Assistant** (Full-Screen Concierge)!\n\nI can help you navigate hospital appointments, check your live queue token, suggest specialists from symptoms, explain diagnostic lab reports, or verify LifeShare blood donor perks.\n\n*Notice: I provide health triage and navigation, not a definitive medical diagnosis.*",
      isEmergency: false
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    setMessages(prev => [...prev, { sender: 'user', text: query, isEmergency: false }]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', { message: query, language: currentLanguage });
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: res.data.reply,
          isEmergency: res.data.isEmergency,
          toolResult: res.data.toolResult
        }
      ]);
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 h-[calc(100vh-8rem)] flex flex-col">
      {/* Top Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-md">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
              <span>SmartCare AI Concierge</span>
              <span className="text-[10px] bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 px-2 py-0.5 rounded-full font-bold">Gemini Clinical Proxy</span>
            </h1>
            <p className="text-xs text-slate-500">Autonomous function-calling, symptom triage & LifeShare tools</p>
          </div>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm overflow-y-auto space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex items-start space-x-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl p-4 text-xs ${
                m.sender === 'user'
                  ? 'bg-teal-600 text-white rounded-tr-none'
                  : m.isEmergency
                  ? 'bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-500 text-rose-950 dark:text-rose-100 rounded-tl-none'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200 dark:border-slate-700 shadow-sm'
              }`}
            >
              {m.isEmergency && (
                <div className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400 font-bold mb-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce" />
                  <span>EMERGENCY CLINICAL WARNING</span>
                </div>
              )}
              <div className="whitespace-pre-line leading-relaxed text-xs">
                {m.text}
              </div>
              {m.isEmergency && (
                <a
                  href="tel:108"
                  className="mt-3 inline-flex items-center space-x-2 px-4 py-2 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Call 108 Emergency Helpline</span>
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
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce"></div>
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce delay-100"></div>
            <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce delay-200"></div>
            <span>Evaluating clinical models...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Chips */}
      <div className="py-2.5 flex items-center space-x-2 overflow-x-auto text-xs no-scrollbar">
        {[
          'My Next Appointment',
          'Check Live Queue Status',
          'Blood Availability in Network',
          'Am I Eligible to Donate Blood?',
          'What are the Community Card Perks?'
        ].map((chip, idx) => (
          <button
            key={idx}
            onClick={() => sendMessage(chip)}
            className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-teal-50 font-medium transition"
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
          placeholder="Ask a question, describe symptoms, or ask about queue tokens..."
          className="flex-1 px-4 py-2.5 text-xs bg-transparent border-none text-slate-900 dark:text-slate-100 focus:outline-none"
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
