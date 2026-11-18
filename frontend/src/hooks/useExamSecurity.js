import { useEffect, useRef, useCallback } from 'react';
import { useExamStore } from '../store/useExamStore';
import { playViolationWarningSound } from '../utils/soundEffects';

/**
 * Hook Sensor Keamanan Zero-Tolerance Lockdown Anti-Cheat
 * Mengawasi secara presisi:
 * 1. Mobile (HP): Screenshot gesture 3 jari sejati, tombol volume/power fisik, floating window, split screen, bilah notifikasi
 * 2. OS Focus & AI Integrity: Deteksi Gemini Live / Google Assistant via Focus Loss Watchdog (Zero-Permission & Zero-Sound)
 * 3. Laptop/PC: Blokir klik kanan, copy-paste (Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A), DevTools (F12, Ctrl+Shift+I), Print (Ctrl+P), View Source (Ctrl+U)
 * 4. General: Fullscreen lock, Tab Switch, App Switch (Alt+Tab), Text Drag-and-Drop, dan Pembersihan Otomatis Clipboard
 */
export function useExamSecurity({ onScreenshotBlocked, onViolationDetected, isExamActive = true }) {
  const { 
    activeAttempt, 
    triggerViolationLock 
  } = useExamStore();

  const isSubmittedRef = useRef(Boolean(activeAttempt.examSubmittedAt));
  const isLockedRef = useRef(activeAttempt.isLocked);
  // Berikan masa tenggang awal 6 detik saat siswa baru masuk ke arena ujian
  // Menjamin inisialisasi fullscreen, orientasi, dan rendering awal tidak memicu false lock
  const gracePeriodUntilRef = useRef(Date.now() + 6000);
  const prevIsLockedRef = useRef(activeAttempt.isLocked);
  const consecutiveBlurChecksRef = useRef(0);
  const threeFingerSwipeRef = useRef(null);
  const topEdgeSwipeRef = useRef(null);
  const edgeSwipeCandidateRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressTouchPosRef = useRef(null);
  const mouseDragStartPosRef = useRef(null);

  useEffect(() => {
    isSubmittedRef.current = Boolean(activeAttempt.examSubmittedAt);
    isLockedRef.current = activeAttempt.isLocked;

    // Saat status berubah dari LOCKED (true) menjadi UNLOCKED (false):
    // Berikan grace period 5 detik agar browser & siswa dapat memulihkan fullscreen & fokus tanpa false positive
    if (prevIsLockedRef.current === true && activeAttempt.isLocked === false) {
      gracePeriodUntilRef.current = Date.now() + 5000;
      consecutiveBlurChecksRef.current = 0;
      threeFingerSwipeRef.current = null;
      edgeSwipeCandidateRef.current = null;
      topEdgeSwipeRef.current = null;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      longPressTouchPosRef.current = null;
      mouseDragStartPosRef.current = null;
    }
    prevIsLockedRef.current = activeAttempt.isLocked;
  }, [activeAttempt.examSubmittedAt, activeAttempt.isLocked]);

  // Handler Pelanggaran Spesifik
  const handleViolation = useCallback((type, description) => {
    if (isSubmittedRef.current || isLockedRef.current || !isExamActive) return;

    // KUNCI LANGSUNG SECARA SINKRON:
    // Mencegah microtask/event lain dalam tick yang sama (cth: touchstart + blur + touchmove) memicu penalti ganda!
    isLockedRef.current = true;

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

    const isIOSDevice = () => {
      return (
        /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
        (typeof navigator.userAgent === 'string' && /iPhone/i.test(navigator.userAgent))
      );
    };

    // Helper: Pastikan style filter & tampilan selalu bersih
    const ensureCleanDisplay = () => {
      try {
        document.documentElement.style.filter = '';
        document.documentElement.style.backdropFilter = '';
        document.body.style.filter = '';
        document.body.style.backgroundColor = '';
        const mainEl = document.querySelector('main');
        if (mainEl) {
          mainEl.style.filter = '';
          mainEl.style.visibility = '';
          mainEl.style.opacity = '';
        }
      } catch (_) {}
    };

    // ========================================================
    // SENSOR 1: FULLSCREEN ENFORCEMENT (fullscreenchange)
    // ========================================================
    const handleFullscreenChange = () => {
      // iPhone / iOS Safari TIDAK MENDUKUNG Fullscreen API pada elemen DOM (document.documentElement).
      // Jangan pernah memicu EXIT_FULLSCREEN pada perangkat iOS untuk mencegah false-lock.
      if (isIOSDevice()) return;

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
      ensureCleanDisplay();

      if (document.visibilityState === 'hidden' || document.hidden) {
        if (isSubmittedRef.current || isLockedRef.current) return;
        // PENTING: Hormati masa tenggang awal saat inisialisasi fullscreen & orientasi
        if (Date.now() < gracePeriodUntilRef.current) return;

        handleViolation(
          isMobileDevice() ? 'APP_SWITCH' : 'TAB_SWITCH',
          isMobileDevice()
            ? 'Siswa terdeteksi keluar dari layar ujian atau beralih aplikasi di HP'
            : 'Siswa terdeteksi berpindah tab peramban atau meminimalkan browser ujian'
        );
      }
    };

    // ========================================================
    // SENSOR 3: ANTI-APP SWITCH & LOSS OF FOCUS (window.onblur / onfocus)
    // ========================================================
    let blurTimeout = null;
    const handleWindowBlur = () => {
      // Obfuscation blur ringan saat peramban kehilangan fokus OS (mencegah preview snapshot OS)
      if (!isSubmittedRef.current && !isLockedRef.current) {
        if (!document.hasFocus()) {
          const mainEl = document.querySelector('main');
          if (mainEl) {
            mainEl.style.filter = 'blur(16px)';
          }
        }
      }

      if (blurTimeout) clearTimeout(blurTimeout);
      blurTimeout = setTimeout(() => {
        if (isSubmittedRef.current || isLockedRef.current) return;
        if (Date.now() < gracePeriodUntilRef.current) return;

        // Bersihkan clipboard sistem seketika saat peramban kehilangan fokus
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('');
          }
        } catch (_) {}

        // KHUSUS PERANGKAT iOS (iPhone / iPad):
        // Peramban Safari di iOS kerap memancarkan window blur saat keyboard virtual menutup atau bar URL berubah.
        // Pada iOS, deteksi keluar aplikasi secara mutlak mengandalkan document.visibilityState === 'hidden'
        // (yang 100% akurat saat siswa benar-benar keluar, beralih ke WhatsApp, Home Screen, atau app switcher).
        if (isIOSDevice()) {
          if (document.visibilityState === 'hidden' || document.hidden) {
            handleViolation(
              'APP_SWITCH',
              'Siswa terdeteksi keluar dari layar ujian atau beralih aplikasi di HP'
            );
          }
          return;
        }

        if (document.visibilityState === 'visible') {
          const activeEl = document.activeElement;
          const isFocusInsideIframe = activeEl && (activeEl.tagName === 'IFRAME' || activeEl.closest('iframe'));
          
          if (isFocusInsideIframe && document.hasFocus()) {
            return;
          }

          if (!document.hasFocus() && !isFocusInsideIframe) {
            handleViolation(
              isMobileDevice() ? 'FLOATING_WINDOW_ATTEMPT' : 'APP_SWITCH',
              isMobileDevice()
                ? 'Siswa terdeteksi membuka mode mengambang (Floating Window / Gemini Live), perekam layar, atau bilah notifikasi di HP'
                : 'Siswa terdeteksi beralih ke jendela aplikasi lain di luar peramban ujian (Alt+Tab / Taskbar)'
            );
            return;
          }
        }

        if (document.visibilityState === 'hidden' || document.hidden || !document.hasFocus()) {
          handleViolation(
            isMobileDevice() ? 'APP_SWITCH' : 'TAB_SWITCH',
            isMobileDevice()
              ? 'Siswa terdeteksi keluar dari layar ujian atau beralih aplikasi di HP'
              : 'Siswa terdeteksi berpindah tab peramban atau meminimalkan browser ujian'
          );
        }
      }, 70);
    };

    const handleWindowFocus = () => {
      ensureCleanDisplay();
      consecutiveBlurChecksRef.current = 0;
      if (blurTimeout) {
        clearTimeout(blurTimeout);
        blurTimeout = null;
      }
    };

    // ========================================================
    // SENSOR 4: MOBILE (HP) - DETEKSI GESTURE 3 JARI SEJATI (ANTI-FALSE POSITIVE),
    // TARIK BILAH NOTIFIKASI/REKAM LAYAR, BILAH SISI, & LONG-PRESS ANTI-BLOCK
    // ========================================================
    const handleTouchStart = (e) => {
      if (isSubmittedRef.current || isLockedRef.current) return;
      if (Date.now() < gracePeriodUntilRef.current) return;

      const touchCount = Math.max(
        e.touches ? e.touches.length : 0,
        e.targetTouches ? e.targetTouches.length : 0,
        e.changedTouches ? e.changedTouches.length : 0
      );

      // 1. Catat Titik Awal Gesture 3 Jari Nyata (Screenshot Gesture di HP)
      // Hanya mulai pelacakan jika terdapat minimal 3 titik sentuh (Xiaomi, Oppo, Realme, Vivo, dll)
      // Sentuhan 2 jari (pegang HP / pinch zoom) diperbolehkan sepenuhnya tanpa memicu penalti!
      if (touchCount >= 3 && e.touches && e.touches.length >= 3) {
        let sumY = 0;
        for (let i = 0; i < e.touches.length; i++) {
          sumY += e.touches[i].clientY;
        }
        threeFingerSwipeRef.current = {
          startY: sumY / e.touches.length,
          startTime: Date.now(),
          touchCount: e.touches.length
        };
      } else {
        threeFingerSwipeRef.current = null;
      }

      if (touchCount === 1 && isMobileDevice()) {
        const touch = e.touches[0];
        const screenW = window.innerWidth || window.screen.width;

        // 2. Deteksi Tarikan Bilah Notifikasi dari Atas Layar (Notification Drawer / Menu Rekam Layar / Quick Settings)
        if (touch.clientY < 45) {
          topEdgeSwipeRef.current = { startY: touch.clientY, startTime: Date.now() };
        } else {
          topEdgeSwipeRef.current = null;
        }

        // 3. Deteksi Gesture Usapan Tepi Samping Layar (Bilah Sisi / Smart Sidebar Aplikasi Mengambang di HP)
        // Di iOS iPhone tidak ada Smart Sidebar Android; hindari false positive saat jempol menyentuh tepi layar iPhone
        if (!isIOSDevice() && (touch.clientX < 20 || touch.clientX > (screenW - 20))) {
          edgeSwipeCandidateRef.current = {
            startX: touch.clientX,
            startY: touch.clientY,
            startTime: Date.now()
          };
        } else {
          edgeSwipeCandidateRef.current = null;
        }

        // 4. Pencegahan & Deteksi Long-Press untuk Mem-Block / Menyeleksi Teks Soal di HP
        longPressTouchPosRef.current = { x: touch.clientX, y: touch.clientY };
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
        }
        longPressTimerRef.current = setTimeout(() => {
          if (isSubmittedRef.current || isLockedRef.current) return;
          if (Date.now() < gracePeriodUntilRef.current) return;

          try {
            window.getSelection()?.removeAllRanges();
          } catch (_) {}

          handleViolation(
            'TEXT_SELECTION_ATTEMPT',
            'Siswa terdeteksi mencoba menahan sentuhan untuk mem-block / menyeleksi teks soal ujian di HP'
          );
        }, 250);
      }
    };

    const handleTouchMove = (e) => {
      if (isSubmittedRef.current || isLockedRef.current) return;
      if (Date.now() < gracePeriodUntilRef.current) return;

      // 1. Deteksi Usapan Nyata 3 Jari ke Bawah (Real 3-Finger Downward Swipe Screenshot Gesture)
      if (threeFingerSwipeRef.current && e.touches && e.touches.length >= 3) {
        let sumY = 0;
        for (let i = 0; i < e.touches.length; i++) {
          sumY += e.touches[i].clientY;
        }
        const currentAvgY = sumY / e.touches.length;
        const deltaY = currentAvgY - threeFingerSwipeRef.current.startY;
        const duration = Date.now() - threeFingerSwipeRef.current.startTime;

        // Screenshot geser 3 jari di HP adalah sapuan ke bawah minimal 40px dalam tempo cepat (< 800ms)
        if (deltaY > 40 && duration < 800) {
          threeFingerSwipeRef.current = null;
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          if (onScreenshotBlocked) {
            onScreenshotBlocked('Tangkapan layar 3 jari diblokir! Layar ujian Anda dibekukan.');
          }
          handleViolation(
            'SCREENSHOT_3FINGER_GESTURE',
            'Siswa terdeteksi mencoba tangkapan layar (Screenshot) menggunakan gesture usap 3 jari di HP'
          );
          return false;
        }
      }

      // 2. Deteksi Tarikan Bilah Notifikasi ke Arah Bawah (Membuka Menu Rekam Layar / Screenshot Tile)
      if (topEdgeSwipeRef.current && e.touches && e.touches.length === 1 && isMobileDevice()) {
        const touch = e.touches[0];
        const deltaY = touch.clientY - topEdgeSwipeRef.current.startY;
        if (deltaY > 20) {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          topEdgeSwipeRef.current = null;
          handleViolation(
            'NOTIFICATION_BAR_PULLDOWN',
            'Siswa terdeteksi menarik bilah notifikasi HP / menu rekam layar'
          );
          return false;
        }
      }

      // 3. Deteksi Tarikan Tepi Samping Layar (Smart Sidebar Gesture Memicu Jendela Mengambang)
      if (edgeSwipeCandidateRef.current && e.touches && e.touches.length === 1 && isMobileDevice()) {
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - edgeSwipeCandidateRef.current.startX);
        const deltaY = Math.abs(touch.clientY - edgeSwipeCandidateRef.current.startY);

        if (deltaX > 32 && deltaX > deltaY * 1.3 && (Date.now() - edgeSwipeCandidateRef.current.startTime) < 500) {
          edgeSwipeCandidateRef.current = null;
          handleViolation(
            'FLOATING_WINDOW_ATTEMPT',
            'Siswa terdeteksi mengusap tepi layar untuk membuka bilah sisi aplikasi mengambang (Smart Sidebar / Floating Window) di HP'
          );
          return false;
        }
      }

      // 4. Jika jari bergerak > 8px (scrolling lembar soal wajar), batalkan timer long-press
      if (longPressTouchPosRef.current && e.touches && e.touches.length === 1) {
        const touch = e.touches[0];
        const dist = Math.hypot(
          touch.clientX - longPressTouchPosRef.current.x,
          touch.clientY - longPressTouchPosRef.current.y
        );
        if (dist > 8) {
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
        }
      }
    };

    const handleTouchEnd = () => {
      threeFingerSwipeRef.current = null;
      edgeSwipeCandidateRef.current = null;
      topEdgeSwipeRef.current = null;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    // ========================================================
    // SENSOR ANTI-DRAG & SELEKSI TEKS MOUSE DI LAPTOP / DESKTOP
    // ========================================================
    const handleMouseDown = (e) => {
      if (isSubmittedRef.current || isLockedRef.current) return;
      if (Date.now() < gracePeriodUntilRef.current) return;

      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.button === 0) {
        mouseDragStartPosRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseMove = (e) => {
      if (!mouseDragStartPosRef.current) return;
      if (isSubmittedRef.current || isLockedRef.current) return;
      if (Date.now() < gracePeriodUntilRef.current) return;

      if (e.buttons === 1) {
        const dist = Math.hypot(
          e.clientX - mouseDragStartPosRef.current.x,
          e.clientY - mouseDragStartPosRef.current.y
        );
        if (dist > 8) {
          mouseDragStartPosRef.current = null;
          try {
            window.getSelection()?.removeAllRanges();
          } catch (_) {}
          handleViolation(
            'TEXT_SELECTION_ATTEMPT',
            'Siswa terdeteksi mencoba menyeret kursor untuk mem-block / menyeleksi teks soal ujian di Laptop'
          );
        }
      } else {
        mouseDragStartPosRef.current = null;
      }
    };

    const handleMouseUp = () => {
      mouseDragStartPosRef.current = null;
    };

    // ========================================================
    // SENSOR GLOBAL: SELECTION CHANGE (ANTI-BLOCK TEKS MUTLAK)
    // ========================================================
    const handleSelectionChange = () => {
      if (isSubmittedRef.current || isLockedRef.current) return;
      if (Date.now() < gracePeriodUntilRef.current) return;

      const sel = window.getSelection();
      if (sel && sel.toString().trim().length > 0) {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          return;
        }
        try {
          sel.removeAllRanges();
        } catch (_) {}
        handleViolation(
          'TEXT_SELECTION_ATTEMPT',
          'Siswa terdeteksi mencoba mem-block / menyeleksi teks lembar soal ujian'
        );
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
      if (e.button === 1 || e.button === 2) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // ========================================================
    // SENSOR 6: BLOKIR OPERASI CLIPBOARD (COPY, PASTE, CUT)
    // ========================================================
    const handleCopy = (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        if (e.clipboardData) {
          e.clipboardData.setData('text/plain', '');
        }
      } catch (_) {}
      if (isSubmittedRef.current || isLockedRef.current) return false;
      handleViolation('COPY_ATTEMPT', 'Siswa mencoba menyalin (Copy) teks atau gambar dari lembar ujian');
      return false;
    };

    const handlePaste = (e) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (isSubmittedRef.current || isLockedRef.current) return false;
      handleViolation('PASTE_ATTEMPT', 'Siswa mencoba menempelkan (Paste) teks dari luar ke lembar ujian');
      return false;
    };

    const handleCut = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isSubmittedRef.current || isLockedRef.current) return false;
      handleViolation('CUT_ATTEMPT', 'Siswa mencoba memotong (Cut) konten lembar ujian');
      return false;
    };

    // ========================================================
    // SENSOR 7: BLOKIR DRAG AND DROP TEKS / GAMBAR
    // ========================================================
    const handleSelectStart = (e) => {
      const activeEl = document.activeElement;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
        return true;
      }
      e.preventDefault();
      return false;
    };

    const handleDragStart = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // ========================================================
    // SENSOR 8: PINTASAN KEYBOARD (DESKTOP & TOMBOL FISIK SMARTPHONE)
    // ========================================================
    const handleKeyDown = (e) => {
      if (isSubmittedRef.current || isLockedRef.current) return;

      const isCtrlOrMeta = e.ctrlKey || e.metaKey;
      const key = e.key ? e.key.toLowerCase() : '';
      const keyCode = e.keyCode || e.which;

      // 1. Tombol Fisik Smartphone (Volume Down / Volume Up saat kombinasi Power)
      const isVolumeKey =
        ['audiovolumedown', 'audiovolumeup', 'volumedown', 'volumeup'].includes(key) ||
        ['audiovolumedown', 'audiovolumeup', 'volumedown', 'volumeup'].includes(e.code?.toLowerCase()) ||
        keyCode === 24 || keyCode === 25 || keyCode === 174 || keyCode === 175;

      if (isVolumeKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
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

      // 4. Pintasan Perekaman Layar (Screen Recording di Laptop / Desktop)
      const isScreenRecordingShortcut =
        ((isCtrlOrMeta || e.altKey) && e.shiftKey && key === 'r') ||
        (isCtrlOrMeta && e.altKey && key === 'r') ||
        (e.metaKey && e.shiftKey && key === '5') ||
        (isCtrlOrMeta && key === 'g') ||
        ((isCtrlOrMeta || e.altKey) && key === 'g');

      if (isScreenRecordingShortcut) {
        e.preventDefault();
        e.stopPropagation();
        if (onScreenshotBlocked) {
          onScreenshotBlocked('Perekaman layar diblokir! Layar ujian Anda dibekukan.');
        }
        handleViolation(
          'SCREEN_RECORDING_ATTEMPT',
          'Siswa terdeteksi mencoba mengaktifkan perekaman layar laptop (Xbox Game Bar / Screen Recorder)'
        );
        return false;
      }

      // 5. Developer Tools: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (
        e.key === 'F12' ||
        keyCode === 123 ||
        (isCtrlOrMeta && e.shiftKey && ['i', 'j', 'c'].includes(key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        handleViolation(
          'DEVTOOLS_ATTEMPT',
          'Siswa mencoba membuka Developer Tools / Inspect Element'
        );
        return false;
      }

      // 6. Navigation Lock: Alt+Left, Alt+Right, Backspace
      if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      if (e.key === 'Backspace') {
        const activeEl = document.activeElement;
        const isInputField =
          activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            activeEl.isContentEditable);
        if (!isInputField) {
          e.preventDefault();
          return false;
        }
      }

      // 7. Shortcut Refresh: F5, Ctrl+R, Ctrl+F5
      if (e.key === 'F5' || keyCode === 116 || (isCtrlOrMeta && key === 'r')) {
        e.preventDefault();
        e.stopPropagation();
        alert('Fitur muat ulang (Refresh) dinonaktifkan demi menjaga status ujian Anda.');
        return false;
      }

      // 8. Shortcut Copy: Ctrl+C / Cmd+C
      if (isCtrlOrMeta && key === 'c') {
        e.preventDefault();
        e.stopPropagation();
        handleViolation('COPY_ATTEMPT', 'Siswa mencoba menyalin teks soal menggunakan shortcut (Ctrl+C)');
        return false;
      }

      // 9. Shortcut Paste: Ctrl+V / Cmd+V
      if (isCtrlOrMeta && key === 'v') {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        handleViolation('PASTE_ATTEMPT', 'Siswa mencoba menempelkan teks menggunakan shortcut (Ctrl+V)');
        return false;
      }

      // 10. Shortcut Cut: Ctrl+X / Cmd+X
      if (isCtrlOrMeta && key === 'x') {
        e.preventDefault();
        e.stopPropagation();
        handleViolation('CUT_ATTEMPT', 'Siswa mencoba memotong teks menggunakan shortcut (Ctrl+X)');
        return false;
      }

      // 11. Shortcut Select All: Ctrl+A / Cmd+A
      if (isCtrlOrMeta && key === 'a') {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        handleViolation(
          'SELECT_ALL_ATTEMPT',
          'Siswa mencoba menyeleksi seluruh halaman soal menggunakan shortcut (Ctrl+A)'
        );
        return false;
      }

      // 12. Shortcut Print: Ctrl+P / Cmd+P
      if (isCtrlOrMeta && key === 'p') {
        e.preventDefault();
        e.stopPropagation();
        handleViolation(
          'PRINT_ATTEMPT',
          'Siswa mencoba mencetak lembar soal ujian (Shortcut Ctrl+P)'
        );
        return false;
      }

      // 13. Shortcut View Source: Ctrl+U / Cmd+U
      if (isCtrlOrMeta && key === 'u') {
        e.preventDefault();
        e.stopPropagation();
        handleViolation(
          'VIEW_SOURCE_ATTEMPT',
          'Siswa mencoba melihat kode sumber halaman ujian (Shortcut Ctrl+U)'
        );
        return false;
      }

      // 14. Shortcut Save Page: Ctrl+S / Cmd+S
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

    const handleKeyUpOrPress = (e) => {
      if (isSubmittedRef.current || isLockedRef.current) return;

      const key = e.key ? e.key.toLowerCase() : '';
      const keyCode = e.keyCode || e.which;
      const isVolumeKey =
        ['audiovolumedown', 'audiovolumeup', 'volumedown', 'volumeup'].includes(key) ||
        ['audiovolumedown', 'audiovolumeup', 'volumedown', 'volumeup'].includes(e.code?.toLowerCase()) ||
        keyCode === 24 || keyCode === 25 || keyCode === 174 || keyCode === 175;

      if (isVolumeKey) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleViolation(
          'SCREENSHOT_HARDWARE_BUTTON',
          'Siswa terdeteksi menekan kombinasi tombol fisik screenshot (Volume/Power) di HP'
        );
      }
    };

    // ========================================================
    // SENSOR: PENCEGAHAN API PEREKAMAN LAYAR BROWSER (WEBRTC CAPTURE)
    // ========================================================
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      try {
        navigator.mediaDevices.getDisplayMedia = async function() {
          handleViolation(
            'SCREEN_RECORDING_ATTEMPT',
            'Siswa terdeteksi mencoba mengaktifkan perekaman layar (Screen Recording / Display Media Capture)'
          );
          throw new Error('Screen recording is strictly prohibited during exam!');
        };
      } catch (_) {}
    }

    // ========================================================
    // SENSOR 9: BLOKIR NAVIGASI BACK BROWSER & BEFOREUNLOAD
    // ========================================================
    window.history.pushState(null, null, window.location.href);

    const handlePopState = () => {
      window.history.pushState(null, null, window.location.href);
      alert('Ujian sedang berlangsung! Gunakan tombol Selesai Ujian di bar atas untuk mengakhiri sesi.');
    };

    const handleBeforeUnload = (e) => {
      if (!isSubmittedRef.current) {
        e.preventDefault();
        e.returnValue = 'Ujian sedang berlangsung. Jika Anda keluar, hasil ujian Anda akan terkunci!';
        return e.returnValue;
      }
    };

    // ========================================================
    // SENSOR 10: FAST INTEGRITY HEARTBEAT MONITOR (DAEMON 200ms)
    // Memeriksa Kehilangan Fokus OS (Gemini Live / Ambient Glow / Side Panels), DevTools, & Split Screen
    // ========================================================
    const heartbeatInterval = setInterval(() => {
      if (isSubmittedRef.current || isLockedRef.current) return;
      if (Date.now() < gracePeriodUntilRef.current) return;

      // ----------------------------------------------------
      // SENSOR 10A: DevTools Resize Monitor (Hanya Desktop)
      // ----------------------------------------------------
      if (!isMobileDevice()) {
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
      }

      // ----------------------------------------------------
      // SENSOR 10B: Deteksi Kehilangan Fokus OS & Gemini Live Floating Bar
      // Memeriksa jika jendela peramban kehilangan fokus interaksi OS secara persisten (> 800ms)
      // ----------------------------------------------------
      if (isIOSDevice()) {
        // Pada iOS Safari, document.hasFocus() kerap mengembalikan false palsu (WebKit bug).
        // Oleh karena itu, pengawasan di iOS difokuskan pada event visibilityState (100% akurat saat keluar).
        if (document.visibilityState === 'hidden' || document.hidden) {
          consecutiveBlurChecksRef.current += 1;
          if (consecutiveBlurChecksRef.current >= 2) {
            consecutiveBlurChecksRef.current = 0;
            handleViolation(
              'APP_SWITCH',
              'Siswa terdeteksi keluar dari layar ujian atau beralih aplikasi di HP'
            );
            return;
          }
        } else {
          consecutiveBlurChecksRef.current = 0;
        }
      } else {
        const activeEl = document.activeElement;
        const isFocusInsideIframe = activeEl && (activeEl.tagName === 'IFRAME' || activeEl.closest('iframe'));

        // Jika fokus berada di dalam iframe sah Google Form/MS Teams, abaikan
        if (isFocusInsideIframe) {
          consecutiveBlurChecksRef.current = 0;
        } else {
          const hasFocus = typeof document.hasFocus === 'function' ? document.hasFocus() : true;
          if (!hasFocus) {
            consecutiveBlurChecksRef.current += 1;
            // Kehilangan fokus persisten selama 2-3 siklus beruntun (~400ms - 500ms)
            if (consecutiveBlurChecksRef.current >= 2) {
              consecutiveBlurChecksRef.current = 0;
              if (document.visibilityState === 'visible') {
                handleViolation(
                  'FLOATING_WINDOW_ATTEMPT',
                  isMobileDevice()
                    ? 'Siswa terdeteksi mengaktifkan asisten suara / jendela mengambang (Gemini Live / Google Assistant)'
                    : 'Siswa terdeteksi membuka panel samping peramban (Gemini / Copilot) atau jendela aplikasi lain di Laptop'
                );
              } else {
                handleViolation(
                  isMobileDevice() ? 'APP_SWITCH' : 'TAB_SWITCH',
                  isMobileDevice()
                    ? 'Siswa terdeteksi keluar dari layar ujian atau beralih aplikasi di HP'
                    : 'Siswa terdeteksi berpindah tab peramban atau meminimalkan browser ujian'
                );
              }
              return;
            }
          } else {
            consecutiveBlurChecksRef.current = 0;
          }
        }
      }

      // ----------------------------------------------------
      // SENSOR 10C: Deteksi Mode Layar Belah (Split Screen di HP)
      // ----------------------------------------------------
      if (isMobileDevice() && !isIOSDevice()) {
        const isFullscreen = Boolean(
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement
        );

        const screenHeight = window.screen.height || window.screen.availHeight || 1;
        const heightRatio = window.innerHeight / screenHeight;

        // Abaikan jika virtual keyboard sedang aktif pada input native
        const isNativeInputActive = Boolean(
          document.activeElement && 
          (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')
        );

        if (!isFullscreen && heightRatio < 0.58 && !isNativeInputActive) {
          handleViolation(
            'SPLIT_SCREEN_ATTEMPT',
            'Siswa terdeteksi mengaktifkan mode layar belah (Split Screen) di HP'
          );
        }
      }
    }, 200);

    // ========================================================
    // REGISTRASI SELURUH EVENT LISTENER SISTEM KEAMANAN
    // ========================================================
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    // Touch events untuk screenshot gesture 3 jari nyata & proteksi HP
    window.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false });
    document.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false });
    if (document.documentElement) {
      document.documentElement.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false });
    }

    window.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false });
    document.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false });
    if (document.documentElement) {
      document.documentElement.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false });
    }

    window.addEventListener('touchend', handleTouchEnd, { capture: true, passive: true });
    document.addEventListener('touchend', handleTouchEnd, { capture: true, passive: true });

    window.addEventListener('touchcancel', handleTouchEnd, { capture: true, passive: true });
    document.addEventListener('touchcancel', handleTouchEnd, { capture: true, passive: true });

    // Mouse & context menu events
    window.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('mousemove', handleMouseMove, true);
    window.addEventListener('mouseup', handleMouseUp, true);
    document.addEventListener('mouseup', handleMouseUp, true);

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
    document.addEventListener('selectionchange', handleSelectionChange, true);
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
    window.addEventListener('keyup', handleKeyUpOrPress, true);
    document.addEventListener('keyup', handleKeyUpOrPress, true);
    window.addEventListener('keypress', handleKeyUpOrPress, true);
    document.addEventListener('keypress', handleKeyUpOrPress, true);

    // Navigation events
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
      window.removeEventListener('focus', handleWindowFocus);

      window.removeEventListener('touchstart', handleTouchStart, { capture: true });
      document.removeEventListener('touchstart', handleTouchStart, { capture: true });
      if (document.documentElement) {
        document.documentElement.removeEventListener('touchstart', handleTouchStart, { capture: true });
      }

      window.removeEventListener('touchmove', handleTouchMove, { capture: true });
      document.removeEventListener('touchmove', handleTouchMove, { capture: true });
      if (document.documentElement) {
        document.documentElement.removeEventListener('touchmove', handleTouchMove, { capture: true });
      }

      window.removeEventListener('touchend', handleTouchEnd, { capture: true });
      document.removeEventListener('touchend', handleTouchEnd, { capture: true });

      window.removeEventListener('touchcancel', handleTouchEnd, { capture: true });
      document.removeEventListener('touchcancel', handleTouchEnd, { capture: true });

      window.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('mousedown', handleMouseDown, true);
      window.removeEventListener('mousemove', handleMouseMove, true);
      document.removeEventListener('mousemove', handleMouseMove, true);
      window.removeEventListener('mouseup', handleMouseUp, true);
      document.removeEventListener('mouseup', handleMouseUp, true);

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
      document.removeEventListener('selectionchange', handleSelectionChange, true);
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
      window.removeEventListener('keyup', handleKeyUpOrPress, true);
      document.removeEventListener('keyup', handleKeyUpOrPress, true);
      window.removeEventListener('keypress', handleKeyUpOrPress, true);
      document.removeEventListener('keypress', handleKeyUpOrPress, true);

      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isExamActive, handleViolation, onScreenshotBlocked]);
}
