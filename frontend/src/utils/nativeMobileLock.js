import { Capacitor } from '@capacitor/core';

/**
 * Utility Penguncian Native Android (CapacitorJS Wrapper)
 * Mendukung Mode Kios / ExamBrowser Android:
 * 1. Screen Pinning / Lock Task Mode (startLockTask & stopLockTask)
 * 2. Anti-Screenshot / Privacy Screen (FLAG_SECURE)
 * 3. Fallback cerdas saat berjalan di peramban web desktop/laptop biasa
 */

export const isCapacitorNative = () => {
  return Capacitor.isNativePlatform();
};

export const getPlatformName = () => {
  return Capacitor.getPlatform(); // 'android' | 'ios' | 'web'
};

/**
 * Mengaktifkan proteksi layar hitam anti-screenshot (FLAG_SECURE)
 */
export const enableAntiScreenshot = async () => {
  if (isCapacitorNative()) {
    try {
      // Jika plugin privacy-screen terpasang di native Android
      if (window.Capacitor?.Plugins?.PrivacyScreen) {
        await window.Capacitor.Plugins.PrivacyScreen.enable();
        console.log('[Native] FLAG_SECURE Anti-Screenshot diaktifkan.');
      }
    } catch (err) {
      console.warn('[Native] Gagal mengaktifkan PrivacyScreen plugin:', err);
    }
  }
};

/**
 * Menonaktifkan proteksi anti-screenshot setelah ujian resmi selesai
 */
export const disableAntiScreenshot = async () => {
  if (isCapacitorNative()) {
    try {
      if (window.Capacitor?.Plugins?.PrivacyScreen) {
        await window.Capacitor.Plugins.PrivacyScreen.disable();
        console.log('[Native] FLAG_SECURE Anti-Screenshot dinonaktifkan.');
      }
    } catch (err) {
      console.warn('[Native] Gagal menonaktifkan PrivacyScreen plugin:', err);
    }
  }
};

/**
 * Mengaktifkan Screen Pinning / Lock Task Mode pada Android
 * Menghalangi tombol Home, Recent Apps, dan Notification Drawer
 */
export const enableScreenPinning = async () => {
  if (isCapacitorNative() && Capacitor.getPlatform() === 'android') {
    try {
      // Memanggil custom bridge android native bila tersedia
      if (window.AndroidLockBridge && window.AndroidLockBridge.startLockTask) {
        window.AndroidLockBridge.startLockTask();
        console.log('[Native] startLockTask() berhasil dipanggil.');
      }
    } catch (err) {
      console.warn('[Native] Screen pinning bridge gagal:', err);
    }
  }

  // Web Browser Fallback: HTML5 Fullscreen API
  if (typeof document !== 'undefined') {
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen && !document.fullscreenElement) {
        await docEl.requestFullscreen();
      }
    } catch (err) {
      console.warn('[Web] Fullscreen fallback gagal:', err);
    }
  }
};

/**
 * Melepaskan Screen Pinning / Lock Task Mode setelah Password Keluar diverifikasi
 */
export const disableScreenPinning = async () => {
  if (isCapacitorNative() && Capacitor.getPlatform() === 'android') {
    try {
      if (window.AndroidLockBridge && window.AndroidLockBridge.stopLockTask) {
        window.AndroidLockBridge.stopLockTask();
        console.log('[Native] stopLockTask() berhasil dipanggil.');
      }
    } catch (err) {
      console.warn('[Native] Stop lock task bridge gagal:', err);
    }
  }

  // Web Browser Fallback: Exit Fullscreen
  if (typeof document !== 'undefined') {
    try {
      if (document.exitFullscreen && document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('[Web] Exit fullscreen fallback gagal:', err);
    }
  }
};

