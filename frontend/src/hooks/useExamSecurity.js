import { useEffect, useRef, useCallback } from 'react';
import { useExamStore } from '../store/useExamStore';
import { playViolationWarningSound } from '../utils/soundEffects';

/**
 * Hook Sensor Keamanan Zero-Tolerance Lockdown
 * Mengawasi Fullscreen, Pindah Tab, Ganti Aplikasi, Shortcut Keyboard, dan Screenshot
 */
export function useExamSecurity({ onScreenshotBlocked, onViolationDetected, isExamActive = true }) {
  const { 
    activeAttempt, 
    triggerViolationLock 
  } = useExamStore();

  const isSubmittedRef = useRef(Boolean(activeAttempt.examSubmittedAt));
  const isLockedRef = useRef(activeAttempt.isLocked);

  useEffect(() => {
    isSubmittedRef.current = Boolean(activeAttempt.examSubmittedAt);
    isLockedRef.current = activeAttempt.isLocked;
  }, [activeAttempt.examSubmittedAt, activeAttempt.isLocked]);

  // Handler Pelanggaran
  const handleViolation = useCallback((type, description) => {
    // Jangan picu pelanggaran jika ujian sudah selesai atau layar sudah dalam status terkunci
    if (isSubmittedRef.current || isLockedRef.current || !isExamActive) return;

    playViolationWarningSound();
    triggerViolationLock(type, description);
    if (onViolationDetected) {
      onViolationDetected(type, description);
    }
  }, [isExamActive, triggerViolationLock, onViolationDetected]);

  useEffect(() => {
    if (!isExamActive || isSubmittedRef.current) return;

    // ========================================================
    // SENSOR 1: FULLSCREEN LISTENER (fullscreenchange)
    // ========================================================
    const handleFullscreenChange = () => {
      const isFullscreen = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      if (!isFullscreen && !isSubmittedRef.current && !isLockedRef.current) {
        handleViolation(
          'EXIT_FULLSCREEN',
          'Siswa keluar dari mode layar penuh (Fullscreen API)'
        );
      }
    };

    // ========================================================
    // SENSOR 2: ANTI-TAB SWITCH & MINIMIZE (visibilitychange)
    // ========================================================
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !isSubmittedRef.current && !isLockedRef.current) {
        handleViolation(
          'TAB_SWITCH',
          'Siswa berpindah tab peramban atau meminimalkan aplikasi ujian'
        );
      }
    };

    // ========================================================
    // SENSOR 3: ANTI-APP SWITCH DENGAN IFRAME FOCUS GUARD (window.onblur)
    // ========================================================
    const handleWindowBlur = () => {
      // Berikan jeda 150ms untuk memeriksa apakah fokus berpindah ke dalam IFRAME
      setTimeout(() => {
        if (isSubmittedRef.current || isLockedRef.current) return;

        const activeEl = document.activeElement;
        const isFocusInsideIframe = 
          activeEl && (activeEl.tagName === 'IFRAME' || activeEl.closest('iframe'));

        // Jika fokus berada di dalam iframe Google Form / Teams: JANGAN KUNCI LAYAR
        if (isFocusInsideIframe) {
          return;
        }

        // Jika fokus benar-benar hilang dari browser utama (buka aplikasi lain / split screen)
        if (!document.hasFocus()) {
          handleViolation(
            'WINDOW_BLUR_APP_SWITCH',
            'Siswa terdeteksi membuka aplikasi lain di luar browser ujian (Window Blur)'
          );
        }
      }, 150);
    };

    // ========================================================
    // SENSOR 4: BLOKIR KLIK KANAN, COPY-PASTE, SELEKSI TEKS
    // ========================================================
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    const handleClipboardEvents = (e) => {
      e.preventDefault();
      return false;
    };

    // ========================================================
    // SENSOR 5: BLOKIR SHORTCUT KEYBOARD & DETEKSI PRINTSCREEN
    // ========================================================
    const handleKeyDown = (e) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const key = e.key ? e.key.toLowerCase() : '';

      // 1. Deteksi Tombol PrintScreen (Screenshot)
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(''); // Kosongkan clipboard buffer
          }
        } catch (_) {}

        if (onScreenshotBlocked) {
          onScreenshotBlocked('Tidak dapat menangkap screenshot! Halaman berisi informasi ujian terproteksi.');
        }

        handleViolation(
          'SHORTCUT_ATTEMPT',
          'Upaya tangkapan layar (PrintScreen) terdeteksi dan diblokir sistem'
        );
        return false;
      }

      // 2. Blokir F12 (Developer Tools)
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        handleViolation(
          'SHORTCUT_ATTEMPT',
          'Mencoba membuka inspect element (F12 DevTools)'
        );
        return false;
      }

      // 3. Blokir Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+U (View Source), Ctrl+P (Print), Ctrl+S (Save)
      if (isCtrlOrMeta && ['c', 'v', 'x', 'u', 'p', 's', 'a'].includes(key)) {
        // Izinkan Ctrl+A hanya di dalam input / textarea jika diperlukan
        if (key === 'a' && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
          return true;
        }
        e.preventDefault();
        return false;
      }

      // 4. Blokir Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Inspect Element)
      if (isCtrlOrMeta && e.shiftKey && ['i', 'j', 'c'].includes(key)) {
        e.preventDefault();
        handleViolation(
          'SHORTCUT_ATTEMPT',
          'Mencoba membuka Developer Tools (Ctrl+Shift+I/J/C)'
        );
        return false;
      }
    };

    // ========================================================
    // SENSOR 6: BLOKIR TOMBOL BACK & BEFOREUNLOAD
    // ========================================================
    window.history.pushState(null, null, window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, null, window.location.href);
      alert('Ujian sedang berlangsung! Gunakan menu Password Keluar di bar atas untuk mengakhiri sesi.');
    };

    const handleBeforeUnload = (e) => {
      if (!isSubmittedRef.current) {
        e.preventDefault();
        e.returnValue = 'Ujian sedang berlangsung. Jika Anda keluar, hasil ujian Anda akan terkunci!';
        return e.returnValue;
      }
    };

    // Registrasi Seluruh Event Listener
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleClipboardEvents);
    document.addEventListener('cut', handleClipboardEvents);
    document.addEventListener('paste', handleClipboardEvents);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);

      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);

      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleClipboardEvents);
      document.removeEventListener('cut', handleClipboardEvents);
      document.removeEventListener('paste', handleClipboardEvents);

      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isExamActive, handleViolation, onScreenshotBlocked]);
}

