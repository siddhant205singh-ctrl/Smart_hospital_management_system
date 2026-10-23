import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import './i18n/i18n';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import { ThemeA11yProvider } from './contexts/ThemeA11yContext';
import { ToastProvider } from './contexts/ToastContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeA11yProvider>
        <AuthProvider>
          <SocketProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </SocketProvider>
        </AuthProvider>
      </ThemeA11yProvider>
    </BrowserRouter>
  </React.StrictMode>
);
