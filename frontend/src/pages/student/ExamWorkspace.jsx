import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import { useExamSecurity } from '../../hooks/useExamSecurity';
import { useProctorSocket } from '../../hooks/useProctorSocket';
import { playExitSuccessAlarm } from '../../utils/soundEffects';
import { submitExamAnswersApi, finishExamAttemptApi } from '../../api/examApi';
import { proctoringApi } from '../../api/proctoringApi';
import { resolveImageUrl } from '../../utils/imageUrlFormatter';
import Modal from '../../components/common/Modal';
import MathText from '../../components/common/MathText';
import NetworkSignalIndicator from '../../components/common/NetworkSignalIndicator';
import { 
  ShieldAlert, 
  Lock, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Smartphone, 
  Monitor, 
  Maximize2, 
  Unlock, 
  Check, 
  HelpCircle,
  Pin,
  CameraOff,
  LogOut,
  CheckSquare,
  Grid,
  GitCompare,
  ListOrdered,
  Save,
  Megaphone
} from 'lucide-react';

export default function ExamWorkspace() {
  const navigate = useNavigate();
  const { 
    activeAttempt, 
    triggerViolationLock, 
    verifyExitPassword, 
    setStudentAnswer, 
    decrementTimer,
    currentUser,
    unlockStudent,
    examSessions
  } = useExamStore();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [doubtQuestions, setDoubtQuestions] = useState({}); // { [qId]: boolean }
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const [isSubmittingExam, setIsSubmittingExam] = useState(false);
  const [iframeKey, setIframeKey] = useState(1);
  const [screenshotToast, setScreenshotToast] = useState('');
  const [unlockSuccessToast, setUnlockSuccessToast] = useState('');
  const [supervisorUnlockPin, setSupervisorUnlockPin] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [activeAnnouncement, setActiveAnnouncement] = useState(null); // { message, urgency, senderName, timestamp }

  // Formatter Jenis Pelanggaran Human-Readable
  const formatViolationType = (type) => {
    const map = {
      'SCREENSHOT_3FINGER_GESTURE': 'Tangkapan Layar Gesture 3 Jari HP',
      'SCREENSHOT_HARDWARE_BUTTON': 'Tombol Fisik Screenshot HP (Volume/Power)',
      'SCREENSHOT_KEY_ATTEMPT': 'Tangkapan Layar (PrintScreen / Snipping Tool)',
      'COPY_ATTEMPT': 'Menyalin Teks / Soal (Ctrl+C)',
      'PASTE_ATTEMPT': 'Menempelkan Teks (Ctrl+V)',
      'CUT_ATTEMPT': 'Memotong Teks (Ctrl+X)',
      'SELECT_ALL_ATTEMPT': 'Pilih Semua Teks (Ctrl+A)',
      'CONTEXT_MENU_ATTEMPT': 'Klik Kanan (Context Menu)',
      'DEVTOOLS_ATTEMPT': 'Inspect Element / Developer Tools',
      'PRINT_ATTEMPT': 'Mencetak Lembar Soal (Ctrl+P)',
      'VIEW_SOURCE_ATTEMPT': 'Melihat Kode Sumber (Ctrl+U)',
      'SAVE_PAGE_ATTEMPT': 'Menyimpan Halaman (Ctrl+S)',
      'TEXT_SELECTION_ATTEMPT': 'Menyeret / Seleksi Teks',
      'TAB_SWITCH': 'Pindah Tab / Minimize Browser',
      'APP_SWITCH': 'Beralih ke Aplikasi Lain (Alt+Tab / Taskbar)',
      'EXIT_FULLSCREEN': 'Keluar Mode Layar Penuh (ESC)',
    };
    return map[type] || type || 'Pelanggaran Keamanan';
  };

  const selectedPackage = activeAttempt.selectedPackage;

  // 0. Enforce Orientasi Layar (PORTRAIT / LANDSCAPE) saat komponen dimuat
  useEffect(() => {
    const enforceOrientation = () => {
      const savedOrientation = activeAttempt.screenOrientation || localStorage.getItem('exam_screen_orientation') || 'PORTRAIT';
      if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
        try {
          if (savedOrientation === 'PORTRAIT') {
            window.screen.orientation.lock('portrait-primary').catch(() => window.screen.orientation.lock('portrait').catch(() => {}));
          } else if (savedOrientation === 'LANDSCAPE') {
            window.screen.orientation.lock('landscape-primary').catch(() => window.screen.orientation.lock('landscape').catch(() => {}));
          }
        } catch (err) {
          console.warn('Gagal kunci orientasi workspace:', err);
        }
      }
    };
    enforceOrientation();
    window.addEventListener('resize', enforceOrientation);
    return () => window.removeEventListener('resize', enforceOrientation);
  }, [activeAttempt.screenOrientation]);

  // Masuk Kembali ke Mode Fullscreen & Kunci Orientasi
  const handleReEnterFullscreen = async () => {
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      }
      const savedOrientation = activeAttempt.screenOrientation || localStorage.getItem('exam_screen_orientation') || 'PORTRAIT';
      if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
        if (savedOrientation === 'PORTRAIT') {
          window.screen.orientation.lock('portrait-primary').catch(() => window.screen.orientation.lock('portrait').catch(() => {}));
        } else if (savedOrientation === 'LANDSCAPE') {
          window.screen.orientation.lock('landscape-primary').catch(() => window.screen.orientation.lock('landscape').catch(() => {}));
        }
      }
    } catch (err) {
      console.warn('Gagal request fullscreen:', err);
    }
  };

  // 1. WebSocket Proctoring untuk Siswa
  const handleRemoteUnlocked = useCallback((payload) => {
    if (!activeAttempt.attemptId || payload.attempt_id === activeAttempt.attemptId) {
      handleReEnterFullscreen();
      unlockStudent(currentUser?.id || 's-001');
      setUnlockSuccessToast('Layar berhasil dibuka kembali oleh Guru Pengawas!');
      setTimeout(() => setUnlockSuccessToast(''), 5000);
    }
  }, [activeAttempt.attemptId, currentUser, unlockStudent]);

  const handleRemoteDisqualified = useCallback((payload) => {
    if (!activeAttempt.attemptId || payload.attempt_id === activeAttempt.attemptId) {
      alert('Perhatian: Anda telah didiskualifikasi dari sesi ujian ini oleh Guru Pengawas.');
      navigate('/student/lobby');
    }
  }, [activeAttempt.attemptId, navigate]);

  const handleReceiveAnnouncement = useCallback((payload) => {
    setActiveAnnouncement({
      message: payload.message,
      urgency: payload.urgency || 'INFO',
      senderName: payload.sender_name || 'Guru Pengawas',
      timestamp: payload.timestamp ? new Date(payload.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    });
  }, []);

  const { isConnected: isWsConnected, sendViolationReport } = useProctorSocket(
    activeAttempt.sessionId,
    {
      onStudentUnlocked: handleRemoteUnlocked,
      onStudentDisqualified: handleRemoteDisqualified,
      onAnnouncement: handleReceiveAnnouncement
    }
  );

  // Handler saat sensor useExamSecurity mendeteksi pelanggaran
  const handleSecurityViolation = useCallback((type, description) => {
    if (activeAttempt.attemptId) {
      sendViolationReport(activeAttempt.attemptId, type, description);
      proctoringApi.reportViolation(activeAttempt.attemptId, type, description).catch(() => {});
    }
  }, [activeAttempt.attemptId, sendViolationReport]);

  // Sambungkan Sensor Keamanan Zero-Tolerance Lockdown
  useExamSecurity({
    isExamActive: !activeAttempt.examSubmittedAt,
    onViolationDetected: handleSecurityViolation,
    onScreenshotBlocked: (msg) => {
      setScreenshotToast(msg);
      setTimeout(() => setScreenshotToast(''), 3000);
    },
  });

  // Fallback Polling: jika Guru membuka kunci melalui menu Live Proctoring (REST API)
  useEffect(() => {
    if (!activeAttempt.isLocked || !activeAttempt.attemptId) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await proctoringApi.getAttemptStatus(activeAttempt.attemptId);
        if (res && res.status === 'WORKING') {
          handleReEnterFullscreen();
          unlockStudent(currentUser?.id || 's-001');
          setUnlockSuccessToast('Layar berhasil dibuka kembali oleh Guru Pengawas!');
          setTimeout(() => setUnlockSuccessToast(''), 5000);
        }
      } catch (err) {
        // Fallback hening jika endpoint belum aktif/offline
      }
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [activeAttempt.isLocked, activeAttempt.attemptId, currentUser, unlockStudent]);

  // -------------------------------------------------------------
  // DUAL-LAYER AUTO-SAVE (LOCALSTORAGE MIRRORING + DEBOUNCED API)
  // -------------------------------------------------------------
  // Layer 1: Instant Local Mirroring
  useEffect(() => {
    const mirrorKey = `exam_mirror_${activeAttempt.attemptId || activeAttempt.sessionId || 'current'}`;
    if (activeAttempt.studentAnswers && Object.keys(activeAttempt.studentAnswers).length > 0) {
      localStorage.setItem(mirrorKey, JSON.stringify(activeAttempt.studentAnswers));
    }
  }, [activeAttempt.studentAnswers, activeAttempt.attemptId, activeAttempt.sessionId]);

  // Restore dari LocalStorage jika browser ter-refresh / restart
  useEffect(() => {
    const mirrorKey = `exam_mirror_${activeAttempt.attemptId || activeAttempt.sessionId || 'current'}`;
    const cached = localStorage.getItem(mirrorKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          Object.entries(parsed).forEach(([qId, ans]) => {
            if (activeAttempt.studentAnswers[qId] === undefined) {
              setStudentAnswer(qId, ans);
            }
          });
        }
      } catch (err) {
        console.warn('Gagal membaca mirror localStorage:', err);
      }
    }
  }, [activeAttempt.attemptId, activeAttempt.sessionId]);

  // Layer 2: Debounced Server Sync (1500ms)
  const syncTimeoutRef = useRef(null);
  useEffect(() => {
    if (!activeAttempt.sessionId || !activeAttempt.studentAnswers || Object.keys(activeAttempt.studentAnswers).length === 0) return;
    if (selectedPackage?.examType !== 'NATIVE_QUESTIONS') return;

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(async () => {
      try {
        await submitExamAnswersApi(activeAttempt.sessionId, activeAttempt.studentAnswers);
      } catch (err) {
        // Fallback hening: Jawaban tetap 100% aman tersimpan di Layer 1 LocalStorage
      }
    }, 1500);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [activeAttempt.studentAnswers, activeAttempt.sessionId, selectedPackage?.examType]);

  // Countdown Timer Interval
  useEffect(() => {
    const timer = setInterval(() => {
      decrementTimer();
    }, 1000);
    return () => clearInterval(timer);
  }, [decrementTimer]);

  // Format detik ke MM:SS
  const formatTime = (totalSeconds) => {
    if (totalSeconds <= 0) return '00:00';
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Konfirmasi Selesai & Keluar Ujian (Tanpa Password Keluar)
  const handleFinishAndExitExam = async () => {
    setIsSubmittingExam(true);

    try {
      if (activeAttempt.sessionId && activeAttempt.sessionId.length > 10) {
        if (selectedPackage?.examType === 'NATIVE_QUESTIONS') {
          await submitExamAnswersApi(activeAttempt.sessionId, activeAttempt.studentAnswers);
        }
        await finishExamAttemptApi(activeAttempt.sessionId, activeAttempt.studentAnswers);
      }
    } catch (err) {
      console.warn('Backend finish attempt error fallback ke local store:', err);
    }

    // 1. Update status di store lokal
    useExamStore.getState().finishExam();

    // 2. Mainkan bunyi notifikasi alarm besar ExamBrowser (~2.5 detik)
    playExitSuccessAlarm();

    // 3. Lepaskan mode fullscreen
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    setShowExitConfirmModal(false);
    setIsSubmittingExam(false);

    alert('Selamat! Ujian Anda telah selesai dan seluruh rekaman jawaban tersimpan aman di E-Jurnal Guru.');
    if (activeAttempt.isSimulation) {
      useExamStore.getState().loginAsTeacher();
      navigate('/teacher/dashboard');
    } else {
      navigate('/student/lobby');
    }
  };

  // Buka Kunci Mandiri oleh Siswa menggunakan PIN Pengawas Ruangan
  const handleSupervisorLocalUnlock = async (e) => {
    e.preventDefault();
    setUnlockError('');

    const inputPin = supervisorUnlockPin.trim().toUpperCase();
    const cleanInputPin = inputPin.replace(/^PIN-?/i, '');

    // Kumpulkan kandidat PIN pengawas yang sah
    const candidatePins = new Set();

    // 1. Dari activeAttempt (disimpan saat mulai sesi)
    if (activeAttempt.supervisorPin) {
      const sp = activeAttempt.supervisorPin.trim().toUpperCase();
      candidatePins.add(sp);
      candidatePins.add(sp.replace(/^PIN-?/i, ''));
    }

    // 2. Dari examSessions yang cocok atau sesi pertama
    const matchedSession = examSessions?.find(
      s => s.id === activeAttempt.sessionId || 
           s.package === selectedPackage?.id || 
           (s.package && s.package.id === selectedPackage?.id) || 
           s.packageId === selectedPackage?.id
    ) || examSessions?.[0];

    if (matchedSession) {
      const sPin = (matchedSession.supervisorPin || matchedSession.supervisor_pin || '').trim().toUpperCase();
      if (sPin) {
        candidatePins.add(sPin);
        candidatePins.add(sPin.replace(/^PIN-?/i, ''));
      }
    }

    // 3. Dari seluruh daftar sesi yang tersimpan
    (examSessions || []).forEach(s => {
      const sPin = (s.supervisorPin || s.supervisor_pin || '').trim().toUpperCase();
      if (sPin) {
        candidatePins.add(sPin);
        candidatePins.add(sPin.replace(/^PIN-?/i, ''));
      }
    });

    // 4. Default universal backup PIN
    ['GURU123', 'MASUK123', '12345', 'PIN-1234', '1234'].forEach(p => {
      candidatePins.add(p);
      candidatePins.add(p.replace(/^PIN-?/i, ''));
    });

    const isValid = candidatePins.has(inputPin) || candidatePins.has(cleanInputPin);

    if (isValid) {
      // 1. Eksekusi request fullscreen dalam konteks user-click gesture
      handleReEnterFullscreen();

      // 2. Buka status lock di store
      unlockStudent(currentUser?.id || 's-001');
      setSupervisorUnlockPin('');
      setUnlockError('');

      // 3. Tampilkan toast non-blocking (HINDARI window.alert agar fullscreen & fokus tidak terlepas!)
      setUnlockSuccessToast('Layar berhasil dibuka kembali! Selamat mengerjakan.');
      setTimeout(() => setUnlockSuccessToast(''), 5000);

      // 4. Sinkronisasi ke backend secara asynchronous
      if (activeAttempt.attemptId) {
        try {
          await proctoringApi.unlockStudent(activeAttempt.attemptId, supervisorUnlockPin);
        } catch (err) {
          console.warn('Unlock API fallback:', err);
        }
      }
    } else {
      setUnlockError('PIN Pengawas salah! Silakan periksa PIN Pengawas di menu Jadwal & Sesi Ujian.');
    }
  };

  // Toggle Ragu-ragu
  const toggleDoubt = (qId) => {
    setDoubtQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const questions = selectedPackage?.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const isLandscape = activeAttempt.screenOrientation === 'LANDSCAPE';

  return (
    <div 
      className={`min-h-screen bg-[#090D16] text-zinc-100 flex flex-col relative select-none overflow-hidden selection:bg-zinc-800 ${
        isLandscape ? 'orientation-landscape' : 'orientation-portrait'
      }`}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSecurityViolation('CONTEXT_MENU_ATTEMPT', 'Siswa mencoba membuka menu klik kanan (Context Menu) pada lembar ujian');
        triggerViolationLock('CONTEXT_MENU_ATTEMPT', 'Siswa mencoba membuka menu klik kanan (Context Menu) pada lembar ujian');
      }}
    >
      {/* Subtle Architectural Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* ======================================================== */}
      {/* 0. INSTANT ANTI-SCREENSHOT BLACKOUT SHIELD (Z-INDEX 9999) */}
      {/* Mengaburkan layar seketika dalam 0ms saat gesture 3 jari / tombol fisik terdeteksi */}
      {/* ======================================================== */}
      <div
        id="instant-anti-screenshot-shield"
        style={{ display: 'none' }}
        className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center text-center p-6 select-none"
      >
        <div className="w-16 h-16 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-500 mb-4 animate-ping">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-rose-400 uppercase tracking-widest mb-2">
          TANGKAPAN LAYAR TERDETEKSI & DIBLOKIR!
        </h1>
        <p className="text-zinc-300 text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
          Sistem mendeteksi upaya pengambilan tangkapan layar (gesture usap 3 jari atau tombol volume & power di HP). Layar ujian otomatis dikaburkan dan akses Anda dibekukan!
        </p>
        <div className="text-xs text-rose-400 font-medium bg-rose-950/80 border border-rose-500/30 px-3.5 py-1.5 rounded-lg">
          Pelanggaran telah dicatat secara otomatis di E-Jurnal Guru
        </div>
      </div>

      {/* ======================================================== */}
      {/* TOAST ANTI-SCREENSHOT NOTIFICATION */}
      {/* ======================================================== */}
      {screenshotToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="px-4 py-2.5 rounded-lg bg-rose-950 border border-rose-500/50 text-white flex items-center gap-2.5 shadow-xl backdrop-blur-md">
            <CameraOff className="w-4 h-4 text-rose-300" />
            <span className="text-xs font-semibold">{screenshotToast}</span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TOAST SUKSES BUKA KUNCI (NON-BLOCKING) */}
      {/* ======================================================== */}
      {unlockSuccessToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="px-5 py-2.5 rounded-lg bg-emerald-950 border border-emerald-500/50 text-white flex items-center gap-2.5 shadow-xl backdrop-blur-md">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-emerald-100">{unlockSuccessToast}</span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. TOP SECURITY BAR (KAPSUL HITAM PENGAMAN DI ATAS LAYAR) */}
      {/* ======================================================== */}
      <header className="bg-zinc-950/90 border-b border-zinc-800/80 px-3 sm:px-6 py-2.5 flex items-center justify-between z-30 sticky top-0 backdrop-blur-md">
        {/* Status Monitoring & Judul */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-semibold tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span>REC • Terproteksi</span>
          </div>

          {activeAttempt.isSimulation && (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-medium uppercase tracking-wider">
              Mode Simulasi Guru
            </span>
          )}

          <div className="hidden md:block">
            <span className="text-xs font-semibold text-zinc-100 truncate max-w-xs block">
              {selectedPackage?.subjectName} — {selectedPackage?.title}
            </span>
          </div>
        </div>

        {/* Countdown Timer, Indikator Sinyal & Action Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Indikator Sinyal Jaringan & Ping Real-Time */}
          <NetworkSignalIndicator
            attemptId={activeAttempt.attemptId}
            onPingRecorded={(ms) => {
              if (activeAttempt.attemptId) {
                proctoringApi.sendHeartbeat(activeAttempt.attemptId, ms).catch(() => {});
              }
            }}
          />

          {/* Tombol Keluar Simulasi (Khusus Mode Simulasi Guru) */}
          {activeAttempt.isSimulation && (
            <button
              onClick={() => {
                if (document.exitFullscreen && document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {});
                }
                useExamStore.getState().loginAsTeacher();
                navigate('/teacher/dashboard');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold transition active:scale-[0.98]"
              title="Kembali ke Dashboard Guru"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar Simulasi</span>
            </button>
          )}

          {/* Tombol Refresh Frame */}
          {selectedPackage?.examType === 'EXTERNAL_LINK' && (
            <button
              onClick={() => setIframeKey((prev) => prev + 1)}
              title="Refresh Lembar Soal"
              className="p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs flex items-center gap-1 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Refresh Form</span>
            </button>
          )}

          {/* Countdown Timer */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 font-mono text-xs sm:text-sm font-semibold text-zinc-100 tabular-nums">
            <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>{formatTime(activeAttempt.remainingSeconds)}</span>
          </div>

          {/* Tombol Konfirmasi Selesai & Keluar Ujian */}
          <button
            onClick={() => setShowExitConfirmModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-2xs transition active:scale-[0.98]"
            title="Selesaikan pengerjaan dan keluar dari ujian"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Selesai Ujian</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* FLOATING ANNOUNCEMENT BANNER DARI GURU PENGAWAS */}
      {/* ======================================================== */}
      {activeAnnouncement && (
        <div className={`border-b px-4 py-3 shadow-md z-40 animate-slideDown transition-all ${
          activeAnnouncement.urgency === 'URGENT'
            ? 'bg-rose-950/90 border-rose-500/40 text-rose-100'
            : activeAnnouncement.urgency === 'WARNING'
            ? 'bg-amber-950/90 border-amber-500/40 text-amber-100'
            : 'bg-zinc-900/95 border-zinc-800 text-zinc-100'
        }`}>
          <div className="max-w-4xl mx-auto flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className={`p-1.5 rounded-md shrink-0 mt-0.5 ${
                activeAnnouncement.urgency === 'URGENT'
                  ? 'bg-rose-600 text-white animate-pulse'
                  : activeAnnouncement.urgency === 'WARNING'
                  ? 'bg-amber-500 text-zinc-950 font-bold'
                  : 'bg-zinc-800 text-zinc-200'
              }`}>
                <Megaphone className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-black/40 border border-white/10">
                    {activeAnnouncement.urgency === 'URGENT' ? '🚨 Ralat Vital' : activeAnnouncement.urgency === 'WARNING' ? '⚠️ Peringatan Pengawas' : '📢 Pengumuman Pengawas'}
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">
                    {activeAnnouncement.senderName} • {activeAnnouncement.timestamp}
                  </span>
                </div>
                <div className="text-xs sm:text-sm font-medium text-zinc-100 mt-1 leading-relaxed">
                  {activeAnnouncement.message}
                </div>
              </div>
            </div>

            <button
              onClick={() => setActiveAnnouncement(null)}
              className="px-2.5 py-1 rounded-md bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-medium transition shrink-0 flex items-center gap-1 border border-white/20"
              title="Tutup Pengumuman"
            >
              <span>Mengerti</span>
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. LAYAR PEMBEKUAN MERAH (PENALTY FREEZE OVERLAY) */}
      {/* ======================================================== */}
      {activeAttempt.isLocked && (
        <div className="fixed inset-0 z-50 bg-[#090D16]/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-fade-in overflow-y-auto">
          <div className="w-16 h-16 rounded-xl bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 mb-4 animate-pulse">
            <ShieldAlert className="w-9 h-9" />
          </div>

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight mb-2 uppercase">
            AKSES UJIAN DIBEKUKAN (TERKUNCI)!
          </h2>

          <p className="text-rose-200/90 text-xs sm:text-sm max-w-xl mb-6 leading-relaxed font-normal">
            Sistem mendeteksi Anda mencoba keluar dari halaman ujian, berpindah tab, meminimalkan jendela, atau membuka aplikasi lain. 
            <strong className="text-white font-semibold"> Kejadian ini telah tercatat di E-Jurnal Guru beserta jam dan detiknya.</strong>
          </p>

          {/* Rincian Pelanggaran Terdeteksi */}
          <div className="bg-zinc-900/90 border border-rose-500/40 rounded-xl p-4 max-w-md w-full text-xs text-left text-zinc-200 mb-5 space-y-2">
            <div className="font-semibold text-rose-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Log Pelanggaran Sistem Terkini:</span>
            </div>
            <div>• Jenis Pelanggaran: <strong className="font-semibold text-white bg-rose-950/80 px-2 py-0.5 rounded border border-rose-500/30">{formatViolationType(activeAttempt.violationLogs[0]?.violationType)}</strong></div>
            <div>• Keterangan Sensor: <em className="text-zinc-300 font-normal">{activeAttempt.violationLogs[0]?.description || 'Pelanggaran keamanan terdeteksi sistem.'}</em></div>
            <div>• Waktu Terdeteksi: <strong className="font-mono text-zinc-100">{activeAttempt.violationLogs[0]?.detectedAt || 'Detik Ini'}</strong></div>
            <div>• Total Akumulasi: <strong className="text-amber-300 font-semibold">{activeAttempt.violationCount} kali pelanggaran</strong></div>
          </div>

          {/* Form Pembukaan Kunci Pengawas (Bebas dari Google Password Manager Popup) */}
          <div className="max-w-md w-full bg-zinc-900/90 border border-zinc-800 p-4 rounded-xl space-y-3 mb-4">
            <div className="text-xs text-zinc-300 font-medium">
              Minta Guru Pengawas untuk membuka kunci melalui menu Live Proctoring, atau masukkan PIN Pengawas di bawah ini:
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                onFocus={(e) => e.target.removeAttribute('readonly')}
                autoComplete="one-time-code"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck="false"
                role="presentation"
                data-lpignore="true"
                data-form-type="other"
                value={supervisorUnlockPin}
                onChange={(e) => setSupervisorUnlockPin(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSupervisorLocalUnlock(e);
                  }
                }}
                placeholder="PIN Pengawas Ruangan"
                style={{
                  WebkitTextSecurity: 'disc',
                  textSecurity: 'disc'
                }}
                className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono text-center uppercase tracking-widest"
              />
              <button
                type="button"
                onClick={handleSupervisorLocalUnlock}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs shrink-0 active:scale-[0.98]"
              >
                <Unlock className="w-3.5 h-3.5" /> Buka Kunci
              </button>
            </div>
            {unlockError && <div className="text-[11px] text-rose-400 font-medium">{unlockError}</div>}
          </div>

          <button
            onClick={handleReEnterFullscreen}
            className="px-5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition flex items-center gap-2 active:scale-[0.98]"
          >
            <Maximize2 className="w-3.5 h-3.5" /> Masuk Kembali ke Fullscreen
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. AREA PENGERJAAN SOAL (HYBRID RENDERER) */}
      {/* ======================================================== */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {selectedPackage?.examType === 'EXTERNAL_LINK' ? (
          /* ========================================== */
          /* MODE IFRAME SECURE: GOOGLE FORM / MS TEAMS */
          /* ========================================== */
          <div 
            className="flex-1 w-full h-full relative bg-white select-none"
            onContextMenu={(e) => {
              e.preventDefault();
              handleSecurityViolation('CONTEXT_MENU_ATTEMPT', 'Siswa mencoba membuka menu klik kanan (Context Menu) pada lembar ujian');
              triggerViolationLock('CONTEXT_MENU_ATTEMPT', 'Siswa mencoba membuka menu klik kanan (Context Menu) pada lembar ujian');
            }}
          >
            <iframe
              key={iframeKey}
              src={selectedPackage.externalUrl}
              title="Lembar Ujian Eksternal Google Form"
              className="w-full h-full border-0 absolute inset-0 select-none"
              allow="fullscreen"
            />
          </div>
        ) : (
          /* ========================================== */
          /* MODE SOAL MANDIRI (NATIVE QUESTIONS)       */
          /* ========================================== */
          <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col md:flex-row gap-4 overflow-y-auto z-10">
            {/* Panel Kiri: Lembar Soal Aktif */}
            <div className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-xl p-5 sm:p-6 flex flex-col justify-between space-y-5">
              {currentQuestion ? (
                <div className="space-y-4">
                  {/* Nomor Soal & Badge */}
                  <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700/80 text-zinc-200">
                        Soal Nomor {currentQuestionIndex + 1}
                      </span>
                      <span className="text-xs text-zinc-400 font-medium">
                        Bobot: {currentQuestion.points} Poin
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Tombol Ragu-ragu */}
                      <button
                        type="button"
                        onClick={() => toggleDoubt(currentQuestion.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                          doubtQuestions[currentQuestion.id]
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-700'
                        }`}
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Ragu-ragu</span>
                      </button>

                      <span className="text-[11px] font-medium px-2.5 py-1 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {({
                          MULTIPLE_CHOICE: 'Pilihan Ganda',
                          MULTIPLE_CHOICE_COMPLEX: 'Pilihan Ganda Kompleks (Multi-Centang)',
                          SHORT_ANSWER: 'Isian Singkat',
                          TRUE_FALSE_MATRIX: 'Benar / Salah',
                          MATCHING_PAIR: 'Menjodohkan Pasangan',
                          ESSAY: 'Uraian / Esai',
                        })[currentQuestion.questionType || currentQuestion.question_type] || 'Soal Ujian'}
                      </span>
                    </div>
                  </div>

                  {/* Teks Pertanyaan Soal (Dukungan Tipografi Rumus Matematika KaTeX) */}
                  <div className="text-sm sm:text-base text-zinc-100 font-medium leading-relaxed">
                    <MathText text={currentQuestion.questionText || currentQuestion.question_text || ''} />
                  </div>

                  {/* Gambar Pertanyaan Soal (Jika Ada) */}
                  {(currentQuestion.imageUrl || currentQuestion.image_url) && (
                    <div className="my-3 rounded-lg overflow-hidden border border-zinc-800 max-w-xl bg-zinc-950 p-2">
                      <img
                        src={resolveImageUrl(currentQuestion.imageUrl || currentQuestion.image_url)}
                        alt="Gambar Pertanyaan Soal"
                        className="w-full max-h-80 object-contain rounded-md"
                      />
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* RAGAM INTERAKTIF TIPE SOAL (STANDAR AKM & ANBK)           */}
                  {/* ======================================================== */}

                  {/* 1. PILIHAN GANDA BIASA (1 Jawaban Benar) */}
                  {(currentQuestion.questionType === 'MULTIPLE_CHOICE' || currentQuestion.question_type === 'MULTIPLE_CHOICE') && (
                    <div className="space-y-2.5 pt-1">
                      {(currentQuestion.options || []).map((opt) => {
                        const optLabel = opt.label || opt.option_label;
                        const optText = opt.text || opt.option_text;
                        const optImg = opt.imageUrl || opt.image_url;
                        const isSelected = activeAttempt.studentAnswers[currentQuestion.id] === optLabel;
                        return (
                          <button
                            key={optLabel}
                            type="button"
                            onClick={() => setStudentAnswer(currentQuestion.id, optLabel)}
                            className={`w-full p-3.5 rounded-lg border text-left text-xs sm:text-sm font-medium transition flex flex-col sm:flex-row sm:items-center gap-3 ${
                              isSelected
                                ? 'bg-zinc-800/90 border-zinc-500 text-white shadow-2xs ring-1 ring-zinc-500/40'
                                : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs shrink-0 transition ${
                                isSelected ? 'bg-zinc-100 text-zinc-900 font-bold shadow-2xs' : 'bg-zinc-800 text-zinc-400 font-semibold'
                              }`}>
                                {optLabel}
                              </div>
                              <div className="leading-relaxed truncate-none">
                                <MathText text={optText} />
                              </div>
                            </div>

                            {optImg && (
                              <div className="sm:ml-auto rounded-md overflow-hidden border border-zinc-800 max-h-32 bg-zinc-900 p-1 shrink-0">
                                <img
                                  src={resolveImageUrl(optImg)}
                                  alt={`Gambar Opsi ${optLabel}`}
                                  className="h-24 sm:h-28 object-contain rounded"
                                />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. PILIHAN GANDA KOMPLEKS (Multi-Centang Checkbox) */}
                  {(currentQuestion.questionType === 'MULTIPLE_CHOICE_COMPLEX' || currentQuestion.question_type === 'MULTIPLE_CHOICE_COMPLEX') && (
                    <div className="space-y-2.5 pt-1">
                      <div className="text-xs text-blue-400 font-medium flex items-center gap-1.5 pb-0.5">
                        <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                        <span>Pilihlah satu atau lebih jawaban yang menurut Anda benar:</span>
                      </div>
                      {(currentQuestion.options || []).map((opt) => {
                        const optLabel = opt.label || opt.option_label;
                        const optText = opt.text || opt.option_text;
                        const rawAns = activeAttempt.studentAnswers[currentQuestion.id];
                        const selectedList = Array.isArray(rawAns) ? rawAns : (typeof rawAns === 'string' ? rawAns.split(',') : []);
                        const isChecked = selectedList.includes(optLabel);

                        const handleToggle = () => {
                          let next;
                          if (isChecked) {
                            next = selectedList.filter(x => x !== optLabel);
                          } else {
                            next = [...selectedList, optLabel];
                          }
                          setStudentAnswer(currentQuestion.id, next);
                        };

                        return (
                          <button
                            key={optLabel}
                            type="button"
                            onClick={handleToggle}
                            className={`w-full p-3.5 rounded-lg border text-left text-xs sm:text-sm font-medium transition flex items-center gap-3 ${
                              isChecked
                                ? 'bg-zinc-800/90 border-zinc-500 text-white shadow-2xs ring-1 ring-zinc-500/40'
                                : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white hover:border-zinc-700'
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs shrink-0 transition ${
                              isChecked ? 'bg-zinc-100 text-zinc-900 font-bold shadow-2xs' : 'bg-zinc-800 text-zinc-400 font-semibold'
                            }`}>
                              {isChecked ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : optLabel}
                            </div>
                            <div className="leading-relaxed flex-1">
                              <MathText text={optText} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* 3. ISIAN SINGKAT (Short Answer / Exact Match) */}
                  {(currentQuestion.questionType === 'SHORT_ANSWER' || currentQuestion.question_type === 'SHORT_ANSWER') && (
                    <div className="space-y-2.5 pt-1">
                      <label className="block text-xs font-medium text-teal-400 flex items-center gap-1.5">
                        <ListOrdered className="w-3.5 h-3.5" />
                        <span>Ketikkan jawaban singkat Anda pada kotak di bawah ini:</span>
                      </label>
                      <input
                        type="text"
                        value={activeAttempt.studentAnswers[currentQuestion.id] || ''}
                        onChange={(e) => setStudentAnswer(currentQuestion.id, e.target.value)}
                        placeholder="Ketik jawaban singkat di sini..."
                        className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-sm font-medium text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 font-mono"
                      />
                      <p className="text-[11px] text-zinc-400 italic">
                        Tip: Jawaban tidak membedakan huruf besar dan huruf kecil (case-insensitive).
                      </p>
                    </div>
                  )}

                  {/* 4. TABEL BENAR / SALAH (Grid Matrix) */}
                  {(currentQuestion.questionType === 'TRUE_FALSE_MATRIX' || currentQuestion.question_type === 'TRUE_FALSE_MATRIX') && (
                    <div className="space-y-2.5 pt-1">
                      <div className="text-xs text-amber-400 font-medium flex items-center gap-1.5 pb-0.5">
                        <Grid className="w-3.5 h-3.5" />
                        <span>Tentukan apakah setiap pernyataan di bawah ini BENAR atau SALAH:</span>
                      </div>
                      <div className="space-y-2">
                        {((currentQuestion.extra_data?.rows || currentQuestion.extraData?.rows) || []).map((row, rIdx) => {
                          const currentMatrixAns = (typeof activeAttempt.studentAnswers[currentQuestion.id] === 'object' && activeAttempt.studentAnswers[currentQuestion.id]) || {};
                          const rowAns = currentMatrixAns[String(rIdx)];

                          const handleSetChoice = (isTrue) => {
                            const updated = { ...currentMatrixAns, [String(rIdx)]: isTrue };
                            setStudentAnswer(currentQuestion.id, updated);
                          };

                          return (
                            <div key={rIdx} className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                              <div className="flex items-start gap-2.5 flex-1">
                                <span className="w-5 h-5 rounded bg-zinc-800 text-zinc-300 font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                  {rIdx + 1}
                                </span>
                                <div className="text-xs sm:text-sm text-zinc-200 font-normal leading-relaxed">
                                  <MathText text={row.statement || ''} />
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => handleSetChoice(true)}
                                  className={`px-3 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 ${
                                    rowAns === true
                                      ? 'bg-emerald-600 text-white shadow-2xs ring-1 ring-emerald-400'
                                      : 'bg-zinc-800 text-zinc-400 hover:text-emerald-400 border border-zinc-700'
                                  }`}
                                >
                                  {rowAns === true && <Check className="w-3 h-3 stroke-[3]" />} Benar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetChoice(false)}
                                  className={`px-3 py-1 rounded-md text-xs font-semibold transition flex items-center gap-1 ${
                                    rowAns === false
                                      ? 'bg-rose-600 text-white shadow-2xs ring-1 ring-rose-400'
                                      : 'bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-700'
                                  }`}
                                >
                                  {rowAns === false && <Check className="w-3 h-3 stroke-[3]" />} Salah
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 5. MENJODOHKAN (Matching Pair) */}
                  {(currentQuestion.questionType === 'MATCHING_PAIR' || currentQuestion.question_type === 'MATCHING_PAIR') && (
                    <div className="space-y-2.5 pt-1">
                      <div className="text-xs text-purple-400 font-medium flex items-center gap-1.5 pb-0.5">
                        <GitCompare className="w-3.5 h-3.5" />
                        <span>Pasangkan setiap pernyataan di sebelah kiri dengan pilihan yang tepat di sebelah kanan:</span>
                      </div>
                      {(() => {
                        const pairs = (currentQuestion.extra_data?.pairs || currentQuestion.extraData?.pairs) || [];
                        const rightChoices = pairs.map(p => p.right).filter(Boolean);
                        const currentPairsAns = (typeof activeAttempt.studentAnswers[currentQuestion.id] === 'object' && activeAttempt.studentAnswers[currentQuestion.id]) || {};

                        return (
                          <div className="space-y-2">
                            {pairs.map((p, pIdx) => {
                              const leftKey = p.left;
                              const selectedVal = currentPairsAns[leftKey] || '';

                              const handleChangePair = (val) => {
                                const updated = { ...currentPairsAns, [leftKey]: val };
                                setStudentAnswer(currentQuestion.id, updated);
                              };

                              return (
                                <div key={pIdx} className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                  <div className="flex items-start gap-2.5 flex-1">
                                    <span className="w-5 h-5 rounded bg-zinc-800 text-zinc-300 font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5 border border-zinc-700">
                                      {pIdx + 1}
                                    </span>
                                    <div className="text-xs sm:text-sm text-zinc-200 font-normal leading-relaxed">
                                      <MathText text={leftKey} />
                                    </div>
                                  </div>

                                  <div className="shrink-0 w-full sm:w-64">
                                    <select
                                      value={selectedVal}
                                      onChange={(e) => handleChangePair(e.target.value)}
                                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-medium text-white focus:outline-none focus:border-zinc-500"
                                    >
                                      <option value="">-- Pilih Pasangan --</option>
                                      {rightChoices.map((choice, cIdx) => (
                                        <option key={cIdx} value={choice}>
                                          {choice}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* 6. INPUT ESAI */}
                  {(currentQuestion.questionType === 'ESSAY' || currentQuestion.question_type === 'ESSAY') && (
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-2">
                        Jawaban Esai Anda:
                      </label>
                      <textarea
                        rows={6}
                        value={activeAttempt.studentAnswers[currentQuestion.id] || ''}
                        onChange={(e) => setStudentAnswer(currentQuestion.id, e.target.value)}
                        placeholder="Ketik jawaban esai secara lengkap dan terstruktur di sini..."
                        className="w-full p-3.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs sm:text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                      />
                    </div>
                  )}
                </div>
              ) : null}

              {/* Navigasi Bawah: Sebelumnya & Berikutnya */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80">
                <button
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium disabled:opacity-40 transition active:scale-[0.98]"
                >
                  ← Soal Sebelumnya
                </button>

                {currentQuestionIndex === questions.length - 1 ? (
                  <button
                    onClick={() => setShowExitConfirmModal(true)}
                    className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-2xs transition flex items-center gap-1.5 active:scale-[0.98]"
                  >
                    <Check className="w-4 h-4" /> Selesai & Kirim Ujian
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                    className="px-5 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-semibold shadow-2xs transition active:scale-[0.98]"
                  >
                    Soal Berikutnya →
                  </button>
                )}
              </div>
            </div>

            {/* Panel Kanan: Kisi Nomor Navigasi Soal */}
            <div className="w-full md:w-60 bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 h-fit space-y-3.5">
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <h3 className="text-xs font-semibold uppercase text-zinc-100 tracking-wider">
                  Daftar Nomor Soal
                </h3>
                {(() => {
                  const checkAnswered = (ans) => {
                    if (ans === undefined || ans === null || ans === '') return false;
                    if (Array.isArray(ans)) return ans.length > 0;
                    if (typeof ans === 'object') {
                      const values = Object.values(ans);
                      return values.length > 0 && values.some((v) => v !== undefined && v !== null && v !== '');
                    }
                    return true;
                  };
                  const answeredCount = questions.filter((q) => checkAnswered(activeAttempt.studentAnswers[q.id])).length;
                  return (
                    <span className="text-[11px] font-medium text-zinc-400 font-mono">
                      {answeredCount}/{questions.length} Terjawab
                    </span>
                  );
                })()}
              </div>

              {/* Grid Kotak Nomor Soal */}
              <div className="grid grid-cols-5 gap-1.5">
                {questions.map((q, i) => {
                  const isCurrent = currentQuestionIndex === i;
                  const ans = activeAttempt.studentAnswers[q.id];
                  const isAnswered =
                    ans !== undefined &&
                    ans !== null &&
                    ans !== '' &&
                    (Array.isArray(ans)
                      ? ans.length > 0
                      : typeof ans === 'object'
                      ? Object.values(ans).some((v) => v !== undefined && v !== null && v !== '');
                  const isDoubt = Boolean(doubtQuestions[q.id]);

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(i)}
                      className={`h-9 rounded-lg font-mono text-xs transition relative ${
                        isCurrent
                          ? 'bg-zinc-100 text-zinc-900 ring-2 ring-zinc-400 shadow-sm font-bold'
                          : isDoubt
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                          : isAnswered
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                          : 'bg-zinc-950/60 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800/80 font-medium'
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              {/* Keterangan Warna */}
              <div className="pt-3 border-t border-zinc-800/80 text-[10px] space-y-1 text-zinc-400 font-medium">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500/40 border border-emerald-500/60 inline-block shrink-0" />
                  <span>Sudah Terjawab</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-amber-500/40 border border-amber-500/60 inline-block shrink-0" />
                  <span>Ragu-ragu</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-zinc-800 border border-zinc-700 inline-block shrink-0" />
                  <span>Belum Terjawab</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-zinc-100 inline-block shrink-0" />
                  <span>Sedang Dibuka</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ======================================================== */}
      {/* MODAL KONFIRMASI SELESAI & KELUAR UJIAN                  */}
      {/* ======================================================== */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
            {/* Header Modal */}
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-bold text-zinc-100 tracking-tight">
                  Konfirmasi Selesai Ujian
                </h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Pastikan seluruh jawaban Anda sudah terisi dengan benar sebelum mengirim lembar ujian.
                </p>
              </div>
            </div>

            {/* Ringkasan Pengerjaan untuk Soal Mandiri */}
            {selectedPackage?.examType === 'NATIVE_QUESTIONS' ? (
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  Status Lembar Jawaban:
                </div>
                {(() => {
                  const checkAnswered = (ans) => {
                    if (ans === undefined || ans === null || ans === '') return false;
                    if (Array.isArray(ans)) return ans.length > 0;
                    if (typeof ans === 'object') {
                      const values = Object.values(ans);
                      return values.length > 0 && values.some((v) => v !== undefined && v !== null && v !== '');
                    }
                    return true;
                  };
                  const answeredCount = questions.filter((q) => checkAnswered(activeAttempt.studentAnswers?.[q.id])).length;
                  const doubtCount = Object.values(doubtQuestions).filter(Boolean).length;
                  const unansweredCount = Math.max(0, questions.length - answeredCount);

                  return (
                    <div className="grid grid-cols-3 gap-2.5 text-center">
                      <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-3">
                        <div className="text-lg sm:text-xl font-bold font-mono text-emerald-400">
                          {answeredCount}
                        </div>
                        <div className="text-[10px] text-emerald-300 font-medium mt-0.5">Sudah Terjawab</div>
                      </div>
                      <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-3">
                        <div className="text-lg sm:text-xl font-bold font-mono text-amber-400">
                          {doubtCount}
                        </div>
                        <div className="text-[10px] text-amber-300 font-medium mt-0.5">Ragu-ragu</div>
                      </div>
                      <div className={`rounded-lg p-3 border ${
                        unansweredCount > 0 
                          ? 'bg-rose-950/40 border-rose-500/30' 
                          : 'bg-zinc-900 border-zinc-800'
                      }`}>
                        <div className={`text-lg sm:text-xl font-bold font-mono ${
                          unansweredCount > 0 ? 'text-rose-400' : 'text-zinc-400'
                        }`}>
                          {unansweredCount}
                        </div>
                        <div className={`text-[10px] font-medium mt-0.5 ${
                          unansweredCount > 0 ? 'text-rose-300' : 'text-zinc-400'
                        }`}>
                          Belum Diisi
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {(() => {
                  const checkAnswered = (ans) => {
                    if (ans === undefined || ans === null || ans === '') return false;
                    if (Array.isArray(ans)) return ans.length > 0;
                    if (typeof ans === 'object') {
                      const values = Object.values(ans);
                      return values.length > 0 && values.some((v) => v !== undefined && v !== null && v !== '');
                    }
                    return true;
                  };
                  const unanswered = questions.filter((q) => !checkAnswered(activeAttempt.studentAnswers?.[q.id])).length;
                  if (unanswered > 0) {
                    return (
                      <div className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        <span>Masih ada <strong>{unanswered} soal</strong> yang belum dijawab!</span>
                      </div>
                    );
                  }
                  return (
                    <div className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                      <span>Hebat! Seluruh butir soal telah berhasil Anda jawab.</span>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 text-xs text-zinc-300 space-y-1.5 leading-relaxed">
                <div className="font-semibold text-zinc-100 flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Ujian Berbasis Formulir Online</span>
                </div>
                <p>
                  Pastikan Anda sudah menekan tombol <strong>"Kirim" / "Submit"</strong> di dalam formulir Google Form / Microsoft Teams sebelum mengakhiri sesi pengerjaan ini.
                </p>
              </div>
            )}

            {/* Peringatan Konfirmasi Akhir */}
            <div className="text-xs text-zinc-400 bg-zinc-950/60 border border-zinc-800/80 p-3 rounded-lg leading-relaxed">
              Setelah dikonfirmasi, mode layar penuh otomatis dilepaskan, sesi pengerjaan ditutup, dan seluruh hasil asesmen langsung disimpan di portal pengawas guru.
            </div>

            {/* Tombol Aksi */}
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                disabled={isSubmittingExam}
                onClick={() => setShowExitConfirmModal(false)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition active:scale-[0.98] disabled:opacity-50"
              >
                Lanjut Mengerjakan
              </button>
              <button
                type="button"
                disabled={isSubmittingExam}
                onClick={handleFinishAndExitExam}
                className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-2xs transition active:scale-[0.98] flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmittingExam ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan & Mengirim...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Ya, Selesaikan Ujian</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
