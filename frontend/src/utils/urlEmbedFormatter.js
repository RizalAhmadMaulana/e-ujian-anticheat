/**
 * Utility Helper: Format & Validasi URL Soal Eksternal (Google Forms & Microsoft Forms/Teams)
 */

/**
 * Memvalidasi apakah URL merupakan URL ujian eksternal yang valid
 * @param {string} url - URL yang akan diperiksa
 * @returns {boolean}
 */
export function isValidExamUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  const trimmedUrl = url.trim();
  try {
    const parsed = new URL(trimmedUrl);
    const host = parsed.hostname.toLowerCase();

    // Google Forms
    const isGoogleForms = 
      host.includes('docs.google.com') && parsed.pathname.includes('/forms') ||
      host === 'forms.gle';

    // Microsoft Forms / Teams Forms
    const isMicrosoftForms = 
      host.includes('forms.office.com') || 
      host.includes('forms.cloud.microsoft') ||
      host.includes('teams.microsoft.com');

    return (isGoogleForms || isMicrosoftForms) && (parsed.protocol === 'http:' || parsed.protocol === 'https:');
  } catch {
    return false;
  }
}

/**
 * Mendeteksi tipe penyedia form eksternal
 * @param {string} url 
 * @returns {'GOOGLE_FORMS' | 'MICROSOFT_FORMS' | 'UNKNOWN'}
 */
export function detectFormPlatform(url) {
  if (!url || typeof url !== 'string') return 'UNKNOWN';
  const lower = url.toLowerCase();
  if (lower.includes('docs.google.com/forms') || lower.includes('forms.gle')) {
    return 'GOOGLE_FORMS';
  }
  if (lower.includes('forms.office.com') || lower.includes('forms.cloud.microsoft') || lower.includes('teams.microsoft.com')) {
    return 'MICROSOFT_FORMS';
  }
  return 'UNKNOWN';
}

/**
 * Mengubah URL mentah dari Google Form atau Microsoft Forms menjadi URL iframe embed yang aman
 * @param {string} rawUrl 
 * @returns {string}
 */
export function formatExternalExamUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  
  let trimmed = rawUrl.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    trimmed = 'https://' + trimmed;
  }

  try {
    const urlObj = new URL(trimmed);
    const hostname = urlObj.hostname.toLowerCase();

    // 1. Google Forms
    if (hostname.includes('docs.google.com') && urlObj.pathname.includes('/forms/')) {
      // Ubah path /edit menjadi /viewform jika guru keliru menempelkan URL edit
      let pathname = urlObj.pathname;
      if (pathname.endsWith('/edit')) {
        pathname = pathname.replace(/\/edit$/, '/viewform');
      } else if (!pathname.endsWith('/viewform')) {
        pathname = pathname.replace(/\/?$/, '/viewform');
      }
      urlObj.pathname = pathname;

      // Pastikan embedded=true disematkan
      urlObj.searchParams.set('embedded', 'true');
      return urlObj.toString();
    }

    // 2. Microsoft Forms / Teams Forms
    if (hostname.includes('forms.office.com') || hostname.includes('forms.cloud.microsoft')) {
      // Microsoft Forms embed parameter
      if (!urlObj.searchParams.has('embed')) {
        urlObj.searchParams.set('embed', 'true');
      }
      return urlObj.toString();
    }

    return trimmed;
  } catch (error) {
    console.warn('[urlEmbedFormatter] Gagal mengurai URL:', error);
    return rawUrl;
  }
}

