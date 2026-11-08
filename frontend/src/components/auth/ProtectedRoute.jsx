import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center space-x-2 text-teal-600 font-bold text-sm">
          <div className="w-3 h-3 rounded-full bg-teal-600 animate-ping"></div>
          <span>Verifying secure access credentials...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // If a patient or wrong role tries to open a restricted route, redirect them to their own role dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
