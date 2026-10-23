import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Droplet, PhoneCall, Building2, Search, Heart, Sparkles, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function BloodAvailabilityPublic() {
  const [inventory, setInventory] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [totalUnits, setTotalUnits] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedComponent, setSelectedComponent] = useState('');
  const [selectedHospital, setSelectedHospital] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/blood-inventory/public'),
      api.get('/hospitals'),
      api.get('/blood-alerts/active').catch(() => ({ data: { alerts: [] } }))
    ]).then(([invRes, hospRes, alertsRes]) => {
      let invList = invRes.data.inventory;
      if (!invList && invRes.data.bloodGroups) {
        invList = [];
        Object.entries(invRes.data.bloodGroups).forEach(([bg, info]) => {
          Object.entries(info.components || {}).forEach(([comp, count]) => {
            invList.push({
              bloodGroup: bg,
              component: comp,
              unitsAvailable: count,
              hospitals: []
            });
          });
        });
      }
      setInventory(invList || []);
      setTotalUnits(invRes.data.totalAvailableUnits || (invList || []).reduce((acc, i) => acc + (i.unitsAvailable || 0), 0));
      setHospitals(hospRes.data.hospitals || []);
      setActiveAlerts(alertsRes.data.alerts || []);
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const components = ['Packed Red Blood Cells (PRBC)', 'Fresh Frozen Plasma (FFP)', 'Platelets', 'Whole Blood'];

  const filtered = inventory.filter(item => {
    if (selectedGroup && item.bloodGroup !== selectedGroup) return false;
    if (selectedComponent && item.component !== selectedComponent) return false;
    if (selectedHospital) {
      const match = item.hospitals?.find(h => h.hospitalId === selectedHospital || h.name === selectedHospital);
      if (!match || match.units <= 0) return false;
    }
    return true;
  });

  // Calculate total units per blood group for top overview
  const groupCounts = {};
  bloodGroups.forEach(bg => {
    groupCounts[bg] = inventory
      .filter(i => i.bloodGroup === bg)
      .reduce((acc, curr) => acc + (curr.unitsAvailable || 0), 0);
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded-full text-xs font-bold border border-rose-200 dark:border-rose-900 shadow-sm">
          <Droplet className="w-3.5 h-3.5 fill-rose-500 text-rose-500 animate-pulse" />
          <span>Live Network Blood Inventory</span>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          <span>{totalUnits} Units Ready</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
          Public Blood Availability Portal
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Check real-time stock across Apollo, Fortis, and Max blood banks. All units are voluntary, unpaid, tested for viral markers, and emergency-ready.
        </p>
      </div>

      {/* Quick Summary Bar by Blood Group */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
            Quick Blood Group Breakdown ({totalUnits} Total Units)
          </span>
          <span className="text-[11px] text-slate-400">Click any group to filter</span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {bloodGroups.map(bg => {
            const count = groupCounts[bg] || 0;
            const isSelected = selectedGroup === bg;
            return (
              <button
                key={bg}
                onClick={() => setSelectedGroup(isSelected ? '' : bg)}
                className={`p-3 rounded-2xl border text-center transition ${
                  isSelected
                    ? 'bg-rose-600 text-white border-rose-600 shadow-md scale-105'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-rose-400'
                }`}
              >
                <span className={`text-base font-black block ${isSelected ? 'text-white' : 'text-rose-600 dark:text-rose-400'}`}>
                  {bg}
                </span>
                <span className={`text-lg font-black block my-0.5 ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                  {count}
                </span>
                <span className={`text-[10px] font-semibold uppercase block ${isSelected ? 'text-rose-100' : 'text-slate-400'}`}>
                  Units
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Emergency Blood Shortages Board */}
      {activeAlerts.length > 0 && (
        <div className="bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 p-6 rounded-3xl border-2 border-rose-500/50 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping"></span>
              <h2 className="text-lg font-black text-white flex items-center space-x-1.5">
                <span>Hospital Blood Shortages Needing Voluntary Donors</span>
              </h2>
            </div>
            <span className="text-xs font-bold text-rose-400">Public Live Board</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAlerts.map(alt => (
              <div
                key={alt._id}
                className="bg-white/10 dark:bg-slate-800/80 backdrop-blur-md p-4 rounded-2xl border border-white/10 space-y-2.5 text-xs text-white"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-3xl font-black text-rose-400 block">{alt.bloodGroup}</span>
                    <span className="font-bold text-slate-100">{alt.component}</span>
                    <p className="text-[11px] text-slate-300">{alt.hospitalId?.name}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white uppercase">
                    {alt.urgency}
                  </span>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                  <span>Units Needed: <strong>{alt.unitsNeeded}</strong></span>
                  <span className="text-teal-300 font-semibold">{alt.contactDesk}</span>
                </div>

                <Link
                  to="/lifeshare"
                  className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-center block transition text-xs shadow-md"
                >
                  Step Forward to Donate →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Row */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedGroup('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${selectedGroup === '' ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
          >
            All Groups
          </button>
          {bloodGroups.map(bg => (
            <button
              key={bg}
              onClick={() => setSelectedGroup(bg)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${selectedGroup === bg ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
            >
              {bg}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
          <select
            value={selectedComponent}
            onChange={(e) => setSelectedComponent(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
          >
            <option value="">All Components</option>
            {components.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {hospitals.length > 0 && (
            <select
              value={selectedHospital}
              onChange={(e) => setSelectedHospital(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white"
            >
              <option value="">All Network Hospitals</option>
              {hospitals.map(h => <option key={h._id} value={h._id}>{h.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Grid of Available Units */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
            <div key={n} className="h-40 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-3xl"></div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <Droplet className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 dark:text-slate-300">No Units Found Matching Selection</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try resetting your filters or call the 24/7 blood bank helpline below for urgent cross-match requests.
          </p>
          <button
            onClick={() => { setSelectedGroup(''); setSelectedComponent(''); setSelectedHospital(''); }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((item, idx) => {
            const hospMatch = selectedHospital
              ? item.hospitals?.find(h => h.hospitalId === selectedHospital || h.name === selectedHospital)
              : null;
            const displayUnits = hospMatch ? hospMatch.units : item.unitsAvailable;

            return (
              <div
                key={idx}
                className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-3 text-center flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-black text-rose-600 dark:text-rose-400">{item.bloodGroup}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tested ✓</span>
                  </div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mt-1 text-left min-h-[32px]">
                    {item.component}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className={`p-2.5 rounded-2xl text-xs font-bold flex items-center justify-center space-x-1.5 ${
                    displayUnits > 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                  }`}>
                    <Droplet className={`w-3.5 h-3.5 ${displayUnits > 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
                    <span>{displayUnits} Units Available</span>
                  </div>

                  {item.hospitals?.length > 0 && !selectedHospital && (
                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 space-y-1 text-left">
                      <span className="font-semibold block text-slate-400">Stock distribution:</span>
                      {item.hospitals.map((h, hIdx) => (
                        <div key={hIdx} className="flex items-center justify-between">
                          <span className="truncate max-w-[120px]">{h.name.split(' ')[0]}</span>
                          <span className="font-bold text-slate-700 dark:text-slate-300">{h.units} units</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Blood Bank Helpline Contacts */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <h3 className="text-xl font-bold flex items-center space-x-2">
            <PhoneCall className="w-5 h-5 text-rose-400" />
            <span>Need Emergency Blood Units?</span>
          </h3>
          <p className="text-xs text-slate-300 max-w-lg">
            Network hospitals maintain 24/7 emergency cross-matching services. Registered LifeShare donors and linked family members receive priority emergency dispatch.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="tel:1066"
            className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            Call Apollo Blood Bank (1066)
          </a>
          <Link
            to="/lifeshare"
            className="px-4 py-2.5 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl transition"
          >
            Join as Voluntary Donor
          </Link>
        </div>
      </div>
    </div>
  );
}
