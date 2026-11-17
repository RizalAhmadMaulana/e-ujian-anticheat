/**
 * Helper untuk memformat dan me-resolve URL gambar soal / opsi jawaban
 * Mendukung akses via localhost, IP LAN WiFi (192.168.x.x), dan production VPS (HTTPS).
 */
export const resolveImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';

  let cleanUrl = url.trim();
  if (!cleanUrl) return '';

  // 1. Data URL (Base64)
  if (cleanUrl.startsWith('data:')) {
    return cleanUrl;
  }

  // 2. Jika URL absolut merujuk ke localhost / private IP tapi browser berada di HTTPS,
  // ubah menjadi relative path agar tidak terkena Mixed Content Blocking oleh browser
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    if (cleanUrl.startsWith('http://192.168.') || cleanUrl.startsWith('http://localhost') || cleanUrl.startsWith('http://127.0.0.1')) {
      try {
        const parsed = new URL(cleanUrl);
        cleanUrl = parsed.pathname;
      } catch (e) {
        // Abaikan
      }
    }
  }

  // 3. Jika URL eksternal publik valid
  if (cleanUrl.startsWith('https://')) {
    return cleanUrl;
  }
  if (cleanUrl.startsWith('http://')) {
    if (typeof window !== 'undefined' && window.location.protocol === 'http:') {
      return cleanUrl;
    }
    try {
      const parsed = new URL(cleanUrl);
      cleanUrl = parsed.pathname;
    } catch (e) {
      // Abaikan
    }
  }

  // 4. Pastikan memiliki leading slash
  if (!cleanUrl.startsWith('/')) {
    cleanUrl = `/${cleanUrl}`;
  }

  // 5. Normalisasi rute media agar lolos proxy Nginx:
  // Di VPS production Nginx, rute /api/ selalu di-proxy_pass ke Daphne (port 8001).
  // Sementara rute /media/ sering kali tidak terdaftar di Nginx dan jatuh ke try_files index.html.
  // Dengan mengarahkan ke /api/media/..., request dijamin 100% sampai ke Django Daphne!
  let apiMediaPath = cleanUrl;
  if (cleanUrl.startsWith('/media/')) {
    apiMediaPath = `/api${cleanUrl}`; // Menjadi /api/media/...
  } else if (!cleanUrl.startsWith('/api/')) {
    apiMediaPath = `/api/media${cleanUrl}`;
  }

  // 6. Evaluasi Lingkungan Eksekusi
  if (typeof window !== 'undefined') {
    const isHttps = window.location.protocol === 'https:';
    const hasCustomPort = window.location.port && window.location.port !== '80' && window.location.port !== '443';

    // A. Lingkungan Lokal Dev Server (Vite port 5173 -> Daphne port 8001)
    if (hasCustomPort && !isHttps) {
      const hostname = window.location.hostname;
      return `http://${hostname}:8001${cleanUrl}`;
    }

    // B. Lingkungan Production VPS (https://ujian.mentariku.org)
    // Gunakan apiMediaPath (/api/media/...) agar lolos reverse proxy Nginx secara sempurna!
    return apiMediaPath;
  }

  return cleanUrl;
};

/**
 * Image Error Fallback Handler
 * Secara otomatis mencoba rute alternatif jika salah satu rute diblokir atau gagal di peramban
 */
export const handleImageErrorFallback = (e) => {
  if (!e || !e.target) return;
  const target = e.target;
  const tried = parseInt(target.dataset.fallbackTried || '0', 10);
  if (tried >= 3) return; // Hentikan agar tidak terjadi infinite loop

  target.dataset.fallbackTried = String(tried + 1);
  const currentSrc = target.src || '';

  if (currentSrc.includes('/api/media/')) {
    // Coba rute langsung endpoint images: /api/exams/images/
    target.src = currentSrc.replace('/api/media/exam_images/', '/api/exams/images/').replace('/api/media/', '/api/exams/images/');
  } else if (currentSrc.includes('/api/exams/images/')) {
    // Coba rute standar /media/
    target.src = currentSrc.replace('/api/exams/images/', '/media/exam_images/');
  } else if (currentSrc.includes('/media/')) {
    // Coba rute /api/media/
    target.src = currentSrc.replace('/media/', '/api/media/');
  }
};

