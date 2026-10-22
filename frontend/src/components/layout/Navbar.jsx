import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useThemeA11y } from '../../contexts/ThemeA11yContext';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  Heart,
  Activity,
  Bell,
  Sun,
  Moon,
  Type,
  Globe,
  User,
  LogOut,
  Droplet,
  Clock,
  Sparkles,
  ChevronDown,
  Menu,
  X,
  Stethoscope,
  Building2,
  FileText,
  ShieldCheck,
  Scale
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, quickSwitchDemoRole } = useAuth();
  const { darkMode, toggleDarkMode, largeFont, toggleLargeFont, currentLanguage, changeLanguage } = useThemeA11y();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      api.get('/notifications')
        .then(res => {
          setNotifications(res.data.notifications || []);
          setUnreadCount(res.data.unreadCount || 0);
        })
        .catch(err => console.log('Notice error:', err.message));
    }
  }, [user]);

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowUserMenu(false);
    setShowNotifications(false);
  }, [location.pathname]);

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 shadow-sm">
      {/* Top Demo Bar for Judges (Horizontally scrollable on mobile) */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-700 px-3 sm:px-4 py-1.5 text-xs text-white overflow-x-auto no-scrollbar">
        <div className="min-w-max flex items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/20 text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
              3 Connected Hospitals Live
            </span>
            <span className="hidden sm:inline text-teal-100 text-[11px]">Dynamic Wait Engine & LifeShare Active</span>
          </div>

          <div className="flex items-center space-x-1.5 text-[11px]">
            <span className="text-teal-200 font-medium text-[10px] sm:text-[11px]">Quick Demo:</span>
            <button
              onClick={() => quickSwitchDemoRole('patient@smartcare.hospital')}
              className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 transition text-white font-medium text-[10px] sm:text-[11px]"
            >
              Patient
            </button>
            <button
              onClick={() => quickSwitchDemoRole('doctor1@smartcare.hospital')}
              className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 transition text-white font-medium text-[10px] sm:text-[11px]"
            >
              Doctor
            </button>
            <button
              onClick={() => quickSwitchDemoRole('admin@smartcare.hospital')}
              className="px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 transition text-white font-medium text-[10px] sm:text-[11px]"
            >
              Admin
            </button>
            <button
              onClick={() => quickSwitchDemoRole('bloodofficer@smartcare.hospital')}
              className="px-2 py-0.5 rounded bg-rose-500/90 hover:bg-rose-500 transition text-white font-medium text-[10px] sm:text-[11px]"
            >
              Blood Officer
            </button>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-2 sm:space-x-2.5 group">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform flex-shrink-0">
            <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-1 sm:space-x-1.5">
              <span className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-teal-700 to-teal-500 dark:from-teal-400 dark:to-cyan-400 bg-clip-text text-transparent">
                SmartCare
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 rounded border border-teal-200 dark:border-teal-800 hidden xs:inline-block">
                AI + Queue
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 leading-none hidden sm:block">Smart Hospital Network</p>
          </div>
        </Link>

        {/* Center Nav Links (Desktop) */}
        <nav className="hidden md:flex items-center space-x-1 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Link to="/doctors" className="px-3 py-2 rounded-lg hover:text-teal-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
            {t('nav.doctors')}
          </Link>
          <Link to="/lifeshare" className="px-3 py-2 rounded-lg hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition flex items-center space-x-1">
            <Droplet className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span>LifeShare</span>
          </Link>
          <Link to="/blood-availability" className="px-3 py-2 rounded-lg hover:text-teal-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
            {t('nav.bloodBank')}
          </Link>
          {user && (
            <>
              {user.role === 'patient' && (
                <>
                  <Link to="/my-queue" className="px-3 py-2 rounded-lg text-teal-600 font-semibold hover:bg-teal-50 dark:hover:bg-teal-950/40 transition flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{t('nav.myQueue')}</span>
                  </Link>
                  <Link to="/health-timeline" className="px-3 py-2 rounded-lg hover:text-teal-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                    {t('nav.timeline')}
                  </Link>
                  <Link to="/consent" className="px-3 py-2 rounded-lg hover:text-teal-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                    {t('nav.consent')}
                  </Link>
                </>
              )}
              {user.role === 'doctor' && (
                <Link to="/doctor-console" className="px-3 py-2 rounded-lg font-semibold text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition">
                  Doctor Console
                </Link>
              )}
              {(user.role === 'admin' || user.role === 'receptionist') && (
                <Link to="/admin-overview" className="px-3 py-2 rounded-lg font-semibold text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition">
                  Hospital Command
                </Link>
              )}
              {user.role === 'blood_bank_officer' && (
                <Link to="/blood-bank-officer" className="px-3 py-2 rounded-lg font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition">
                  Blood Bank Console
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Right Tools & Profile */}
        <div className="flex items-center space-x-1 sm:space-x-2">
          {/* Language Switcher */}
          <div className="relative group">
            <button
              className="p-1.5 sm:p-2 text-slate-600 hover:text-teal-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center space-x-1 text-xs"
              title="Change Language"
            >
              <Globe className="w-4 h-4" />
              <span className="uppercase font-semibold text-[10px] sm:text-xs">{currentLanguage}</span>
            </button>
            <div className="absolute right-0 mt-1 w-32 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 hidden group-hover:block z-50">
              <button
                onClick={() => changeLanguage('en')}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-teal-50 dark:hover:bg-teal-950/50 ${currentLanguage === 'en' ? 'font-bold text-teal-600' : ''}`}
              >
                English
              </button>
              <button
                onClick={() => changeLanguage('hi')}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-teal-50 dark:hover:bg-teal-950/50 ${currentLanguage === 'hi' ? 'font-bold text-teal-600' : ''}`}
              >
                हिन्दी (Hindi)
              </button>
              <button
                onClick={() => changeLanguage('bn')}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-teal-50 dark:hover:bg-teal-950/50 ${currentLanguage === 'bn' ? 'font-bold text-teal-600' : ''}`}
              >
                বাংলা (Bengali)
              </button>
            </div>
          </div>

          {/* Large Font Toggle (Desktop only) */}
          <button
            onClick={toggleLargeFont}
            className={`hidden sm:flex p-2 rounded-lg transition text-xs font-bold ${largeFont ? 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
            title="Toggle Large Font Mode"
          >
            <Type className="w-4 h-4" />
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-1.5 sm:p-2 text-slate-600 hover:text-teal-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Toggle Dark Mode"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications Dropdown */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-1.5 sm:p-2 text-slate-600 hover:text-teal-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
                )}
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 max-h-96 overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 z-50">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-700 px-2">
                    <span className="font-semibold text-xs text-slate-700 dark:text-slate-200">Alerts & Queue Updates</span>
                    <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-bold">{unreadCount} new</span>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 p-3 text-center">No notifications</p>
                  ) : (
                    notifications.map(n => (
                      <div
                        key={n._id}
                        onClick={() => handleMarkAsRead(n._id)}
                        className={`p-2.5 rounded-lg mb-1 cursor-pointer transition text-xs ${n.isRead ? 'opacity-60 bg-slate-50 dark:bg-slate-900/50' : 'bg-teal-50/70 dark:bg-teal-950/40 border-l-2 border-teal-500'}`}
                      >
                        <p className="font-semibold text-slate-800 dark:text-slate-100">{n.title}</p>
                        <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">{n.message}</p>
                        <span className="text-[10px] text-slate-400 mt-1 block">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* User Profile / Auth State (Desktop) */}
          {user ? (
            <div className="relative hidden md:block">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <img
                  src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0d9488&color=fff`}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover border border-teal-400"
                />
                <div className="hidden lg:block text-left text-xs leading-tight">
                  <span className="font-semibold text-slate-800 dark:text-slate-100 block">{user.name}</span>
                  <span className="text-[10px] capitalize text-teal-600 dark:text-teal-400 font-medium">{user.role}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                    <p className="font-semibold text-slate-800 dark:text-slate-100">{user.name}</p>
                    <p className="text-slate-400 text-[11px] truncate">{user.email}</p>
                  </div>
                  <Link
                    to="/dashboard"
                    onClick={() => setShowUserMenu(false)}
                    className="block px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-200"
                  >
                    User Dashboard
                  </Link>
                  <button
                    onClick={() => { setShowUserMenu(false); logout(); navigate('/'); }}
                    className="w-full text-left px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-medium flex items-center space-x-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t('nav.logout')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center space-x-2">
              <Link
                to="/login"
                className="px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950 rounded-lg transition"
              >
                {t('nav.login')}
              </Link>
              <Link
                to="/register"
                className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm shadow-teal-500/30 transition"
              >
                {t('nav.register')}
              </Link>
            </div>
          )}

          {/* Hamburger Menu Button (Mobile) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-teal-600" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Slide-out Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white/98 dark:bg-slate-900/98 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-2xl px-4 py-4 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-top-2 duration-200">
          {/* User Profile Header if logged in */}
          {user ? (
            <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-2xl flex items-center justify-between border border-teal-200 dark:border-teal-800">
              <div className="flex items-center space-x-3">
                <img
                  src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0d9488&color=fff`}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover border border-teal-500"
                />
                <div>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white">{user.name}</h4>
                  <span className="text-[10px] capitalize text-teal-600 dark:text-teal-400 font-semibold">{user.role}</span>
                </div>
              </div>
              <button
                onClick={() => { logout(); setMobileMenuOpen(false); navigate('/'); }}
                className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 text-center text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950 rounded-xl"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="py-2.5 text-center text-xs font-bold text-white bg-teal-600 rounded-xl shadow-sm"
              >
                Register
              </Link>
            </div>
          )}

          {/* Navigation Links List */}
          <div className="space-y-1 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Link
              to="/doctors"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Stethoscope className="w-4 h-4 text-teal-600" />
              <span>Find Doctors & Book</span>
            </Link>

            <Link
              to="/my-queue"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-teal-600 font-bold"
            >
              <Clock className="w-4 h-4" />
              <span>Live Queue Tracker & Turn</span>
            </Link>

            <Link
              to="/lifeshare"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-rose-600"
            >
              <Droplet className="w-4 h-4 fill-rose-500" />
              <span>LifeShare Blood Donor Program</span>
            </Link>

            <Link
              to="/blood-availability"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Building2 className="w-4 h-4 text-teal-600" />
              <span>Public Blood Stock & Helplines</span>
            </Link>

            <Link
              to="/health-timeline"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <FileText className="w-4 h-4 text-cyan-600" />
              <span>Health Timeline & Prescriptions</span>
            </Link>

            <Link
              to="/consent"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2.5 p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              <span>Consent & Privacy Manager</span>
            </Link>

            {/* Role Consoles */}
            {user?.role === 'doctor' && (
              <Link
                to="/doctor-console"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold"
              >
                <Activity className="w-4 h-4" />
                <span>Doctor Consultation Console</span>
              </Link>
            )}

            {(user?.role === 'admin' || user?.role === 'receptionist') && (
              <Link
                to="/admin-overview"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-bold"
              >
                <Building2 className="w-4 h-4" />
                <span>Hospital Command Center</span>
              </Link>
            )}

            {user?.role === 'blood_bank_officer' && (
              <Link
                to="/blood-bank-officer"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center space-x-2.5 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold"
              >
                <Droplet className="w-4 h-4" />
                <span>Blood Bank Officer Desk</span>
              </Link>
            )}

            <Link
              to="/legal-policy"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-2.5 p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-[11px]"
            >
              <Scale className="w-4 h-4" />
              <span>NBTC Compliance & Policy Charter</span>
            </Link>
          </div>

          {/* Mobile Tools (Font toggle + Language quick buttons) */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <button
              onClick={toggleLargeFont}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1 ${
                largeFont ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Large Font Mode</span>
            </button>

            <div className="flex items-center space-x-1 font-bold text-xs">
              <button
                onClick={() => changeLanguage('en')}
                className={`px-2 py-1 rounded-lg ${currentLanguage === 'en' ? 'bg-teal-600 text-white' : 'text-slate-500'}`}
              >
                EN
              </button>
              <button
                onClick={() => changeLanguage('hi')}
                className={`px-2 py-1 rounded-lg ${currentLanguage === 'hi' ? 'bg-teal-600 text-white' : 'text-slate-500'}`}
              >
                HI
              </button>
              <button
                onClick={() => changeLanguage('bn')}
                className={`px-2 py-1 rounded-lg ${currentLanguage === 'bn' ? 'bg-teal-600 text-white' : 'text-slate-500'}`}
              >
                BN
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
