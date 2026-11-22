import axios from 'axios';

/**
 * Konfigurasi Dasar Axios Client untuk E-Ujian & E-Jurnal
 * Mendukung otomatis:
 * 1. Lingkungan HTTPS Production VPS (ujian.mentariku.org) -> relative path `/api` (Zero Mixed Content, port 443 Nginx reverse proxy)
 * 2. Lingkungan IP LAN / WiFi Sekolah (http://192.168.x.x:8001/api)
 * 3. Lingkungan Dev Lokal (localhost:8001)
 */
export const getBaseApiUrl = () => {
  if (typeof window !== 'undefined') {
    // Jika halaman diakses via HTTPS (cth: production VPS ujian.mentariku.org)
    // SELALU gunakan relative path '/api' agar diproxy langsung oleh Nginx (bebas mixed content & firewall port 8001)
    if (window.location.protocol === 'https:') {
      return '/api';
    }
  }

  // Jika ada environment variable eksplisit (misal saat build khusus)
  if (import.meta.env.VITE_API_BASE_URL) {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && envUrl.startsWith('http://')) {
      return '/api';
    }
    return envUrl;
  }

  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${host}:8001/api`;
};

export const getBaseWsUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.protocol === 'https:') {
      return `wss://${window.location.host}/ws`;
    }
  }

  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }

  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `ws://${host}:8001`;
};

const axiosInstance = axios.create({
  baseURL: getBaseApiUrl(),
  withCredentials: true,
  timeout: 15000,
});

// Request Interceptor: Kalibrasi baseURL & Sisipkan JWT Token jika ada
axiosInstance.interceptors.request.use(
  (config) => {
    // Kalibrasi dinamis jika diakses via HTTPS agar tidak terjadi mixed content ke http://
    if (!config.baseURL || (typeof window !== 'undefined' && window.location.protocol === 'https:' && String(config.baseURL).startsWith('http://'))) {
      config.baseURL = getBaseApiUrl();
    }
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Tangani error 401 (Unauthorized)
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
