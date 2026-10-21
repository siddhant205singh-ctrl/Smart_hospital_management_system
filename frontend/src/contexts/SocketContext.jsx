import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socketURL = import.meta.env.VITE_API_URL 
      ? import.meta.env.VITE_API_URL.replace(/\/$/, '') 
      : window.location.origin;

    const newSocket = io(socketURL, {
      path: '/socket.io',
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('[Socket.IO] Connected to server, id:', newSocket.id);
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket.IO] Disconnected');
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const joinDoctorQueue = (doctorId) => {
    if (socket && doctorId) {
      socket.emit('join:doctor_queue', { doctorId });
    }
  };

  const joinPatientQueue = (appointmentId) => {
    if (socket && appointmentId) {
      socket.emit('join:patient_queue', { appointmentId });
    }
  };

  const joinHospitalQueue = (hospitalId) => {
    if (socket && hospitalId) {
      socket.emit('join:hospital_queue', { hospitalId });
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
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
