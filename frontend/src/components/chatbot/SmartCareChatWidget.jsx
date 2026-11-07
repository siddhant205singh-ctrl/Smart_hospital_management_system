import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AssistantChatView from './AssistantChatView';

export default function SmartCareChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center space-x-2 px-3.5 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-teal-600 via-teal-700 to-cyan-600 text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border-2 border-white/30"
          title="Open HealthMS AI"
        >
          <div className="relative">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white"></span>
          </div>
          <span className="text-xs font-bold tracking-wide">HealthMS AI</span>
          <span className="hidden sm:inline text-[10px] text-teal-100 bg-white/20 px-2 py-0.5 rounded-full font-medium">
            Clinical AI
          </span>
        </button>
      )}

      {/* Floating Chat Window */}
      {isOpen && (
        <div className="w-[calc(100vw-24px)] sm:w-[440px] animate-in fade-in zoom-in-95 duration-200">
          <AssistantChatView
            isWidget={true}
            onClose={() => setIsOpen(false)}
            onMaximize={() => {
              setIsOpen(false);
              navigate('/ai-assistant');
            }}
          />
        </div>
      )}
    </div>
  );
}
