import React from 'react';
import { ShieldAlert, ShieldCheck, Scale, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function LegalPolicyLifeShare() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 rounded-full text-xs font-bold">
          <Scale className="w-4 h-4" />
          <span>Ethics, Compliance & Policy Charter</span>
        </div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-white">
          LifeShare Voluntary Donor Compliance Policy
        </h1>
        <p className="text-xs text-slate-500">
          Governed under the National Blood Transfusion Council (NBTC) and Drugs & Cosmetics Act regulations.
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
        {/* Guardrail 1 */}
        <div className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>1. 100% Voluntary, Unpaid Blood Donation</span>
          </h2>
          <p>
            SmartCare strictly adheres to national and international healthcare statutes prohibiting the commercialization of human blood and blood components. Under no circumstances does SmartCare or partner hospitals offer monetary remuneration, cash equivalents, or purchase options to blood donors.
          </p>
        </div>

        {/* Guardrail 2 */}
        <div className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>2. Non-Monetary Milestone Recognition & Official Certificates</span>
          </h2>
          <p>
            SmartCare recognizes donors solely through milestone badges, thank-you certificates, and Health Timeline records. These honors carry <strong>strictly zero monetary value, financial credit, or outpatient discounts</strong>. Donations are 100% altruistic, voluntary, and unpaid in compliance with National Blood Transfusion Council (NBTC) guidelines.
          </p>
        </div>

        {/* Guardrail 3 */}
        <div className="space-y-2">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>3. Clinical Urgency Governs Blood Allocation First</span>
          </h2>
          <p>
            In blood allocation, triage is dictated strictly by clinical need and patient urgency. Emergency trauma, surgical hemorrhage, and critical cases receive available blood first, irrespective of donor status. <strong>Donor Family Fast-Track status never bumps a less urgent patient ahead of a more critical one</strong>. Fast-Track provides administrative friction removal: blood bank processing fee waived to ₹0, exemption from replacement donor mandates, and pre-verified paperwork status.
          </p>
        </div>

        {/* Regulatory note */}
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1">
          <div className="flex items-center space-x-1.5 font-bold">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Statutory Notice for Hospital Administrators</span>
          </div>
          <p className="text-[11px]">
            {/* TODO: SmartCare LifeShare policy must be reviewed against National Blood Transfusion Council (NBTC) / Drugs & Cosmetics Act rules before production deployment in hospitals. */}
            Notice: SmartCare LifeShare policy must be periodically reviewed against National Blood Transfusion Council (NBTC) and state blood transfusion council rules before deployment in new clinical jurisdictions.
          </p>
        </div>
      </div>
    </div>
  );
}
