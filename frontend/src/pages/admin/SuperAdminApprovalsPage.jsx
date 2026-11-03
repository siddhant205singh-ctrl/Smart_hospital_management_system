import React from 'react';
import StaffCredentialingDesk from '../../components/admin/StaffCredentialingDesk';
import { ShieldCheck, Building2, UserCheck, AlertTriangle } from 'lucide-react';

export default function SuperAdminApprovalsPage() {
  return (
    <div className="min-h-[85vh] py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
      {/* Super Admin Top Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-900 to-indigo-900 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-purple-800/80 text-purple-200 text-xs font-bold border border-purple-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Platform Super Admin Oversight Desk</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">Hospital Facility Verification Desk</h1>
          <p className="text-xs text-purple-200">
            Review hospital registration licenses and approve new Hospital Administrators to connect their medical center into the HealthMS network.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="px-4 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
            <span className="block text-[10px] text-purple-200 uppercase font-semibold">Verification Standard</span>
            <span className="font-bold text-white">DPDP & Clinical License</span>
          </div>
        </div>
      </div>

      {/* Embedded Desk filtered for Hospital Admins */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <StaffCredentialingDesk roleFilter="hospital_admin" />
      </div>
    </div>
  );
}
