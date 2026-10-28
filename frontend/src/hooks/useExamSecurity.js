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
  const gracePeriodUntilRef = useRef(0);
  const prevIsLockedRef = useRef(activeAttempt.isLocked);

  useEffect(() => {
    isSubmittedRef.current = Boolean(activeAttempt.examSubmittedAt);
    isLockedRef.current = activeAttempt.isLocked;

    // Saat status berubah dari LOCKED (true) menjadi UNLOCKED (false):
    // Berikan grace period / masa imunitas 5 detik agar browser & siswa dapat memulihkan fullscreen & fokus tanpa false positive
    if (prevIsLockedRef.current === true && activeAttempt.isLocked === false) {
      gracePeriodUntilRef.current = Date.now() + 5000;
    }
    prevIsLockedRef.current = activeAttempt.isLocked;
  }, [activeAttempt.examSubmittedAt, activeAttempt.isLocked]);

  // Handler Pelanggaran
  const handleViolation = useCallback((type, description) => {
    // Jangan picu pelanggaran jika ujian sudah selesai, layar sedang terkunci, atau masih dalam masa imunitas unlock (grace period)
    if (isSubmittedRef.current || isLockedRef.current || !isExamActive) return;
    if (Date.now() < gracePeriodUntilRef.current) return;

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
        if (Date.now() < gracePeriodUntilRef.current) return;
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
        if (Date.now() < gracePeriodUntilRef.current) return;
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
      // Berikan jeda 150ms untuk memeriksa status fokus jendela browser
      setTimeout(() => {
        if (isSubmittedRef.current || isLockedRef.current) return;
        if (Date.now() < gracePeriodUntilRef.current) return;

        // 1. Jika fokus benar-benar hilang dari browser utama (Snipping Tool, ganti aplikasi, Alt+Tab, Windows Key)
        if (!document.hasFocus()) {
          handleViolation(
            'WINDOW_BLUR_APP_SWITCH',
            'Siswa terdeteksi membuka aplikasi lain atau screenshot tool (Window Blur)'
          );
          return;
        }

        // 2. Jika dokumen masih hasFocus, periksa apakah fokus berada di dalam IFRAME
        const activeEl = document.activeElement;
        const isFocusInsideIframe = 
          activeEl && (activeEl.tagName === 'IFRAME' || activeEl.closest('iframe'));

        // Jika fokus berada di dalam iframe Google Form: siswa sedang berinteraksi di formulir, jangan kunci
        if (isFocusInsideIframe) {
          return;
        }
      }, 150);
    };

    // ========================================================
    // SENSOR 4: BLOKIR KLIK KANAN & KUNCI LAYAR OTOMATIS
    // ========================================================
    const handleContextMenu = (e) => {
      e.preventDefault();
      if (isSubmittedRef.current || isLockedRef.current) return false;
      if (Date.now() < gracePeriodUntilRef.current) return false;

      handleViolation(
        'CONTEXT_MENU_ATTEMPT',
        'Upaya klik kanan (Menu Konteks) terdeteksi dan diblokir sistem'
      );
      return false;
    };

    // ========================================================
    // SENSOR 5: BLOKIR COPY, CUT, PASTE & KOSONGKAN CLIPBOARD
    // ========================================================
    const handleClipboardEvents = (e) => {
      e.preventDefault();
      if (e.clipboardData) {
        try {
          e.clipboardData.setData('text/plain', '');
          e.clipboardData.setData('text/html', '');
        } catch (_) {}
      }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText('');
        }
      } catch (_) {}

      if (isSubmittedRef.current || isLockedRef.current) return false;
      if (Date.now() < gracePeriodUntilRef.current) return false;

      handleViolation(
        'CLIPBOARD_ATTEMPT',
        'Upaya menyalin atau menempel teks (Copy-Paste) terdeteksi dan diblokir sistem'
      );
      return false;
    };

    // ========================================================
    // SENSOR 6: BLOKIR SELEKSI TEKS DI AREA SOAL
    // ========================================================
    const handleSelectStart = (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return true;
      }
      e.preventDefault();
      return false;
    };

    // ========================================================
    // SENSOR 7: BLOKIR SHORTCUT KEYBOARD & DETEKSI PRINTSCREEN / SCREENSHOT
    // ========================================================
    const handleKeyDown = (e) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const key = e.key ? e.key.toLowerCase() : '';

      // 1. Deteksi Tangkapan Layar (PrintScreen, Win+Shift+S, Meta+Shift+S, Alt+PrintScreen)
      const isScreenshotKey =
        e.key === 'PrintScreen' ||
        e.keyCode === 44 ||
        ((isCtrlOrMeta || e.altKey) && (e.key === 'PrintScreen' || e.keyCode === 44)) ||
        ((isCtrlOrMeta || e.altKey) && e.shiftKey && (key === 's' || key === '3' || key === '4'));

      if (isScreenshotKey) {
        e.preventDefault();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(''); // Kosongkan clipboard buffer instan
          }
        } catch (_) {}

        if (onScreenshotBlocked) {
          onScreenshotBlocked('Tangkapan layar diblokir! Layar ujian Anda dibekukan.');
        }

        handleViolation(
          'SHORTCUT_ATTEMPT',
          'Upaya tangkapan layar (Screenshot / Snipping Tool) terdeteksi dan diblokir sistem'
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

      // 3. Blokir Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+P (Print), Ctrl+U (View Source), Ctrl+S (Save) & KUNCI LAYAR
      if (isCtrlOrMeta && ['c', 'v', 'x', 'p', 'u', 's'].includes(key)) {
        e.preventDefault();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('');
          }
        } catch (_) {}

        handleViolation(
          'CLIPBOARD_ATTEMPT',
          `Mencoba shortcut terlarang (Ctrl+${key.toUpperCase()}) terdeteksi dan diblokir sistem`
        );
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
    // SENSOR 8: BLOKIR TOMBOL BACK & BEFOREUNLOAD
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

    // ========================================================
    // SENSOR 9: HEARTBEAT MONITORING FOKUS WINDOW & SCREENSHOT
    // Mengawasi ketiadaan fokus (Loss of Focus / document.hasFocus())
    // Menangkap Snipping Tool, Win+Shift+S, Buka Aplikasi Lain, & Menu Konteks
    // bahkan saat kursor/fokus berada di dalam iframe Google Form
    // ========================================================
    const heartbeatInterval = setInterval(() => {
      if (isSubmittedRef.current || isLockedRef.current) return;
      if (Date.now() < gracePeriodUntilRef.current) return;

      // Jika seluruh jendela peramban kehilangan fokus dari OS
      if (!document.hasFocus()) {
        handleViolation(
          'WINDOW_BLUR_APP_SWITCH',
          'Siswa terdeteksi membuka aplikasi lain, screenshot tool, atau keluar dari jendela ujian (Loss of Focus)'
        );
      }
    }, 150);

    // Registrasi Seluruh Event Listener dengan capture mode
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    window.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('contextmenu', handleContextMenu, true);

    const handleAuxClick = (e) => {
      if (e.button === 2) {
        handleContextMenu(e);
      }
    };
    window.addEventListener('auxclick', handleAuxClick, true);
    document.addEventListener('auxclick', handleAuxClick, true);

    window.addEventListener('copy', handleClipboardEvents, true);
    document.addEventListener('copy', handleClipboardEvents, true);
    window.addEventListener('cut', handleClipboardEvents, true);
    document.addEventListener('cut', handleClipboardEvents, true);
    window.addEventListener('paste', handleClipboardEvents, true);
    document.addEventListener('paste', handleClipboardEvents, true);

    document.addEventListener('selectstart', handleSelectStart, true);

    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyDown, true);

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeatInterval);

      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);

      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);

      window.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);

      window.removeEventListener('auxclick', handleAuxClick, true);
      document.removeEventListener('auxclick', handleAuxClick, true);

      window.removeEventListener('copy', handleClipboardEvents, true);
      document.removeEventListener('copy', handleClipboardEvents, true);
      window.removeEventListener('cut', handleClipboardEvents, true);
      document.removeEventListener('cut', handleClipboardEvents, true);
      window.removeEventListener('paste', handleClipboardEvents, true);
      document.removeEventListener('paste', handleClipboardEvents, true);

      document.removeEventListener('selectstart', handleSelectStart, true);

      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyDown, true);

      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isExamActive, handleViolation, onScreenshotBlocked]);
}

