import React from 'react';
import { HeartHandshake, Award, Shield, CheckCircle2, AlertCircle, Droplet } from 'lucide-react';

export default function EligibilityCountdown({ donor, daysUntilEligible, isCurrentlyEligible }) {
  if (!donor) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Col 1: Eligibility status & countdown */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Donation Eligibility
            </span>
          </div>

          {isCurrentlyEligible ? (
            <div>
              <h3 className="text-xl font-black text-emerald-600 dark:text-emerald-400 flex items-center space-x-1.5">
                <CheckCircle2 className="w-6 h-6" />
                <span>Eligible Today!</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                You can safely donate blood at any network hospital or partner camp today.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {daysUntilEligible}
                </span>
                <span className="text-sm font-semibold text-slate-500">days remaining</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Next eligible donation on <strong>{new Date(donor.nextEligibleDate).toLocaleDateString()}</strong> (enforcing health recovery gap).
              </p>
            </div>
          )}
        </div>

        {/* Col 2: Lives Saved Counter */}
        <div className="bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/30 dark:to-orange-950/20 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/40 text-center">
          <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center mx-auto mb-1.5 shadow-md shadow-rose-500/20">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
            {donor.livesImpacted || donor.totalDonations * 3}
          </span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
            Lives Positively Impacted
          </span>
          <span className="text-[10px] text-slate-400">
            Based on {donor.totalDonations} verified component donations
          </span>
        </div>

        {/* Col 3: Donor Badges */}
        <div>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
            Earned Donor Badges
          </span>
          <div className="flex flex-wrap gap-1.5">
            {donor.badges && donor.badges.length > 0 ? (
              donor.badges.map((b, idx) => (
                <div
                  key={idx}
                  className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-[11px] font-semibold flex items-center space-x-1 border border-slate-200 dark:border-slate-700"
                >
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  <span>{b.name}</span>
                </div>
              ))
            ) : (
              <span className="text-xs text-slate-400">Make your first donation to earn badges!</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
