import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PatientDashboard from '../../pages/patient/PatientDashboard';
import DoctorDashboard from '../../pages/doctor/DoctorDashboard';
import BloodBankDashboard from '../../pages/lifeshare/BloodBankDashboard';
import HospitalDashboard from '../../pages/hospital/HospitalDashboard';

export default function RoleDashboardRouter() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center space-x-2 text-teal-600 font-bold text-sm">
          <div className="w-3 h-3 rounded-full bg-teal-600 animate-ping"></div>
          <span>Loading your personalized dashboard...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'doctor':
      return <DoctorDashboard />;
    case 'blood_bank_officer':
      return <BloodBankDashboard />;
    case 'super_admin':
      return <Navigate to="/super-admin/approvals" replace />;
    case 'admin':
    case 'hospital_admin':
    case 'hospital':
    case 'receptionist':
      return <HospitalDashboard />;
    case 'patient':
    default:
      return <PatientDashboard />;
  }
}
