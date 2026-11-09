import axios from 'axios';

// Determine API base URL: Uses VITE_API_URL if set (production Render), otherwise falls back to local Vite proxy '/api'
const baseURL = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` 
  : '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercept requests to attach JWT access token & handle FormData multipart boundary
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('smartcare_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Automatically unset Content-Type for FormData so browser sets multipart/form-data with boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      if (config.headers.common) {
        delete config.headers.common['Content-Type'];
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Intercept responses for auth errors & seamless refresh token rotation
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt refresh on auth endpoints (login, register, refresh itself)
    if (
      error.response?.status === 401 && 
      !originalRequest._retry && 
      !originalRequest.url.includes('/auth/login') && 
      !originalRequest.url.includes('/auth/refresh') &&
      !originalRequest.url.includes('/auth/register')
    ) {
      const refreshToken = localStorage.getItem('smartcare_refresh_token');
      if (!refreshToken) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
        localStorage.setItem('smartcare_token', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('smartcare_refresh_token', data.refreshToken);
        }
        api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        processQueue(null, data.accessToken);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        localStorage.removeItem('smartcare_token');
        localStorage.removeItem('smartcare_refresh_token');
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const getMediaUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  // If backend base URL is explicitly provided via VITE_API_URL, prepend it (stripping trailing /api or /)
  const envApiUrl = import.meta.env.VITE_API_URL;
  if (envApiUrl) {
    const backendBase = envApiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `${backendBase}${cleanPath}`;
  }
  // Otherwise in local dev with Vite proxying /api and /uploads, return relative path with leading slash
  return url.startsWith('/') ? url : `/${url}`;
};

export default api;
