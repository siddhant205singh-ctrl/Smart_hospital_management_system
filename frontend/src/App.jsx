import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import SmartCareChatWidget from './components/chatbot/SmartCareChatWidget';

// Pages
import LandingPage from './pages/landing/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DoctorDirectory from './pages/patient/DoctorDirectory';
import LiveQueueTrackerPage from './pages/patient/LiveQueueTrackerPage';
import HealthTimelinePage from './pages/patient/HealthTimelinePage';
import ConsentManagerPage from './pages/patient/ConsentManagerPage';
import PatientDashboard from './pages/patient/PatientDashboard';
import LifeSharePortal from './pages/lifeshare/LifeSharePortal';
import BloodAvailabilityPublic from './pages/lifeshare/BloodAvailabilityPublic';
import LegalPolicyLifeShare from './pages/lifeshare/LegalPolicyLifeShare';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import BloodBankDashboard from './pages/lifeshare/BloodBankDashboard';
import WaitingRoomDisplayPage from './pages/public/WaitingRoomDisplayPage';
import FullAssistantPage from './pages/ai/FullAssistantPage';

export default function App() {
  const location = useLocation();
  const isDisplayScreen = location.pathname === '/waiting-room-display';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans selection:bg-teal-500 selection:text-white">
      {!isDisplayScreen && <Navbar />}

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/doctors" element={<DoctorDirectory />} />
          <Route path="/my-queue" element={<LiveQueueTrackerPage />} />
          <Route path="/health-timeline" element={<HealthTimelinePage />} />
          <Route path="/consent" element={<ConsentManagerPage />} />
          <Route path="/dashboard" element={<PatientDashboard />} />
          <Route path="/lifeshare" element={<LifeSharePortal />} />
          <Route path="/blood-availability" element={<BloodAvailabilityPublic />} />
          <Route path="/legal-policy" element={<LegalPolicyLifeShare />} />
          <Route path="/doctor-console" element={<DoctorDashboard />} />
          <Route path="/admin-overview" element={<AdminDashboard />} />
          <Route path="/blood-bank-officer" element={<BloodBankDashboard />} />
          <Route path="/waiting-room-display" element={<WaitingRoomDisplayPage />} />
          <Route path="/ai-assistant" element={<FullAssistantPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!isDisplayScreen && <Footer />}
      {!isDisplayScreen && <SmartCareChatWidget />}
    </div>
  );
}
