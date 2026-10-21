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
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('smartcare_token', res.data.accessToken);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    localStorage.setItem('smartcare_token', res.data.accessToken);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('smartcare_token');
    setUser(null);
  };

  const updateProfile = async (updates) => {
    const res = await api.put('/auth/profile', updates);
    setUser(prev => ({ ...prev, ...res.data.user }));
    return res.data;
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
      register,
      logout,
      updateProfile,
      quickSwitchDemoRole,
      isAuthenticated: !!user,
      isPatient: user?.role === 'patient',
      isDoctor: user?.role === 'doctor',
      isAdmin: user?.role === 'admin',
      isReceptionist: user?.role === 'receptionist',
      isBloodOfficer: user?.role === 'blood_bank_officer'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
