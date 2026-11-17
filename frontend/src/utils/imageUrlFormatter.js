/**
 * Helper untuk memformat dan me-resolve URL gambar soal / opsi jawaban
 * Mendukung akses via localhost, IP LAN WiFi (192.168.x.x), dan production VPS (HTTPS).
 * Menggunakan extensionless stream endpoint (/api/exams/image-stream/?file=...)
 * agar 100% lolos dari intersepsi regex berkas statis Nginx (location ~* \.(jpg|png|webp)).
 */
export const resolveImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';

  let cleanUrl = url.trim();
  if (!cleanUrl) return '';

  // 1. Data URL (Base64) atau Blob URL (Pratinjau lokal instan)
  if (cleanUrl.startsWith('data:') || cleanUrl.startsWith('blob:')) {
    return cleanUrl;
  }

  // 2. Jika URL absolut merujuk ke localhost / private IP tapi browser berada di HTTPS,
  // ubah menjadi relative path agar tidak terkena Mixed Content Blocking oleh browser
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    if (cleanUrl.startsWith('http://192.168.') || cleanUrl.startsWith('http://localhost') || cleanUrl.startsWith('http://127.0.0.1')) {
      try {
        const parsed = new URL(cleanUrl);
        cleanUrl = parsed.pathname + parsed.search;
      } catch (e) {
        // Abaikan
      }
    }
  }

  // 3. Ekstrak nama berkas gambar dari URL
  // Contoh: /media/exam_images/excel_img_abc.png, /api/exams/images/xyz.jpg, ?file=abc.png
  let filename = '';
  if (cleanUrl.includes('file=')) {
    try {
      const match = cleanUrl.match(/[?&]file=([^&#]+)/i);
      if (match && match[1]) filename = decodeURIComponent(match[1]);
    } catch (e) {}
  }

  if (!filename) {
    // Ambil segmen terakhir dari pathname sebelum query parameter
    const pathOnly = cleanUrl.split('?')[0].split('#')[0];
    const segments = pathOnly.split('/').filter(Boolean);
    if (segments.length > 0) {
      const lastSeg = segments[segments.length - 1];
      if (/\.(png|jpe?g|gif|webp|svg)$/i.test(lastSeg)) {
        filename = lastSeg;
      }
    }
  }

  // 4. Jika nama berkas gambar valid ditemukan:
  // Buat URL aman berbasis /api/exams/image-stream/?file=...
  // yang TIDAK berakhiran .png di path URI sehingga Nginx TIDAK PERNAH mengiranya static file lokal.
  if (filename) {
    const streamRelPath = `/api/exams/image-stream/?file=${encodeURIComponent(filename)}`;

    if (typeof window !== 'undefined') {
      const isHttps = window.location.protocol === 'https:';
      const hasCustomPort = window.location.port && window.location.port !== '80' && window.location.port !== '443';

      // Lingkungan Lokal Dev Server (Vite port 5173 -> Daphne port 8001)
      if (hasCustomPort && !isHttps) {
        const hostname = window.location.hostname;
        return `http://${hostname}:8001${streamRelPath}`;
      }

      // Lingkungan Production VPS (https://ujian.mentariku.org)
      return streamRelPath;
    }

    return streamRelPath;
  }

  // 5. Fallback URL publik eksternal valid
  if (cleanUrl.startsWith('https://')) {
    return cleanUrl;
  }
  if (cleanUrl.startsWith('http://')) {
    if (typeof window !== 'undefined' && window.location.protocol === 'http:') {
      return cleanUrl;
    }
    try {
      const parsed = new URL(cleanUrl);
      cleanUrl = parsed.pathname + parsed.search;
    } catch (e) {}
  }

  if (!cleanUrl.startsWith('/')) {
    cleanUrl = `/${cleanUrl}`;
  }

  if (typeof window !== 'undefined') {
    const isHttps = window.location.protocol === 'https:';
    const hasCustomPort = window.location.port && window.location.port !== '80' && window.location.port !== '443';
    if (hasCustomPort && !isHttps) {
      const hostname = window.location.hostname;
      return `http://${hostname}:8001${cleanUrl}`;
    }
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
  if (tried >= 4) return; // Hentikan agar tidak terjadi infinite loop

  target.dataset.fallbackTried = String(tried + 1);
  const currentSrc = target.src || '';

  // Ekstrak nama berkas
  let filename = '';
  try {
    const match = currentSrc.match(/[?&]file=([^&#]+)/i);
    if (match && match[1]) {
      filename = decodeURIComponent(match[1]);
    } else {
      const pathOnly = currentSrc.split('?')[0].split('#')[0];
      const segments = pathOnly.split('/').filter(Boolean);
      filename = segments[segments.length - 1] || '';
    }
  } catch (err) {}

  if (!filename) return;

  if (currentSrc.includes('/image-stream/')) {
    // Fallback 1: Coba rute langsung /api/exams/images/<filename>
    target.src = currentSrc.split('/api/')[0] + `/api/exams/images/${filename}`;
  } else if (currentSrc.includes('/api/exams/images/')) {
    // Fallback 2: Coba rute /api/media/exam_images/<filename>
    target.src = currentSrc.split('/api/')[0] + `/api/media/exam_images/${filename}`;
  } else if (currentSrc.includes('/api/media/')) {
    // Fallback 3: Coba rute standar /media/exam_images/<filename>
    target.src = currentSrc.split('/api/')[0] + `/media/exam_images/${filename}`;
  }
};

