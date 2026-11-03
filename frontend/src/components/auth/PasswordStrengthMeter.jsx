import React from 'react';
import { Check, X } from 'lucide-react';

export default function PasswordStrengthMeter({ password = '' }) {
  const checks = [
    { label: 'At least 8 characters (10+ recommended)', valid: password.length >= 8 },
    { label: 'Uppercase letter (A-Z)', valid: /[A-Z]/.test(password) },
    { label: 'Lowercase letter (a-z)', valid: /[a-z]/.test(password) },
    { label: 'Numeric digit (0-9)', valid: /[0-9]/.test(password) },
    { label: 'Special symbol (!@#$%^&* etc.)', valid: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) }
  ];

  const passedCount = checks.filter(c => c.valid).length;

  const getStrengthMeta = () => {
    if (!password) return { label: 'Empty', color: 'bg-slate-200', text: 'text-slate-400', width: 'w-0' };
    if (passedCount <= 2) return { label: 'Weak', color: 'bg-rose-500', text: 'text-rose-500', width: 'w-1/4' };
    if (passedCount === 3) return { label: 'Fair', color: 'bg-amber-500', text: 'text-amber-500', width: 'w-2/4' };
    if (passedCount === 4) return { label: 'Good', color: 'bg-teal-500', text: 'text-teal-500', width: 'w-3/4' };
    return { label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-500', width: 'w-full' };
  };

  const meta = getStrengthMeta();

  return (
    <div className="w-full space-y-2 mt-1">
      {/* Visual Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[11px]">
          <span className="text-slate-500">Password Strength</span>
          <span className={`font-bold ${meta.text}`}>{meta.label}</span>
        </div>
        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div className={`h-full ${meta.color} ${meta.width} transition-all duration-300 rounded-full`} />
        </div>
      </div>

      {/* Requirement Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px] text-slate-500 pt-1">
        {checks.map((c, idx) => (
          <div key={idx} className="flex items-center space-x-1.5">
            {c.valid ? (
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[2.5]" />
            ) : (
              <X className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
            )}
            <span className={c.valid ? 'text-slate-700 dark:text-slate-300 font-medium' : ''}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
