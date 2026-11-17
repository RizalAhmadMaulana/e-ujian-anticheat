/**
 * Helper untuk memformat dan me-resolve URL gambar soal / opsi jawaban
 * Mendukung akses via localhost, IP LAN WiFi (192.168.x.x), dan production VPS.
 */
export const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }

  // Jika terdapat konfigurasi VITE_API_BASE_URL (misal http://192.168.1.74:8001/api atau https://ujian.mentariku.org/api)
  const apiBase = import.meta.env?.VITE_API_BASE_URL || '';
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    try {
      const urlObj = new URL(apiBase);
      const origin = urlObj.origin;
      return url.startsWith('/') ? `${origin}${url}` : `${origin}/${url}`;
    } catch (e) {
      // Fallback
    }
  }

  // Jika dijalankan di browser
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    // Jika pada localhost/LAN dengan port custom (misal vite 5173 -> backend 8001)
    if (window.location.port && window.location.port !== '80' && window.location.port !== '443') {
      const backendBase = `${protocol}//${hostname}:8001`;
      return url.startsWith('/') ? `${backendBase}${url}` : `${backendBase}/${url}`;
    }
    // Jika pada VPS / Production Nginx (port 80/443 standar)
    return url.startsWith('/') ? url : `/${url}`;
  }

  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const backendBase = `http://${host}:8001`;
  return url.startsWith('/') ? `${backendBase}${url}` : `${backendBase}/${url}`;
};

