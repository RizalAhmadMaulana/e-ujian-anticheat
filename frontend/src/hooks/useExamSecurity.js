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
  // Berikan masa tenggang awal 6 detik saat siswa baru masuk ke arena ujian
  // Menjamin inisialisasi fullscreen, orientasi, dan rendering awal tidak memicu false lock
  const gracePeriodUntilRef = useRef(Date.now() + 6000);
  const prevIsLockedRef = useRef(activeAttempt.isLocked);
  const consecutiveBlurChecksRef = useRef(0);
  const edgeSwipeCandidateRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressTouchPosRef = useRef(null);
  const mouseDragStartPosRef = useRef(null);

  useEffect(() => {
    isSubmittedRef.current = Boolean(activeAttempt.examSubmittedAt);
    isLockedRef.current = activeAttempt.isLocked;

    // Saat status berubah dari LOCKED (true) menjadi UNLOCKED (false):
    // Berikan grace period 5 detik agar browser & siswa dapat memulihkan fullscreen & fokus tanpa false positive
    // Serta pulihkan efek pengaburan blackout jika sebelumnya aktif
    if (prevIsLockedRef.current === true && activeAttempt.isLocked === false) {
      gracePeriodUntilRef.current = Date.now() + 5000;
      consecutiveBlurChecksRef.current = 0;
      edgeSwipeCandidateRef.current = null;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      longPressTouchPosRef.current = null;
      mouseDragStartPosRef.current = null;
      try {
        document.documentElement.style.filter = '';
        document.body.style.backgroundColor = '';
        const shield = document.getElementById('instant-anti-screenshot-shield');
        if (shield) {
          shield.style.display = 'none';
        }
      } catch (_) {}
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

    // Helper: Pastikan style filter selalu bersih
    const ensureCleanDisplay = () => {
      try {
        document.documentElement.style.filter = '';
        document.documentElement.style.backdropFilter = '';
        document.body.style.filter = '';
        document.body.style.backgroundColor = '';
      } catch (_) {}
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
    // Ketika siswa meminimalkan browser, membuka tab lain, atau beralih aplikasi
    // ========================================================
    const handleVisibilityChange = () => {
      ensureCleanDisplay();

      if (document.visibilityState === 'hidden' || document.hidden) {
        if (isSubmittedRef.current || isLockedRef.current) return;

        // Seketika kunci saat browser keluar / hidden agar saat siswa kembali, layar kunci sudah siap & tampil
        handleViolation(
          isMobileDevice() ? 'APP_SWITCH' : 'TAB_SWITCH',
          isMobileDevice()
            ? 'Siswa terdeteksi keluar dari layar ujian atau beralih aplikasi di HP'
            : 'Siswa terdeteksi berpindah tab peramban atau meminimalkan browser ujian'
        );
      }
    };

    // ========================================================
    // SENSOR 3: ANTI-APP SWITCH, MODE MENGAMBANG & LOSS OF FOCUS (window.onblur / onfocus)
    // Diberi toleransi terukur agar aman terhadap sentuhan iframe Google/Office Form,
    // namun secara instan mengunci jika terdeteksi Mode Mengambang (Floating Window / Sidebar)
    // ========================================================
    let blurTimeout = null;
    const handleWindowBlur = () => {
      if (blurTimeout) clearTimeout(blurTimeout);
      blurTimeout = setTimeout(() => {
        if (isSubmittedRef.current || isLockedRef.current) return;

        // Bersihkan clipboard sistem seketika saat peramban kehilangan fokus untuk mencegah paste ke AI/aplikasi luar
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('');
          }
        } catch (_) {}

        // Jika dokumen masih terlihat (visible):
        // Periksa apakah fokus sah berpindah ke dalam iframe (Google Form / Office Form).
        // CATATAN KRUSIAL: Jika fokus berada di dalam iframe internal, dokumen peramban TETAP memegang fokus OS (document.hasFocus() === true).
        // Sebaliknya, jika siswa membuka Mode Mengambang (Floating Window seperti Gemini / WhatsApp / Bilah Sisi Xiaomi/Samsung),
        // fokus sistem operasi berpindah ke aplikasi luar sehingga document.hasFocus() menjadi FALSE!
        if (document.visibilityState === 'visible') {
          const activeEl = document.activeElement;
          const isFocusInsideIframe = activeEl && (activeEl.tagName === 'IFRAME' || activeEl.closest('iframe'));
          
          if (isFocusInsideIframe && document.hasFocus()) {
            // Fokus sah di dalam lembar soal iframe
            return;
          }

          // Jika dokumen terlihat tapi kehilangan fokus OS (Mode Mengambang / Floating Window / Sidebar / Bilah Notifikasi)
          if (!document.hasFocus()) {
            handleViolation(
              isMobileDevice() ? 'FLOATING_WINDOW_ATTEMPT' : 'APP_SWITCH',
              isMobileDevice()
                ? 'Siswa terdeteksi membuka mode mengambang (Floating Window), bilah sisi, atau bilah notifikasi di HP'
                : 'Siswa terdeteksi beralih ke jendela aplikasi lain di luar peramban ujian (Alt+Tab / Taskbar)'
            );
            return;
          }
        }

        // Jika dokumen benar-benar disembunyikan / diminimalkan (Beralih Aplikasi Total / Pindah Tab)
        if (document.visibilityState === 'hidden' || document.hidden || !document.hasFocus()) {
          handleViolation(
            isMobileDevice() ? 'APP_SWITCH' : 'TAB_SWITCH',
            isMobileDevice()
              ? 'Siswa terdeteksi keluar dari layar ujian atau beralih aplikasi di HP'
              : 'Siswa terdeteksi berpindah tab peramban atau meminimalkan browser ujian'
          );
        }
      }, 700);
    };

    const handleWindowFocus = () => {
      ensureCleanDisplay();
      consecutiveBlurChecksRef.current = 0;
      if (document.hasFocus() && document.visibilityState === 'visible') {
        if (blurTimeout) {
          clearTimeout(blurTimeout);
          blurTimeout = null;
        }
      }
    };

    // ========================================================
    // SENSOR 4: MOBILE (HP) - DETEKSI SCREENSHOT GESTURE 3 JARI, SMART SIDEBAR SWIPE, & ANTI-BLOCK TEKS (LONG-PRESS)
    // ========================================================
    const handleTouchStart = (e) => {
      if (isSubmittedRef.current || isLockedRef.current) return;
      if (Date.now() < gracePeriodUntilRef.current) return;

      // 1. Deteksi Gesture Screenshot 3 Jari di HP
      if (e.touches && e.touches.length >= 3) {
        e.preventDefault();
        e.stopPropagation();
        if (onScreenshotBlocked) {
          onScreenshotBlocked('Tangkapan layar 3 jari diblokir! Akses ujian Anda dibekukan.');
        }
        handleViolation(
          'SCREENSHOT_3FINGER_GESTURE',
          'Siswa terdeteksi mencoba tangkapan layar (Screenshot) menggunakan gesture usap 3 jari di HP'
        );
        return false;
      }

      // 2. Deteksi Gesture Usapan Tepi Layar (Memicu Bilah Sisi / Sidebar Aplikasi Mengambang di HP)
      if (e.touches && e.touches.length === 1 && isMobileDevice()) {
        const touch = e.touches[0];
        const screenW = window.innerWidth || window.screen.width;
        // Sentuhan dimulai di tepi ekstrem (kurang dari 20px dari tepi kiri atau kanan)
        if (touch.clientX < 20 || touch.clientX > (screenW - 20)) {
          edgeSwipeCandidateRef.current = {
            startX: touch.clientX,
            startY: touch.clientY,
            startTime: Date.now()
          };
        } else {
          edgeSwipeCandidateRef.current = null;
        }

        // 3. Pencegahan & Deteksi Long-Press untuk Mem-Block / Menyeleksi Teks Soal di HP
        // Di smartphone, menyeleksi teks hanya dapat dilakukan dengan menahan sentuhan (long-press).
        // Ambang batas long-press Android adalah 400-500ms.
        // Dengan timer 320ms, sistem mencegat dan membatalkan seleksi SEBELUM Android memicu seleksi teks dan Google Touch to Search / Pintasan AI!
        longPressTouchPosRef.current = { x: touch.clientX, y: touch.clientY };
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
        }
        longPressTimerRef.current = setTimeout(() => {
          if (isSubmittedRef.current || isLockedRef.current) return;
          if (Date.now() < gracePeriodUntilRef.current) return;

          // Hapus seleksi teks seketika dari peramban
          try {
            window.getSelection()?.removeAllRanges();
          } catch (_) {}

          handleViolation(
            'TEXT_SELECTION_ATTEMPT',
            'Siswa terdeteksi mencoba menahan sentuhan untuk mem-block / menyeleksi teks soal ujian di HP'
          );
        }, 320);
      }
    };

    const handleTouchMove = (e) => {
      if (isSubmittedRef.current || isLockedRef.current) return;
      if (Date.now() < gracePeriodUntilRef.current) return;

      // 1. Gesture Screenshot 3 Jari
      if (e.touches && e.touches.length >= 3) {
        e.preventDefault();
        e.stopPropagation();
        if (onScreenshotBlocked) {
          onScreenshotBlocked('Tangkapan layar 3 jari diblokir! Akses ujian Anda dibekukan.');
        }
        handleViolation(
          'SCREENSHOT_3FINGER_GESTURE',
          'Siswa terdeteksi mencoba tangkapan layar (Screenshot) menggunakan gesture usap 3 jari di HP'
        );
        return false;
      }

      // 2. Deteksi Tarikan Tepi Layar ke Arah Tengah (Smart Sidebar Gesture Memicu Jendela Mengambang)
      if (edgeSwipeCandidateRef.current && e.touches && e.touches.length === 1 && isMobileDevice()) {
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - edgeSwipeCandidateRef.current.startX);
        const deltaY = Math.abs(touch.clientY - edgeSwipeCandidateRef.current.startY);

        // Jika gerakan horizontal mengarah ke dalam > 30px dalam waktu cepat (< 500ms)
        if (deltaX > 30 && deltaX > deltaY * 1.3 && (Date.now() - edgeSwipeCandidateRef.current.startTime) < 500) {
          edgeSwipeCandidateRef.current = null;
          handleViolation(
            'FLOATING_WINDOW_ATTEMPT',
            'Siswa terdeteksi mengusap tepi layar untuk membuka bilah sisi aplikasi mengambang (Smart Sidebar / Floating Window) di HP'
          );
          return false;
        }
      }

      // 3. Jika jari bergerak > 8px (scrolling lembar soal wajar), batalkan timer long-press
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
      edgeSwipeCandidateRef.current = null;
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

      // Izinkan pada input teks jawaban sah
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.button === 0) { // Tombol klik kiri
        mouseDragStartPosRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseMove = (e) => {
      if (!mouseDragStartPosRef.current) return;
      if (isSubmittedRef.current || isLockedRef.current) return;
      if (Date.now() < gracePeriodUntilRef.current) return;

      // Jika tombol kiri ditekan sambil menyeret kursor (e.buttons === 1)
      if (e.buttons === 1) {
        const dist = Math.hypot(
          e.clientX - mouseDragStartPosRef.current.x,
          e.clientY - mouseDragStartPosRef.current.y
        );
        if (dist > 14) { // Menyeret kursor lebih dari 14px untuk mem-block teks soal
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
        // Izinkan seleksi jika berada di dalam input jawaban yang sah
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
      try {
        window.getSelection()?.removeAllRanges();
      } catch (_) {}
      handleViolation(
        'TEXT_SELECTION_ATTEMPT',
        'Siswa terdeteksi mencoba mem-block / menyeleksi teks soal ujian'
      );
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
        ['audiovolumedown', 'audiovolumeup', 'volumedown', 'volumeup'].includes(e.code?.toLowerCase()) ||
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
    // SENSOR 10: CONTINUOUS INTEGRITY HEARTBEAT MONITOR (DAEMON 400ms)
    // Memeriksa DevTools (Desktop), Mode Mengambang (Mobile), dan Mode Layar Belah (Split Screen)
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
      // SENSOR 10B: Deteksi Mode Mengambang (Floating Window) di HP
      // Memantau jika peramban kehilangan fokus OS secara persisten (> 800ms)
      // ----------------------------------------------------
      if (isMobileDevice()) {
        if (!document.hasFocus()) {
          consecutiveBlurChecksRef.current += 1;
          // Jika kehilangan fokus selama 2 siklus beruntun (~800ms)
          if (consecutiveBlurChecksRef.current >= 2) {
            consecutiveBlurChecksRef.current = 0;
            if (document.visibilityState === 'visible') {
              handleViolation(
                'FLOATING_WINDOW_ATTEMPT',
                'Siswa terdeteksi membuka mode mengambang (Floating Window) atau aplikasi lain di atas layar ujian'
              );
            } else {
              handleViolation(
                'APP_SWITCH',
                'Siswa terdeteksi keluar dari layar ujian atau beralih aplikasi di HP'
              );
            }
            return;
          }
        } else {
          consecutiveBlurChecksRef.current = 0;
        }

        // ----------------------------------------------------
        // SENSOR 10C: Deteksi Mode Layar Belah (Split Screen / Multi-Window di HP)
        // ----------------------------------------------------
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

        // Pada mode layar belah Android, fullscreen terlepas otomatis dan tinggi innerHeight anjlok < 58% layar
        if (!isFullscreen && heightRatio < 0.58 && !isNativeInputActive) {
          handleViolation(
            'SPLIT_SCREEN_ATTEMPT',
            'Siswa terdeteksi mengaktifkan mode layar belah (Split Screen) di HP'
          );
        }
      }
    }, 400);

    // ========================================================
    // REGISTRASI LISTENER DENGAN CAPTURE MODE (PRIORITAS TERTINGGI)
    // ========================================================
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    // Touch events untuk screenshot HP
    window.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false });
    document.addEventListener('touchstart', handleTouchStart, { capture: true, passive: false });
    window.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false });
    document.addEventListener('touchmove', handleTouchMove, { capture: true, passive: false });
    window.addEventListener('touchend', handleTouchEnd, { capture: true, passive: true });
    document.addEventListener('touchend', handleTouchEnd, { capture: true, passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { capture: true, passive: true });
    document.addEventListener('touchcancel', handleTouchEnd, { capture: true, passive: true });

    // Mouse & context menu events (termasuk deteksi drag-selection teks pada desktop)
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
      window.removeEventListener('touchmove', handleTouchMove, { capture: true });
      document.removeEventListener('touchmove', handleTouchMove, { capture: true });
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

      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isExamActive, handleViolation, onScreenshotBlocked]);
}
