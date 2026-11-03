import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('smartcare_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
      } catch (err) {
        console.error('[AuthContext] Load user error:', err.message);
        localStorage.removeItem('smartcare_token');
        localStorage.removeItem('smartcare_refresh_token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.requires2FA) {
      return res.data; // Return requires2FA payload so caller can trigger 2FA modal
    }
    if (res.data.accessToken) {
      localStorage.setItem('smartcare_token', res.data.accessToken);
    }
    if (res.data.refreshToken) {
      localStorage.setItem('smartcare_refresh_token', res.data.refreshToken);
    }
    setUser(res.data.user);
    return res.data;
  };

  const complete2faLogin = async (email, otp) => {
    const res = await api.post('/auth/login/verify-2fa', { email, otp });
    if (res.data.accessToken) {
      localStorage.setItem('smartcare_token', res.data.accessToken);
    }
    if (res.data.refreshToken) {
      localStorage.setItem('smartcare_refresh_token', res.data.refreshToken);
    }
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('smartcare_refresh_token');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (e) {
      console.warn('[Logout] Error revoking token:', e.message);
    } finally {
      localStorage.removeItem('smartcare_token');
      localStorage.removeItem('smartcare_refresh_token');
      setUser(null);
    }
  };

  const updateProfile = async (updates) => {
    const res = await api.put('/auth/profile', updates);
    setUser(prev => ({ ...prev, ...res.data.user }));
    return res.data;
  };

  const setAuthTokens = (userData, accessToken, refreshToken) => {
    if (accessToken) localStorage.setItem('smartcare_token', accessToken);
    if (refreshToken) localStorage.setItem('smartcare_refresh_token', refreshToken);
    setUser(userData);
  };

  // Quick switch for presentation demo (one-click role test)
  const quickSwitchDemoRole = async (email) => {
    return await login(email, 'Password123!');
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      complete2faLogin,
      logout,
      updateProfile,
      setAuthTokens,
      quickSwitchDemoRole,
      isAuthenticated: !!user,
      isPatient: user?.role === 'patient',
      isDoctor: user?.role === 'doctor',
      isAdmin: user?.role === 'admin' || user?.role === 'hospital_admin',
      isHospitalAdmin: user?.role === 'hospital_admin' || user?.role === 'admin',
      isSuperAdmin: user?.role === 'super_admin',
      isReceptionist: user?.role === 'receptionist',
      isBloodOfficer: user?.role === 'blood_bank_officer'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
