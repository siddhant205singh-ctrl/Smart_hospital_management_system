import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  Activity,
  Clock,
  Shield,
  Heart,
  Droplet,
  Users,
  Search,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Building2,
  Calendar,
  PhoneCall,
  Bell,
  FileText,
  ShieldAlert
} from 'lucide-react';
import EmergencyIntakeModal from '../../components/emergency/EmergencyIntakeModal';

export default function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [bloodStock, setBloodStock] = useState([]);
  const [searchDoctor, setSearchDoctor] = useState('');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);

  useEffect(() => {
    api.get('/hospitals')
      .then(res => setHospitals(res.data.hospitals || []))
      .catch(err => console.log(err));

    api.get('/blood-inventory/public')
      .then(res => {
        let inv = res.data.inventory;
        if (!inv && res.data.bloodGroups) {
          inv = [];
          Object.entries(res.data.bloodGroups).forEach(([bg, info]) => {
            Object.entries(info.components || {}).forEach(([comp, count]) => {
              inv.push({ bloodGroup: bg, component: comp, unitsAvailable: count });
            });
          });
        }
        setBloodStock(inv || []);
      })
      .catch(err => console.log(err));
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    navigate(`/doctors?search=${encodeURIComponent(searchDoctor)}`);
  };

  return (
    <div className="space-y-12 sm:space-y-20 pb-16">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-6 sm:pt-12 pb-12 sm:pb-20 bg-gradient-to-b from-teal-500/10 via-cyan-500/5 to-transparent">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-6 sm:space-y-8 text-center flex flex-col items-center">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-teal-100/80 dark:bg-teal-950/80 border border-teal-300 dark:border-teal-700 text-teal-800 dark:text-teal-200 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping"></span>
              <span>{t('hero.badge')}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.15] max-w-4xl">
              {t('hero.title')}{' '}
              <span className="bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-600 bg-clip-text text-transparent">
                {t('hero.titleHighlight')}
              </span>
            </h1>

            <p className="text-sm sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              {t('hero.subtitle')}
            </p>

            {/* Doctor Search Bar (Responsive flex) */}
            <form onSubmit={handleSearchSubmit} className="w-full max-w-2xl flex flex-col sm:flex-row items-stretch sm:items-center bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 gap-2 sm:gap-0">
              <div className="flex items-center flex-1 px-3">
                <Search className="w-5 h-5 text-teal-600 flex-shrink-0" />
                <input
                  type="text"
                  value={searchDoctor}
                  onChange={(e) => setSearchDoctor(e.target.value)}
                  placeholder="Search doctor, specialty (e.g. Cardiology)..."
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-transparent border-none text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition text-center"
              >
                Search
              </button>
            </form>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEmergencyModal(true)}
                className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center justify-center space-x-1.5 animate-pulse"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Emergency Triage</span>
              </button>
              <Link
                to="/doctors"
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-600/25 transition flex items-center justify-center space-x-2"
              >
                <span>{t('hero.ctaBook')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/my-queue"
                className="px-6 py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-2"
              >
                <Clock className="w-4 h-4 text-teal-600" />
                <span>{t('hero.ctaQueue')}</span>
              </Link>
              <Link
                to="/lifeshare"
                className="px-6 py-3 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5"
              >
                <Droplet className="w-4 h-4 fill-rose-500" />
                <span>{t('hero.ctaDonor')}</span>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-y-2 gap-x-4 sm:gap-x-6 text-[11px] sm:text-xs text-slate-500">
              <span className="flex items-center space-x-1.5">
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
                <span>Consent Governed</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />
                <span>100% Voluntary Blood</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. THREE CONNECTED HOSPITALS NETWORK */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
          <span className="text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">
            Connected Healthcare Ecosystem
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            One Search Across 3 Premier Hospitals
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            SmartCare unifies doctor schedules, live waiting queues, and life-saving blood banks into a single patient view.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {hospitals.map((h) => (
            <div
              key={h._id}
              className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md hover:shadow-xl transition-all duration-300 group"
            >
              <div className="h-44 overflow-hidden relative">
                <img
                  src={h.image || 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80'}
                  alt={h.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-md">
                  Active Network Node
                </div>
              </div>
              <div className="p-6 space-y-3">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{h.name}</h3>
                <p className="text-xs text-slate-500 flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                  <span>{h.address?.street}, {h.city}</span>
                </p>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-500">Emergency: <strong>{h.emergencyContact}</strong></span>
                  <Link
                    to={`/doctors?hospitalId=${h._id}`}
                    className="font-bold text-teal-600 hover:text-teal-700 flex items-center space-x-1"
                  >
                    <span>View Doctors</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. LIFESHARE VOLUNTARY BLOOD DONOR SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-rose-900 via-rose-800 to-slate-900 text-white p-6 sm:p-12 shadow-2xl relative overflow-hidden">
          {/* Watermark icon */}
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
            <Droplet className="w-96 h-96 fill-white" />
          </div>

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-rose-500/30 border border-rose-400/40 text-rose-200 text-xs font-bold">
              <Droplet className="w-3.5 h-3.5 fill-rose-300" />
              <span>LifeShare Voluntary Donor Program</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
              Donate Blood. Save Lives. Protect Your Family.
            </h2>

            <p className="text-xs sm:text-base text-rose-100 leading-relaxed">
              We honor 100% voluntary, unpaid blood donors with official milestone badges, thank-you certificates, and Donor Family Fast-Track benefits (waived processing fees & expedited paperwork) during clinical emergencies.
            </p>

            {/* <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 pt-3 sm:pt-4">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
                <span className="text-lg sm:text-xl font-black block">1st Gift</span>
                <span className="text-[11px] sm:text-xs text-rose-200">First Blood Gift</span>
              </div>
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
                <span className="text-lg sm:text-xl font-black block">3+ Gifts</span>
                <span className="text-[11px] sm:text-xs text-rose-200">Dedicated Life Saver</span>
              </div>
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
                <span className="text-lg sm:text-xl font-black block text-amber-300">5+ Gifts</span>
                <span className="text-[11px] sm:text-xs text-amber-200">Bronze Shield</span>
              </div>
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/10">
                <span className="text-lg sm:text-xl font-black block text-cyan-300">10+ Gifts</span>
                <span className="text-[11px] sm:text-xs text-cyan-200">Gold Star Honor</span>
              </div>
            </div> */}

            <div className="pt-3 sm:pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
              <Link
                to="/lifeshare"
                className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg transition text-center"
              >
                Register as Voluntary Donor
              </Link>
              <Link
                to="/blood-availability"
                className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs rounded-xl transition text-center"
              >
                View Live Blood Stock
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CORE FEATURES GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">
            Engineered for Humanity
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Why SmartCare Outperforms Traditional Portals
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition">
            <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-teal-600 mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Dynamic Wait Engine</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Considers a rolling average of actual consultation durations per doctor. Pushes real-time updates through Socket.IO whenever consultations start, end, or patients cancel.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition">
            <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-950 flex items-center justify-center text-cyan-600 mb-4">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Continuous Health Timeline</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              One chronological stream of prescriptions, lab reports, AI report summaries, and blood donation milestones. Protected by a granular, patient-controlled consent manager.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 flex items-center justify-center text-rose-600 mb-4">
              <ShieldAlert className="w-6 h-6 text-rose-600" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">Emergency Response & Break-Glass</h3>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Rules-based clinical triage with direct 112 calling, auto-attached patient health snapshots, and cryptographically logged 24-hour break-glass access for emergency resuscitations.
            </p>
          </div>
        </div>
      </section>

      {/* Emergency Intake Modal */}
      <EmergencyIntakeModal
        isOpen={showEmergencyModal}
        onClose={() => setShowEmergencyModal(false)}
      />
    </div>
  );
}
