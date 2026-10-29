/**
 * Helper untuk memformat dan me-resolve URL gambar soal / opsi jawaban
 * Mendukung akses via localhost, IP LAN WiFi (192.168.x.x), dan production VPS.
 */
export const resolveImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const backendBase = `http://${host}:8001`;
  return url.startsWith('/') ? `${backendBase}${url}` : `${backendBase}/${url}`;
};

