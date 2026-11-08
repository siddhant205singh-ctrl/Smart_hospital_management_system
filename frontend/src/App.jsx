import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import MobileBottomNav from './components/layout/MobileBottomNav';
import SmartCareChatWidget from './components/chatbot/SmartCareChatWidget';
import RoleDashboardRouter from './components/auth/RoleDashboardRouter';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Pages
import LandingPage from './pages/landing/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterHubPage from './pages/auth/RegisterHubPage';
import RegisterWizardPage from './pages/auth/RegisterWizardPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';
import AccountStatusPage from './pages/auth/AccountStatusPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import SuperAdminApprovalsPage from './pages/admin/SuperAdminApprovalsPage';
import DoctorDirectory from './pages/patient/DoctorDirectory';
import LiveQueueTrackerPage from './pages/patient/LiveQueueTrackerPage';
import HealthTimelinePage from './pages/patient/HealthTimelinePage';
import ConsentManagerPage from './pages/patient/ConsentManagerPage';
import PatientDashboard from './pages/patient/PatientDashboard';
import LifeSharePortal from './pages/lifeshare/LifeSharePortal';
import BloodAvailabilityPublic from './pages/lifeshare/BloodAvailabilityPublic';
import LegalPolicyLifeShare from './pages/lifeshare/LegalPolicyLifeShare';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import BloodBankDashboard from './pages/lifeshare/BloodBankDashboard';
import HospitalDashboard from './pages/hospital/HospitalDashboard';
import WaitingRoomDisplayPage from './pages/public/WaitingRoomDisplayPage';
import UserProfilePage from './pages/profile/UserProfilePage';
import DoctorEmergencyViewPage from './pages/doctor/DoctorEmergencyViewPage';
import FullAssistantPage from './pages/ai/FullAssistantPage';

export default function App() {
  const location = useLocation();
  const isDisplayScreen = location.pathname === '/waiting-room-display';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans selection:bg-teal-500 selection:text-white">
      {!isDisplayScreen && <Navbar />}

      <main className="flex-1 pb-16 md:pb-0">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterHubPage />} />
          <Route path="/register/:role" element={<RegisterWizardPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/account-status" element={<AccountStatusPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/super-admin/approvals" element={<SuperAdminApprovalsPage />} />
          <Route path="/doctors" element={<DoctorDirectory />} />
          <Route path="/my-queue" element={<LiveQueueTrackerPage />} />
          <Route path="/health-timeline" element={<HealthTimelinePage />} />
          <Route path="/consent" element={<ConsentManagerPage />} />
          
          {/* Role-governed Dashboards */}
          <Route path="/dashboard" element={<RoleDashboardRouter />} />
          <Route path="/patient-dashboard" element={<ProtectedRoute allowedRoles={['patient']}><PatientDashboard /></ProtectedRoute>} />
          <Route path="/doctor-console" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorDashboard /></ProtectedRoute>} />
          <Route path="/doctor-dashboard" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorDashboard /></ProtectedRoute>} />
          <Route path="/blood-bank-officer" element={<ProtectedRoute allowedRoles={['blood_bank_officer']}><BloodBankDashboard /></ProtectedRoute>} />
          <Route path="/blood-officer-dashboard" element={<ProtectedRoute allowedRoles={['blood_bank_officer']}><BloodBankDashboard /></ProtectedRoute>} />
          <Route path="/hospital-dashboard" element={<ProtectedRoute allowedRoles={['admin', 'hospital_admin', 'receptionist', 'hospital']}><HospitalDashboard /></ProtectedRoute>} />
          <Route path="/admin-overview" element={<ProtectedRoute allowedRoles={['admin', 'hospital_admin', 'receptionist', 'hospital']}><HospitalDashboard /></ProtectedRoute>} />

          {/* LifeShare & Emergency */}
          <Route path="/lifeshare" element={<LifeSharePortal />} />
          <Route path="/blood-availability" element={<BloodAvailabilityPublic />} />
          <Route path="/legal-policy" element={<LegalPolicyLifeShare />} />
          <Route path="/waiting-room-display" element={<WaitingRoomDisplayPage />} />
          <Route path="/my-profile" element={<UserProfilePage />} />
          <Route path="/emergency-desk" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorEmergencyViewPage /></ProtectedRoute>} />
          <Route path="/ai-assistant" element={<FullAssistantPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!isDisplayScreen && <SmartCareChatWidget />}
      {!isDisplayScreen && <Footer />}
      {!isDisplayScreen && <MobileBottomNav />}
    </div>
  );
}
