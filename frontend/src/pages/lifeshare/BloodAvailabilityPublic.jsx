import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Droplet, PhoneCall, Building2, Search, Heart, Sparkles, ArrowRight } from 'lucide-react';

export default function BloodAvailabilityPublic() {
  const [inventory, setInventory] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedComponent, setSelectedComponent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/blood-inventory/public'),
      api.get('/hospitals')
    ]).then(([invRes, hospRes]) => {
      setInventory(invRes.data.inventory || []);
      setHospitals(hospRes.data.hospitals || []);
    }).catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const components = ['Packed Red Blood Cells (PRBC)', 'Fresh Frozen Plasma (FFP)', 'Platelets', 'Whole Blood'];

  const filtered = inventory.filter(item => {
    if (selectedGroup && item.bloodGroup !== selectedGroup) return false;
    if (selectedComponent && item.component !== selectedComponent) return false;
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded-full text-xs font-bold">
          <Droplet className="w-3.5 h-3.5 fill-rose-500" />
          <span>Live Network Blood Inventory</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white">
          Public Blood Availability Portal
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Check real-time stock across Apollo, Fortis, and Max blood banks. All blood is voluntary, unpaid, and strictly screened.
        </p>
      </div>

      {/* Filter Row */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedGroup('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${selectedGroup === '' ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
          >
            All Blood Groups
          </button>
          {bloodGroups.map(bg => (
            <button
              key={bg}
              onClick={() => setSelectedGroup(bg)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${selectedGroup === bg ? 'bg-rose-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
            >
              {bg}
            </button>
          ))}
        </div>

        <select
          value={selectedComponent}
          onChange={(e) => setSelectedComponent(e.target.value)}
          className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
        >
          <option value="">All Components</option>
          {components.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Grid of Available Units */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
            <div key={n} className="h-32 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-2xl"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((item, idx) => (
            <div
              key={idx}
              className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition space-y-2 text-center"
            >
              <span className="text-3xl font-black text-rose-600 dark:text-rose-400 block">{item.bloodGroup}</span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block truncate">{item.component}</span>
              <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                {item.unitsAvailable} Units Available
              </div>
            </div>
          ))}
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
