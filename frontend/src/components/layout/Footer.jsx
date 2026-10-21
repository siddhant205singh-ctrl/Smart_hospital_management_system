import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Heart, Shield, PhoneCall, Droplet } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1: Brand & Mission */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-base font-bold text-slate-900 dark:text-white">SmartCare</span>
            </div>
            <p className="text-slate-500 leading-relaxed text-xs">
              Next-generation smart hospital management system designed to eliminate patient waiting queues and empower voluntary blood donors.
            </p>
            <div className="flex items-center space-x-1.5 text-rose-600 font-medium">
              <Droplet className="w-4 h-4 fill-rose-500" />
              <span>LifeShare Voluntary Donor Network</span>
            </div>
          </div>

          {/* Col 2: Hospital Partners */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">Connected Hospitals</h4>
            <ul className="space-y-2">
              <li>Apollo Indraprastha Medical Center (New Delhi)</li>
              <li>Fortis Memorial Research Institute (Gurugram)</li>
              <li>Max Super Speciality Hospital (Saket, New Delhi)</li>
              <li className="text-teal-600 dark:text-teal-400 font-medium">+ Seamless cross-network referrals</li>
            </ul>
          </div>

          {/* Col 3: Emergency & Helplines */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">Emergency Hotlines</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-rose-600 font-bold">
                <PhoneCall className="w-4 h-4" />
                <span>National Emergency: 108 / 112</span>
              </div>
              <p>Apollo Trauma Care: 1066</p>
              <p>Fortis Emergency: 105010</p>
              <p>Max Cardiac ER: 011-40554055</p>
            </div>
          </div>

          {/* Col 4: Regulatory & Ethics */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-3 text-sm">Ethics & Compliance</h4>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              LifeShare blood donation is strictly voluntary and unpaid under the National Blood Transfusion Council (NBTC) guidelines. Community Health Card discounts are restricted solely to outpatient welfare and never apply to inpatient admissions, surgeries, or blood units.
            </p>
            <Link to="/legal-policy" className="mt-2 inline-block text-teal-600 hover:underline font-medium">
              Read LifeShare Legal & Policy Charter →
            </Link>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400">
          <p>© 2026 SmartCare Healthcare Network. All rights reserved.</p>
          <div className="flex space-x-4 mt-2 sm:mt-0">
            <Link to="/legal-policy" className="hover:text-teal-600">Privacy & Consent</Link>
            <Link to="/legal-policy" className="hover:text-teal-600">Terms of Care</Link>
            <Link to="/legal-policy" className="hover:text-teal-600">NBTC Compliance</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
