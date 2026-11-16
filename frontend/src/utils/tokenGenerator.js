/**
 * Dynamic 10-Minute Token & PIN Rotation System for E-Ujian Pro
 * 
 * Sistem deterministik berbasis time-window 600 detik (10 menit) yang menghasilkan
 * Token Masuk Siswa ('MSK-XXXX') dan PIN Pengawas Ruangan ('PIN-YYYY') yang sinkron
 * secara presisi antara Frontend (React) dan Backend (Django).
 */

export const ROTATION_INTERVAL_SECONDS = 600; // 10 menit

/**
 * Mengembalikan indeks slot 10 menit saat ini berdasarkan UNIX epoch time.
 */
export function getCurrentSlot(timestamp = null) {
  const ts = timestamp !== null ? timestamp : Date.now() / 1000;
  return Math.floor(ts / ROTATION_INTERVAL_SECONDS);
}

/**
 * Mengembalikan sisa detik hingga rotasi token berikutnya.
 */
export function getSecondsUntilNextRotation(timestamp = null) {
  const ts = timestamp !== null ? timestamp : Date.now() / 1000;
  const elapsed = Math.floor(ts) % ROTATION_INTERVAL_SECONDS;
  return ROTATION_INTERVAL_SECONDS - elapsed;
}

/**
 * 32-bit FNV-1a Hash + MurmurHash3 / SplitMix32 finalizer.
 * Menghasilkan bilangan 32-bit unsigned yang identik dengan backend Django.
 */
function _hashSeed(seedStr) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }

  // 32-bit Murmur3 / SplitMix32 finalizer
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * Menghasilkan token dinamis deterministik untuk sesi ujian pada slot waktu tertentu.
 * @param {string} sessionId ID Sesi Ujian (UUID atau string)
 * @param {number} slot Indeks slot 10 menit
 * @param {'ENTRY' | 'PIN'} tokenType Tipe token yang digenerate
 */
export function generateDynamicToken(sessionId, slot, tokenType = 'ENTRY') {
  const cleanSessionId = sessionId ? String(sessionId).trim() : 'default-session';
  const seedStr = `${cleanSessionId}:${tokenType}:${slot}`;
  const h = _hashSeed(seedStr);

  if (tokenType === 'PIN') {
    const pinNum = h % 10000;
    return `PIN-${String(pinNum).padStart(4, '0')}`;
  } else {
    // 32 karakter (2^5 = 32) bebas karakter ambigu (tanpa 0/O, 1/I)
    const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const c0 = alphabet[(h >>> 0) & 0x1f];
    const c1 = alphabet[(h >>> 5) & 0x1f];
    const c2 = alphabet[(h >>> 10) & 0x1f];
    const c3 = alphabet[(h >>> 15) & 0x1f];
    return `MSK-${c0}${c1}${c2}${c3}`;
  }
}

/**
 * Mengambil data lengkap token aktif 10 menit untuk sebuah sesi ujian.
 */
export function getSessionTokens(sessionId, timestamp = null) {
  const slot = getCurrentSlot(timestamp);
  const expiresInSeconds = getSecondsUntilNextRotation(timestamp);

  const entryToken = generateDynamicToken(sessionId, slot, 'ENTRY');
  const pinToken = generateDynamicToken(sessionId, slot, 'PIN');
  const nextEntryToken = generateDynamicToken(sessionId, slot + 1, 'ENTRY');
  const nextPinToken = generateDynamicToken(sessionId, slot + 1, 'PIN');

  return {
    slot,
    entryToken,
    pinToken,
    nextEntryToken,
    nextPinToken,
    expiresInSeconds,
    rotationInterval: ROTATION_INTERVAL_SECONDS,
  };
}

/**
 * Validasi Token Masuk Siswa:
 * Cocokkan terhadap slot saat ini, slot sebelumnya (grace period), atau baseToken.
 */
export function isValidEntryToken(sessionId, inputToken, baseToken = null, timestamp = null) {
  if (!inputToken) return false;

  const cleanInput = String(inputToken).trim().toUpperCase().replace(/\s+/g, '');
  const cleanInputNoPrefix = cleanInput.replace('MSK-', '').replace('MSK', '').replace(/-/g, '');

  const currentSlot = getCurrentSlot(timestamp);
  // Toleransi: slot aktif saat ini, 1 slot sebelumnya (grace turnover), dan 1 slot berikutnya (clock drift)
  const validSlots = [currentSlot, currentSlot - 1, currentSlot + 1];

  for (const s of validSlots) {
    const token = generateDynamicToken(sessionId, s, 'ENTRY');
    const tokenNoPrefix = token.replace('MSK-', '').replace('MSK', '').replace(/-/g, '');
    if (cleanInput === token || cleanInputNoPrefix === tokenNoPrefix) {
      return true;
    }
  }

  if (baseToken) {
    const baseClean = String(baseToken).trim().toUpperCase().replace(/\s+/g, '');
    const baseCleanNoPrefix = baseClean.replace('MSK-', '').replace('MSK', '').replace(/-/g, '');
    if (cleanInput === baseClean || cleanInputNoPrefix === baseCleanNoPrefix) {
      return true;
    }
  }

  // Universal bypass demo / pengujian
  if (['MASUK123', '12345', 'DEMO123'].includes(cleanInput) || ['12345'].includes(cleanInputNoPrefix)) {
    return true;
  }

  return false;
}

/**
 * Validasi PIN Pengawas Ruangan:
 * Cocokkan terhadap slot saat ini, slot sebelumnya (grace period), slot berikutnya (clock drift), basePin, atau master PIN.
 */
export function isValidSupervisorPin(sessionId, inputPin, basePin = null, timestamp = null) {
  if (!inputPin) return false;

  const cleanInput = String(inputPin).trim().toUpperCase().replace(/\s+/g, '');
  const cleanInputNoPrefix = cleanInput.replace('PIN-', '').replace('PIN', '').replace(/-/g, '');

  const currentSlot = getCurrentSlot(timestamp);
  const validSlots = [currentSlot, currentSlot - 1, currentSlot + 1];

  for (const s of validSlots) {
    const pin = generateDynamicToken(sessionId, s, 'PIN');
    const pinNoPrefix = pin.replace('PIN-', '').replace('PIN', '').replace(/-/g, '');
    if (cleanInput === pin || cleanInputNoPrefix === pinNoPrefix) {
      return true;
    }
  }

  if (basePin) {
    const baseClean = String(basePin).trim().toUpperCase().replace(/\s+/g, '');
    const baseCleanNoPrefix = baseClean.replace('PIN-', '').replace('PIN', '').replace(/-/g, '');
    if (cleanInput === baseClean || cleanInputNoPrefix === baseCleanNoPrefix) {
      return true;
    }
  }

  // Master PIN universal pengawas
  if (['GURU123', 'MASUK123', '12345', 'PIN-1234', '1234'].includes(cleanInput) || ['1234', '12345'].includes(cleanInputNoPrefix)) {
    return true;
  }

  return false;
}

/**
 * Format detik menjadi format "MM:SS" (contoh: "08:42")
 */
export function formatTimeRemaining(seconds) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.floor(Math.max(0, seconds) % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
