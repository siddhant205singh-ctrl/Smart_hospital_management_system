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
  PhoneCall
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SmartCareChatWidget() {
  const { user } = useAuth();
  const { currentLanguage } = useThemeA11y();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: "Hello! I am your **SmartCare Assistant**. I can guide you through doctor booking, check your live queue position, explain health reports, or check LifeShare blood donor eligibility.\n\n*Note: I provide health navigation, not medical diagnosis.*",
      isEmergency: false
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quickChips, setQuickChips] = useState([
    'My Next Appointment',
    'Check Live Queue Status',
    'Blood Availability',
    'Am I Eligible to Donate?',
    'Community Card Perks'
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMsg = { sender: 'user', text: query, isEmergency: false };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        message: query,
        language: currentLanguage
      });

      const botMsg = {
        sender: 'assistant',
        text: res.data.reply,
        isEmergency: res.data.isEmergency,
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

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-white/20"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full"></span>
          </div>
          <span className="text-xs font-bold tracking-wide">SmartCare AI</span>
          <span className="hidden sm:inline text-[11px] text-teal-100 bg-white/20 px-2 py-0.5 rounded-full">
            Clinical Concierge
          </span>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="w-[360px] sm:w-[410px] h-[550px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-700 text-white flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Bot className="w-5 h-5 text-teal-100" />
              </div>
              <div>
                <h3 className="font-bold text-xs flex items-center space-x-1">
                  <span>SmartCare Assistant</span>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-normal">Gemini AI</span>
                </h3>
                <p className="text-[10px] text-teal-100">Live Hospital & LifeShare Concierge</p>
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

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50 dark:bg-slate-950/50 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex items-start space-x-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-teal-600 flex-shrink-0 flex items-center justify-center text-white mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl p-3 ${
                    m.sender === 'user'
                      ? 'bg-teal-600 text-white rounded-tr-none'
                      : m.isEmergency
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-500 text-rose-950 dark:text-rose-100 rounded-tl-none'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-none shadow-sm'
                  }`}
                >
                  {m.isEmergency && (
                    <div className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400 font-bold mb-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 animate-bounce" />
                      <span>CLINICAL EMERGENCY ALERT</span>
                    </div>
                  )}

                  <div className="whitespace-pre-line leading-relaxed text-xs">
                    {m.text}
                  </div>

                  {m.isEmergency && (
                    <a
                      href="tel:108"
                      className="mt-2.5 w-full flex items-center justify-center space-x-2 py-2 bg-rose-600 text-white font-bold rounded-lg hover:bg-rose-700 transition"
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
              <div className="flex items-center space-x-2 text-slate-400 text-xs">
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce"></div>
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce delay-100"></div>
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-bounce delay-200"></div>
                <span>SmartCare AI is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Chips */}
          <div className="px-3 py-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center space-x-1.5 overflow-x-auto text-[11px] no-scrollbar">
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
              placeholder="Ask symptoms, queue status, blood info..."
              className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-40 transition shadow-sm"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
