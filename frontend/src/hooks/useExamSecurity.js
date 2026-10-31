import { useEffect, useRef, useCallback } from 'react';
import { useExamStore } from '../store/useExamStore';
import { playViolationWarningSound } from '../utils/soundEffects';

/**
 * Hook Sensor Keamanan Zero-Tolerance Lockdown Anti-Cheat
 * Mengawasi secara presisi:
 * 1. Mobile (HP): Screenshot gesture 3 jari, tombol volume/power fisik, floating window, split screen, bilah notifikasi
 * 2. Laptop/PC: Blokir klik kanan, copy-paste (Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A), DevTools (F12, Ctrl+Shift+I), Print (Ctrl+P), View Source (Ctrl+U)
 * 3. General: Fullscreen lock, Tab Switch, App Switch (Alt+Tab), Text Drag-and-Drop, dan Pembersihan Otomatis Clipboard
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
    // Berikan grace period 5 detik agar browser & siswa dapat memulihkan fullscreen & fokus tanpa false positive
    if (prevIsLockedRef.current === true && activeAttempt.isLocked === false) {
      gracePeriodUntilRef.current = Date.now() + 5000;
    }
    prevIsLockedRef.current = activeAttempt.isLocked;
  }, [activeAttempt.examSubmittedAt, activeAttempt.isLocked]);

  // Handler Pelanggaran Spesifik (Bukan Kalimat Gabungan)
  const handleViolation = useCallback((type, description) => {
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

    const isMobileDevice = () => {
      return (
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        ('ontouchstart' in window) ||
        (navigator.maxTouchPoints > 0)
      );
    };

    // ========================================================
    // SENSOR 1: FULLSCREEN ENFORCEMENT (fullscreenchange)
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
          'Siswa keluar dari mode layar penuh (Exit Fullscreen / Menekan tombol ESC)'
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
          'Siswa terdeteksi berpindah tab peramban atau meminimalkan browser ujian'
        );
      }
    };

    // ========================================================
    // SENSOR 3: ANTI-APP SWITCH & LOSS OF FOCUS (window.onblur)
    // ========================================================
    const handleWindowBlur = () => {
      setTimeout(() => {
        if (isSubmittedRef.current || isLockedRef.current) return;
        if (Date.now() < gracePeriodUntilRef.current) return;

        // Jika dokumen benar-benar kehilangan fokus dari sistem operasi
        if (!document.hasFocus()) {
          const mobile = isMobileDevice();
          handleViolation(
            'APP_SWITCH',
            mobile
              ? 'Siswa terdeteksi beralih aplikasi, membuka floating window, atau menarik bilah status di HP'
              : 'Siswa terdeteksi beralih ke aplikasi lain di luar peramban ujian (Alt+Tab / Taskbar)'
          );
          return;
        }

        // Periksa jika fokus berada di dalam iframe
        const activeEl = document.activeElement;
        const isFocusInsideIframe = activeEl && (activeEl.tagName === 'IFRAME' || activeEl.closest('iframe'));
        if (isFocusInsideIframe) {
          return;
        }
      }, 150);
    };

    // ========================================================
    // SENSOR 4: MOBILE (HP) - DETEKSI SCREENSHOT GESTURE 3 JARI
    // ========================================================
    const handleTouchStart = (e) => {
      if (isSubmittedRef.current || isLockedRef.current) return;
      if (Date.now() < gracePeriodUntilRef.current) return;

      if (e.touches && e.touches.length >= 3) {
        e.preventDefault();
        e.stopPropagation();
        if (onScreenshotBlocked) {
          onScreenshotBlocked('Tangkapan layar 3 jari diblokir! Layar ujian Anda dibekukan.');
        }
        handleViolation(
          'SCREENSHOT_3FINGER_GESTURE',
          'Siswa terdeteksi mencoba tangkapan layar (Screenshot) menggunakan gesture usap 3 jari di HP'
        );
        return false;
      }
    };

    const handleTouchMove = (e) => {
      if (isSubmittedRef.current || isLockedRef.current) return;
      if (Date.now() < gracePeriodUntilRef.current) return;

      if (e.touches && e.touches.length >= 3) {
        e.preventDefault();
        e.stopPropagation();
        if (onScreenshotBlocked) {
          onScreenshotBlocked('Tangkapan layar 3 jari diblokir! Layar ujian Anda dibekukan.');
        }
        handleViolation(
          'SCREENSHOT_3FINGER_GESTURE',
          'Siswa terdeteksi mencoba tangkapan layar (Screenshot) menggunakan gesture usap 3 jari di HP'
        );
        return false;
      }
    };

    // ========================================================
    // SENSOR 5: BLOKIR KLIK KANAN & MENU KONTEKS
    // ========================================================
    const handleContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isSubmittedRef.current || isLockedRef.current) return false;
      if (Date.now() < gracePeriodUntilRef.current) return false;

      handleViolation(
        'CONTEXT_MENU_ATTEMPT',
        'Siswa mencoba membuka menu klik kanan (Context Menu) pada lembar ujian'
      );
      return false;
    };

    const handleAuxClick = (e) => {
      if (e.button === 2) {
        handleContextMenu(e);
      } else if (e.button === 1) {
        // Tombol tengah / scroll click
        e.preventDefault();
        e.stopPropagation();
        handleViolation(
          'CONTEXT_MENU_ATTEMPT',
          'Siswa mencoba klik tengah mouse (Middle Click) untuk membuka tautan'
        );
      }
    };

    // ========================================================
    // SENSOR 6: BLOKIR OPERASI CLIPBOARD (COPY, CUT, PASTE)
    // ========================================================
    const handleCopy = (e) => {
      e.preventDefault();
      e.stopPropagation();
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
        'COPY_ATTEMPT',
        'Siswa terdeteksi mencoba menyalin konten soal ke clipboard sistem (Copy)'
      );
      return false;
    };

    const handlePaste = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isSubmittedRef.current || isLockedRef.current) return false;
      if (Date.now() < gracePeriodUntilRef.current) return false;

      handleViolation(
        'PASTE_ATTEMPT',
        'Siswa terdeteksi mencoba menempelkan teks dari clipboard ke lembar ujian (Paste)'
      );
      return false;
    };

    const handleCut = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isSubmittedRef.current || isLockedRef.current) return false;
      if (Date.now() < gracePeriodUntilRef.current) return false;

      handleViolation(
        'CUT_ATTEMPT',
        'Siswa terdeteksi mencoba memotong konten ke clipboard sistem (Cut)'
      );
      return false;
    };

    // ========================================================
    // SENSOR 7: BLOKIR DRAG & DROP SERTA SELEKSI TEKS
    // ========================================================
    const handleDragStart = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isSubmittedRef.current || isLockedRef.current) return false;
      if (Date.now() < gracePeriodUntilRef.current) return false;

      handleViolation(
        'TEXT_SELECTION_ATTEMPT',
        'Siswa terdeteksi mencoba menyeret (drag) teks soal ujian ke luar'
      );
      return false;
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handleSelectStart = (e) => {
      // Izinkan pemilihan teks hanya jika di dalam input jawaban sah
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return true;
      }
      e.preventDefault();
      return false;
    };

    // ========================================================
    // SENSOR 8: SHORTCUT KEYBOARD LENGKAP & TOMBOL FISIK
    // ========================================================
    const handleKeyDown = (e) => {
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const key = e.key ? e.key.toLowerCase() : '';
      const keyCode = e.keyCode || e.which;

      // 1. Tombol Fisik Smartphone (Volume Down / Volume Up saat kombinasi Power)
      const isVolumeKey =
        ['audiovolumedown', 'audiovolumeup', 'volumedown', 'volumeup'].includes(key) ||
        keyCode === 24 || keyCode === 25 || keyCode === 174 || keyCode === 175;

      if (isVolumeKey) {
        e.preventDefault();
        e.stopPropagation();
        if (onScreenshotBlocked) {
          onScreenshotBlocked('Tombol fisik screenshot diblokir! Layar ujian Anda dibekukan.');
        }
        handleViolation(
          'SCREENSHOT_HARDWARE_BUTTON',
          'Siswa terdeteksi menekan kombinasi tombol fisik screenshot (Volume/Power) di HP'
        );
        return false;
      }

      // 2. Tombol PrintScreen / Snipping Tool Keyboard
      const isPrintScreenKey =
        e.key === 'PrintScreen' ||
        keyCode === 44 ||
        ((isCtrlOrMeta || e.altKey) && (e.key === 'PrintScreen' || keyCode === 44));

      if (isPrintScreenKey) {
        e.preventDefault();
        e.stopPropagation();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('');
          }
        } catch (_) {}
        if (onScreenshotBlocked) {
          onScreenshotBlocked('Tangkapan layar diblokir! Layar ujian Anda dibekukan.');
        }
        handleViolation(
          'SCREENSHOT_KEY_ATTEMPT',
          'Siswa mencoba mengambil tangkapan layar menggunakan tombol PrintScreen'
        );
        return false;
      }

      // 3. Windows Snipping Tool (Win+Shift+S / Meta+Shift+S)
      if ((isCtrlOrMeta || e.altKey) && e.shiftKey && key === 's') {
        e.preventDefault();
        e.stopPropagation();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('');
          }
        } catch (_) {}
        handleViolation(
          'SCREENSHOT_KEY_ATTEMPT',
          'Siswa mencoba membuka Windows Snipping Tool (Win+Shift+S)'
        );
        return false;
      }

      // 4. Mac Screenshot Shortcut (Cmd+Shift+3 / Cmd+Shift+4)
      if (e.metaKey && e.shiftKey && (key === '3' || key === '4')) {
        e.preventDefault();
        e.stopPropagation();
        handleViolation(
          'SCREENSHOT_KEY_ATTEMPT',
          `Siswa mencoba screenshot di macOS (Cmd+Shift+${key})`
        );
        return false;
      }

      // 5. Developer Tools: F12
      if (e.key === 'F12' || keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        handleViolation(
          'DEVTOOLS_ATTEMPT',
          'Siswa mencoba membuka Developer Tools / Inspect Element (Tombol F12)'
        );
        return false;
      }

      // 6. Developer Tools: Ctrl+Shift+I / Ctrl+Shift+J / Ctrl+Shift+C
      if (isCtrlOrMeta && e.shiftKey && ['i', 'j', 'c'].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
        handleViolation(
          'DEVTOOLS_ATTEMPT',
          `Siswa mencoba membuka Developer Tools (Ctrl+Shift+${key.toUpperCase()})`
        );
        return false;
      }

      // 7. Shortcut Copy: Ctrl+C / Cmd+C
      if (isCtrlOrMeta && key === 'c' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('');
          }
        } catch (_) {}
        handleViolation(
          'COPY_ATTEMPT',
          'Siswa mencoba menyalin teks/soal menggunakan shortcut keyboard (Ctrl+C)'
        );
        return false;
      }

      // 8. Shortcut Paste: Ctrl+V / Cmd+V
      if (isCtrlOrMeta && key === 'v') {
        e.preventDefault();
        e.stopPropagation();
        handleViolation(
          'PASTE_ATTEMPT',
          'Siswa mencoba menempelkan teks dari luar menggunakan shortcut keyboard (Ctrl+V)'
        );
        return false;
      }

      // 9. Shortcut Cut: Ctrl+X / Cmd+X
      if (isCtrlOrMeta && key === 'x') {
        e.preventDefault();
        e.stopPropagation();
        handleViolation(
          'CUT_ATTEMPT',
          'Siswa mencoba memotong teks menggunakan shortcut keyboard (Ctrl+X)'
        );
        return false;
      }

      // 10. Shortcut Select All: Ctrl+A / Cmd+A
      if (isCtrlOrMeta && key === 'a') {
        // Izinkan jika fokus di input text jawaban esai
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
          return true;
        }
        e.preventDefault();
        e.stopPropagation();
        handleViolation(
          'SELECT_ALL_ATTEMPT',
          'Siswa mencoba menyeleksi seluruh halaman soal menggunakan shortcut (Ctrl+A)'
        );
        return false;
      }

      // 11. Shortcut Print: Ctrl+P / Cmd+P
      if (isCtrlOrMeta && key === 'p') {
        e.preventDefault();
        e.stopPropagation();
        handleViolation(
          'PRINT_ATTEMPT',
          'Siswa mencoba mencetak lembar soal ujian (Shortcut Ctrl+P)'
        );
        return false;
      }

      // 12. Shortcut View Source: Ctrl+U / Cmd+U
      if (isCtrlOrMeta && key === 'u') {
        e.preventDefault();
        e.stopPropagation();
        handleViolation(
          'VIEW_SOURCE_ATTEMPT',
          'Siswa mencoba melihat kode sumber halaman ujian (Shortcut Ctrl+U)'
        );
        return false;
      }

      // 13. Shortcut Save Page: Ctrl+S / Cmd+S
      if (isCtrlOrMeta && key === 's') {
        e.preventDefault();
        e.stopPropagation();
        handleViolation(
          'SAVE_PAGE_ATTEMPT',
          'Siswa mencoba menyimpan halaman ujian ke penyimpanan lokal (Shortcut Ctrl+S)'
        );
        return false;
      }
    };

    // ========================================================
    // SENSOR 9: BLOKIR NAVIGASI BACK BROWSER & BEFOREUNLOAD
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
    // SENSOR 10: HEARTBEAT REAL-TIME LOSS OF FOCUS & DEVTOOLS RESIZE
    // Interval 150ms memeriksa ketiadaan fokus sistem operasi
    // ========================================================
    const heartbeatInterval = setInterval(() => {
      if (isSubmittedRef.current || isLockedRef.current) return;
      if (Date.now() < gracePeriodUntilRef.current) return;

      // 1. Deteksi ketiadaan fokus dari OS
      if (!document.hasFocus()) {
        const mobile = isMobileDevice();
        handleViolation(
          'APP_SWITCH',
          mobile
            ? 'Siswa terdeteksi beralih aplikasi, membuka floating window, atau menarik bilah status di HP'
            : 'Siswa terdeteksi beralih ke aplikasi lain di luar peramban ujian (Alt+Tab / Taskbar)'
        );
        return;
      }

      // 2. Deteksi pembukaan DevTools via resize threshold saat layar penuh
      const isFullscreen = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      if (isFullscreen) {
        const widthDiff = window.outerWidth - window.innerWidth;
        const heightDiff = window.outerHeight - window.innerHeight;
        if (widthDiff > 160 || heightDiff > 160) {
          handleViolation(
            'DEVTOOLS_ATTEMPT',
            'Siswa terdeteksi membuka panel samping Developer Tools / Inspect Element'
          );
        }
      }
    }, 150);

    // ========================================================
    // SENSOR 11: PEMBERSIHAN OTOMATIS CLIPBOARD (PURGE DAEMON)
    // Setiap 300ms mengosongkan buffer clipboard saat siswa di arena ujian
    // Menjamin teks yang disalin dari manapun (termasuk iframe) langsung musnah
    // ========================================================
    const clipboardPurgeInterval = setInterval(() => {
      if (isSubmittedRef.current || isLockedRef.current) return;
      if (document.hasFocus()) {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('');
          }
        } catch (_) {}
      }
    }, 300);

    // ========================================================
    // REGISTRASI LISTENER DENGAN CAPTURE MODE (PRIORITAS TERTINGGI)
    // ========================================================
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    // Touch events untuk screenshot HP
    window.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false });
    document.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false });
    window.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false });
    document.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false });

    // Mouse & context menu events
    window.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    window.addEventListener('auxclick', handleAuxClick, true);
    document.addEventListener('auxclick', handleAuxClick, true);

    // Clipboard events
    window.addEventListener('copy', handleCopy, true);
    document.addEventListener('copy', handleCopy, true);
    window.addEventListener('paste', handlePaste, true);
    document.addEventListener('paste', handlePaste, true);
    window.addEventListener('cut', handleCut, true);
    document.addEventListener('cut', handleCut, true);

    // Selection & Drag events
    document.addEventListener('selectstart', handleSelectStart, true);
    window.addEventListener('dragstart', handleDragStart, true);
    document.addEventListener('dragstart', handleDragStart, true);
    window.addEventListener('dragover', handleDrop, true);
    document.addEventListener('dragover', handleDrop, true);
    window.addEventListener('drop', handleDrop, true);
    document.addEventListener('drop', handleDrop, true);

    // Keyboard events
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyDown, true);

    // Navigation events
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(clipboardPurgeInterval);

      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);

      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);

      window.removeEventListener('touchstart', handleTouchStart, { capture: true });
      document.removeEventListener('touchstart', handleTouchStart, { capture: true });
      window.removeEventListener('touchmove', handleTouchMove, { capture: true });
      document.removeEventListener('touchmove', handleTouchMove, { capture: true });

      window.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('contextmenu', handleContextMenu, true);
      window.removeEventListener('auxclick', handleAuxClick, true);
      document.removeEventListener('auxclick', handleAuxClick, true);

      window.removeEventListener('copy', handleCopy, true);
      document.removeEventListener('copy', handleCopy, true);
      window.removeEventListener('paste', handlePaste, true);
      document.removeEventListener('paste', handlePaste, true);
      window.removeEventListener('cut', handleCut, true);
      document.removeEventListener('cut', handleCut, true);

      document.removeEventListener('selectstart', handleSelectStart, true);
      window.removeEventListener('dragstart', handleDragStart, true);
      document.removeEventListener('dragstart', handleDragStart, true);
      window.removeEventListener('dragover', handleDrop, true);
      document.removeEventListener('dragover', handleDrop, true);
      window.removeEventListener('drop', handleDrop, true);
      document.removeEventListener('drop', handleDrop, true);

      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyDown, true);
      document.removeEventListener('keyup', handleKeyDown, true);

      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isExamActive, handleViolation, onScreenshotBlocked]);
}
