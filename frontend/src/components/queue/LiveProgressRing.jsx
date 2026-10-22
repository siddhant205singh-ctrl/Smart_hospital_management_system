import React from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, AlertCircle } from 'lucide-react';

export default function LiveProgressRing({
  currentToken = 0,
  myToken = 0,
  tokenCode = 'CARD-001',
  patientsAhead = 0,
  estimatedWaitMinutes = 0,
  status = 'scheduled'
}) {
  // Calculate percentage of queue completed
  const totalInLine = currentToken + patientsAhead;
  const progressPercent = totalInLine > 0 ? Math.min(100, Math.round((currentToken / (myToken || 1)) * 100)) : 0;

  const strokeDashoffset = 283 - (283 * progressPercent) / 100;

  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800">
      {/* Big Animated SVG Ring */}
      <div className="relative w-52 h-52 sm:w-64 sm:h-64 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            className="stroke-slate-100 dark:stroke-slate-800"
            strokeWidth="8"
            fill="transparent"
          />
          {/* Progress circle */}
          <motion.circle
            cx="50"
            cy="50"
            r="45"
            className="stroke-teal-500"
            strokeWidth="8"
            strokeDasharray="283"
            initial={{ strokeDashoffset: 283 }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-teal-600 dark:text-teal-400">
            Your Digital Token
          </span>
          <span className="text-4xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight my-0.5 sm:my-1">
            #{myToken}
          </span>
          <span className="text-[11px] sm:text-xs font-semibold px-2 sm:px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
            {tokenCode}
          </span>
          <span className="text-[10px] sm:text-[11px] text-slate-400 mt-1 sm:mt-2 capitalize">
            Status: <strong className="text-slate-700 dark:text-slate-300">{status.replace('_', ' ')}</strong>
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 w-full mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
          <div className="flex items-center justify-center space-x-1.5 text-slate-500 dark:text-slate-400 text-xs mb-1">
            <Users className="w-4 h-4 text-teal-500" />
            <span>Patients Ahead</span>
          </div>
          <span className="text-2xl font-bold text-slate-900 dark:text-white">
            {patientsAhead}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Serving now: #{currentToken || '-'}
          </span>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
          <div className="flex items-center justify-center space-x-1.5 text-slate-500 dark:text-slate-400 text-xs mb-1">
            <Clock className="w-4 h-4 text-cyan-500" />
            <span>Est. Wait Time</span>
          </div>
          <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">
            {estimatedWaitMinutes} <span className="text-sm font-medium">min</span>
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Rolling avg updated
          </span>
        </div>
      </div>
    </div>
  );
}
