import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Only connect when a user is logged in
    if (!user) {
      // If there's an existing socket, disconnect it
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    // Avoid creating a duplicate connection (handles React StrictMode double-invoke)
    if (socketRef.current && socketRef.current.connected) {
      return;
    }

    const socketURL = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace(/\/$/, '')
      : window.location.origin;

    const newSocket = io(socketURL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      // Send the auth token so the server can identify the user
      auth: { token: localStorage.getItem('smartcare_token') },
      // Reconnect settings
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    newSocket.on('connect', () => {
      console.log('[Socket.IO] Connected:', newSocket.id);
      setConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.warn('[Socket.IO] Connection error:', err.message);
    });

    socketRef.current = newSocket;

    return () => {
      // Cleanup only when user logs out or component truly unmounts
      newSocket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user]); // Re-run only when login/logout happens

  const joinDoctorQueue = (doctorId) => {
    if (socketRef.current && doctorId) {
      socketRef.current.emit('join:doctor_queue', { doctorId });
    }
  };

  const joinPatientQueue = (appointmentId) => {
    if (socketRef.current && appointmentId) {
      socketRef.current.emit('join:patient_queue', { appointmentId });
    }
  };

  const joinHospitalQueue = (hospitalId) => {
    if (socketRef.current && hospitalId) {
      socketRef.current.emit('join:hospital_queue', { hospitalId });
    }
  };

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      connected,
      joinDoctorQueue,
      joinPatientQueue,
      joinHospitalQueue
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
