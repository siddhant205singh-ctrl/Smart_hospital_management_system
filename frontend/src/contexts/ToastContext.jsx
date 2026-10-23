import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  Sparkles
} from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message, options = {}) => {
    if (!message) return;
    const msgString = typeof message === 'string' ? message : String(message);

    // Auto-detect type if not explicitly supplied
    let detectedType = options.type;
    if (!detectedType) {
      const lower = msgString.toLowerCase();
      if (
        lower.includes('failed') ||
        lower.includes('error') ||
        lower.includes('invalid') ||
        lower.includes('unauthorized') ||
        lower.includes('misuse') ||
        lower.includes('flagged') ||
        lower.includes('denied') ||
        lower.includes('must accept') ||
        lower.includes('reject')
      ) {
        detectedType = 'error';
      } else if (
        lower.includes('success') ||
        lower.includes('verified') ||
        lower.includes('confirmed') ||
        lower.includes('granted') ||
        lower.includes('awarded') ||
        lower.includes('allocated') ||
        lower.includes('fulfilled') ||
        lower.includes('dispatched') ||
        lower.includes('active') ||
        lower.includes('token generated') ||
        lower.includes('done')
      ) {
        detectedType = 'success';
      } else if (lower.includes('warning') || lower.includes('caution') || lower.includes('gap')) {
        detectedType = 'warning';
      } else {
        detectedType = 'info';
      }
    }

    const newToast = {
      id: `${Date.now()}-${Math.random()}`,
      message: msgString,
      type: detectedType,
      title: options.title || (
        detectedType === 'success' ? 'Action Completed' :
        detectedType === 'error' ? 'Notice' :
        detectedType === 'warning' ? 'Attention' :
        'SmartCare Notification'
      ),
      duration: options.duration || 4500
    };

    setToasts((prev) => [newToast, ...prev].slice(0, 5)); // Keep max 5 visible

    setTimeout(() => {
      removeToast(newToast.id);
    }, newToast.duration);
  }, [removeToast]);

  // Intercept native browser alert() calls globally
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg) => {
      showToast(msg);
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [showToast]);

  const toastHelpers = {
    show: showToast,
    success: (msg, title) => showToast(msg, { type: 'success', title }),
    error: (msg, title) => showToast(msg, { type: 'error', title }),
    warning: (msg, title) => showToast(msg, { type: 'warning', title }),
    info: (msg, title) => showToast(msg, { type: 'info', title })
  };

  return (
    <ToastContext.Provider value={toastHelpers}>
      {children}

      {/* Floating Modern Toast Stack Container */}
      <div className="fixed top-4 right-3 sm:right-6 z-[99999] flex flex-col space-y-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';

          const accentBg = isSuccess
            ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
            : isError
            ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
            : isWarning
            ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
            : 'bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 border-teal-200 dark:border-teal-800';

          const progressBarColor = isSuccess
            ? 'bg-emerald-500'
            : isError
            ? 'bg-rose-500'
            : isWarning
            ? 'bg-amber-500'
            : 'bg-teal-500';

          return (
            <div
              key={toast.id}
              className="pointer-events-auto relative overflow-hidden rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 p-3.5 shadow-2xl shadow-slate-900/10 dark:shadow-black/50 text-slate-800 dark:text-slate-100 flex items-start space-x-3 transition-all duration-300 animate-in fade-in slide-in-from-top-3"
            >
              {/* Icon Container */}
              <div className={`p-2 rounded-xl flex-shrink-0 border ${accentBg}`}>
                {isSuccess && <CheckCircle2 className="w-4 h-4" />}
                {isError && <AlertCircle className="w-4 h-4" />}
                {isWarning && <AlertTriangle className="w-4 h-4" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4" />}
              </div>

              {/* Text Body */}
              <div className="flex-1 pr-2 pt-0.5">
                <h5 className="font-bold text-xs leading-none text-slate-900 dark:text-white">
                  {toast.title}
                </h5>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-snug">
                  {toast.message}
                </p>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Countdown Progress Line */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full ${progressBarColor} transition-all duration-300`}
                  style={{
                    animation: `toastProgress ${toast.duration}ms linear forwards`
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
