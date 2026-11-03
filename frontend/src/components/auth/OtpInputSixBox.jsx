import React, { useState, useRef, useEffect } from 'react';
import { RotateCw, CheckCircle2 } from 'lucide-react';

export default function OtpInputSixBox({
  value = '',
  onChange,
  onComplete,
  disabled = false,
  onResend,
  cooldownSeconds = 60,
  email = ''
}) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(cooldownSeconds);
  const inputRefs = useRef([]);

  // Sync internal digits if value is passed from outside
  useEffect(() => {
    if (value && value.length === 6) {
      setDigits(value.split(''));
    }
  }, [value]);

  // Cooldown countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleChange = (index, e) => {
    const val = e.target.value.replace(/\D/g, '');
    const newDigits = [...digits];

    if (val.length > 1) {
      // Handle paste directly into an input
      const pasted = val.slice(0, 6).split('');
      pasted.forEach((char, i) => {
        if (i < 6) newDigits[i] = char;
      });
      setDigits(newDigits);
      const combined = newDigits.join('');
      onChange && onChange(combined);
      if (combined.length === 6) {
        onComplete && onComplete(combined);
        inputRefs.current[5]?.focus();
      }
      return;
    }

    newDigits[index] = val ? val[val.length - 1] : '';
    setDigits(newDigits);
    const combined = newDigits.join('');
    onChange && onChange(combined);

    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (combined.length === 6 && !newDigits.includes('')) {
      onComplete && onComplete(combined);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const newDigits = [...digits];
    pasteData.split('').forEach((char, i) => {
      if (i < 6) newDigits[i] = char;
    });
    setDigits(newDigits);
    const combined = newDigits.join('');
    onChange && onChange(combined);

    const nextIndex = Math.min(pasteData.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (combined.length === 6) {
      onComplete && onComplete(combined);
    }
  };

  const handleResendClick = async () => {
    if (timeLeft > 0 || disabled) return;
    if (onResend) {
      await onResend();
      setTimeLeft(cooldownSeconds || 60);
    }
  };

  return (
    <div className="w-full flex flex-col items-center space-y-4">
      {email && (
        <p className="text-xs text-slate-500 text-center">
          Enter the 6-digit verification code sent to <br />
          <span className="font-semibold text-slate-800 dark:text-slate-200">{email}</span>
        </p>
      )}

      {/* 6 Input Boxes */}
      <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={el => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={2}
            value={digit}
            disabled={disabled}
            onChange={e => handleChange(index, e)}
            onKeyDown={e => handleKeyDown(index, e)}
            autoFocus={index === 0}
            className={`w-11 h-12 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-xl border transition-all outline-none ${
              digit
                ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 ring-2 ring-teal-500/20 shadow-sm'
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:border-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30'
            }`}
          />
        ))}
      </div>

      {/* Resend Cooldown Countdown */}
      <div className="flex items-center justify-between w-full max-w-xs text-xs px-1">
        <span className="text-slate-500">Didn't receive code?</span>
        {timeLeft > 0 ? (
          <span className="text-slate-400 font-medium">
            Resend in <span className="font-mono text-teal-600 font-semibold">{timeLeft}s</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResendClick}
            disabled={disabled}
            className="font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 hover:underline flex items-center space-x-1"
          >
            <RotateCw className="w-3 h-3" />
            <span>Resend Code</span>
          </button>
        )}
      </div>
    </div>
  );
}
