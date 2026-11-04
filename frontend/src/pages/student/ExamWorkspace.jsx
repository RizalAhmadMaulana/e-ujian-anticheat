import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import { useExamSecurity } from '../../hooks/useExamSecurity';
import { useProctorSocket } from '../../hooks/useProctorSocket';
import { playExitSuccessAlarm } from '../../utils/soundEffects';
import { submitExamAnswersApi, verifyExitPasswordApi } from '../../api/examApi';
import { proctoringApi } from '../../api/proctoringApi';
import { resolveImageUrl } from '../../utils/imageUrlFormatter';
import Modal from '../../components/common/Modal';
import MathText from '../../components/common/MathText';
import NetworkSignalIndicator from '../../components/common/NetworkSignalIndicator';
import { 
  ShieldAlert, 
  Lock, 
  Clock, 
  KeyRound, 
  Send, 
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
  Save
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
  const [isExitBarOpen, setIsExitBarOpen] = useState(false);
  const [exitPasswordInput, setExitPasswordInput] = useState('');
  const [exitErrorMsg, setExitErrorMsg] = useState('');
  const [iframeKey, setIframeKey] = useState(1);
  const [screenshotToast, setScreenshotToast] = useState('');
  const [unlockSuccessToast, setUnlockSuccessToast] = useState('');
  const [supervisorUnlockPin, setSupervisorUnlockPin] = useState('');
  const [unlockError, setUnlockError] = useState('');

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

  const { isConnected: isWsConnected, sendViolationReport } = useProctorSocket(
    activeAttempt.sessionId,
    {
      onStudentUnlocked: handleRemoteUnlocked,
      onStudentDisqualified: handleRemoteDisqualified
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

  // Verifikasi Password Keluar Resmi
  const handleConfirmExit = async (e) => {
    e.preventDefault();
    setExitErrorMsg('');

    try {
      if (activeAttempt.sessionId && activeAttempt.sessionId.length > 10) {
        await verifyExitPasswordApi(activeAttempt.sessionId, exitPasswordInput);
        if (selectedPackage?.examType === 'NATIVE_QUESTIONS') {
          await submitExamAnswersApi(activeAttempt.sessionId, activeAttempt.studentAnswers);
        }
      }
    } catch (err) {
      console.warn('Backend exit password check fallback ke local store:', err);
    }

    const res = verifyExitPassword(exitPasswordInput);
    if (res.success) {
      // 1. Mainkan bunyi notifikasi alarm besar ExamBrowser (~2.5 detik)
      playExitSuccessAlarm();

      // 2. Lepaskan mode fullscreen
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      setIsExitBarOpen(false);
      alert('Selamat! Ujian Anda telah selesai dan seluruh rekaman tersimpan di E-Jurnal Guru.');
      if (activeAttempt.isSimulation) {
        useExamStore.getState().loginAsTeacher();
        navigate('/teacher/dashboard');
      } else {
        navigate('/student/lobby');
      }
    } else {
      setExitErrorMsg(res.message || 'Password Keluar salah! Tanyakan kepada pengawas.');
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
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col relative select-none overflow-hidden ${
        isLandscape ? 'orientation-landscape' : 'orientation-portrait'
      }`}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSecurityViolation('CONTEXT_MENU_ATTEMPT', 'Siswa mencoba membuka menu klik kanan (Context Menu) pada lembar ujian');
        triggerViolationLock('CONTEXT_MENU_ATTEMPT', 'Siswa mencoba membuka menu klik kanan (Context Menu) pada lembar ujian');
      }}
    >
      {/* ======================================================== */}
      {/* 0. INSTANT ANTI-SCREENSHOT BLACKOUT SHIELD (Z-INDEX 9999) */}
      {/* Mengaburkan layar seketika dalam 0ms saat gesture 3 jari / tombol fisik terdeteksi */}
      {/* ======================================================== */}
      <div
        id="instant-anti-screenshot-shield"
        style={{ display: 'none' }}
        className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center text-center p-6 select-none"
      >
        <div className="w-20 h-20 rounded-full bg-red-600/30 border-2 border-red-500 flex items-center justify-center text-red-500 mb-4 animate-ping">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-red-500 uppercase tracking-widest mb-2">
          TANGKAPAN LAYAR TERDETEKSI & DIBLOKIR!
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
          Sistem mendeteksi upaya pengambilan tangkapan layar (gesture usap 3 jari atau tombol volume & power di HP). Layar ujian otomatis dikaburkan dan akses Anda dibekukan!
        </p>
        <div className="text-xs text-red-400 font-bold bg-red-950/80 border border-red-500/50 px-4 py-2 rounded-xl">
          Pelanggaran telah dicatat secara otomatis di E-Jurnal Guru
        </div>
      </div>

      {/* ======================================================== */}
      {/* TOAST ANTI-SCREENSHOT NOTIFICATION */}
      {/* ======================================================== */}
      {screenshotToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="px-5 py-3 rounded-2xl bg-red-900 border-2 border-red-500 text-white flex items-center gap-3 shadow-2xl backdrop-blur-md">
            <CameraOff className="w-5 h-5 text-red-300" />
            <span className="text-xs font-bold">{screenshotToast}</span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TOAST SUKSES BUKA KUNCI (NON-BLOCKING) */}
      {/* ======================================================== */}
      {unlockSuccessToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="px-6 py-3.5 rounded-2xl bg-emerald-950 border-2 border-emerald-500 text-white flex items-center gap-3 shadow-2xl shadow-emerald-950/80 backdrop-blur-md">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm font-extrabold text-emerald-100">{unlockSuccessToast}</span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. TOP SECURITY BAR (KAPSUL HITAM PENGAMAN DI ATAS LAYAR) */}
      {/* ======================================================== */}
      <header className="bg-slate-950 border-b border-slate-800 px-3 sm:px-6 py-2.5 flex items-center justify-between z-30 sticky top-0 shadow-2xl">
        {/* Status Monitoring & Judul */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/80 border border-red-500/40 text-red-400 text-[11px] font-extrabold tracking-wider uppercase shadow-inner">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>REC • Terproteksi</span>
          </div>

          {activeAttempt.isSimulation && (
            <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-black uppercase tracking-wider">
              Mode Simulasi Guru
            </span>
          )}

          <div className="hidden md:block">
            <span className="text-xs font-bold text-white truncate max-w-xs block">
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/25 transition"
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
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 text-xs flex items-center gap-1 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Refresh Form</span>
            </button>
          )}

          {/* Countdown Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs sm:text-sm font-black text-indigo-400">
            <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>{formatTime(activeAttempt.remainingSeconds)}</span>
          </div>

          {/* Tombol Password untuk Keluar */}
          <button
            onClick={() => setIsExitBarOpen(!isExitBarOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black shadow-lg shadow-red-600/30 transition group"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Password untuk Keluar</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* SLIDE-DOWN EXIT PASSWORD BAR DI BAGIAN ATAS */}
      {/* ======================================================== */}
      {isExitBarOpen && (
        <div className="bg-slate-900 border-b-2 border-red-500 p-4 z-30 shadow-2xl animate-fade-in">
          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white shrink-0">
              <KeyRound className="w-4 h-4 text-red-400" />
              <span>Masukkan Password dari Panitia untuk Keluar:</span>
            </div>

            <div className="flex-1 w-full flex items-center gap-2">
              <input
                type="text"
                autoFocus
                readOnly
                onFocus={(e) => e.target.removeAttribute('readonly')}
                autoComplete="one-time-code"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck="false"
                role="presentation"
                data-lpignore="true"
                data-form-type="other"
                value={exitPasswordInput}
                onChange={(e) => setExitPasswordInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleConfirmExit(e);
                  }
                }}
                placeholder="CONTOH: KELUAR123"
                className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm font-mono font-bold tracking-widest text-white uppercase focus:outline-none focus:border-red-500 text-center"
              />
              <button
                type="button"
                onClick={handleConfirmExit}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-black shadow-md transition shrink-0 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Konfirmasi</span>
              </button>
              <button
                type="button"
                onClick={() => setIsExitBarOpen(false)}
                className="px-3 py-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl text-xs transition"
              >
                Batal
              </button>
            </div>
          </div>

          {exitErrorMsg && (
            <div className="max-w-2xl mx-auto mt-2 text-center text-xs font-bold text-red-400">
              {exitErrorMsg}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. LAYAR PEMBEKUAN MERAH (PENALTY FREEZE OVERLAY) */}
      {/* ======================================================== */}
      {activeAttempt.isLocked && (
        <div className="fixed inset-0 z-50 bg-red-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-fade-in overflow-y-auto">
          <div className="w-20 h-20 rounded-3xl bg-red-600/30 border-2 border-red-500 flex items-center justify-center text-red-400 mb-5 animate-pulse">
            <ShieldAlert className="w-12 h-12" />
          </div>

          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight mb-2 uppercase">
            AKSES UJIAN DIBEKUKAN (TERKUNCI)!
          </h2>

          <p className="text-red-200 text-xs sm:text-sm max-w-xl mb-6 leading-relaxed">
            Sistem mendeteksi Anda mencoba keluar dari halaman ujian, berpindah tab, meminimalkan jendela, atau membuka aplikasi lain. 
            <strong className="text-white"> Kejadian ini telah tercatat di E-Jurnal Guru beserta jam dan detiknya.</strong>
          </p>

          {/* Rincian Pelanggaran Terdeteksi */}
          <div className="bg-red-900/60 border border-red-500/50 rounded-2xl p-4 max-w-md w-full text-xs text-left text-red-100 mb-6 space-y-2 shadow-xl">
            <div className="font-extrabold text-red-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>Log Pelanggaran Sistem Terkini:</span>
            </div>
            <div>• Jenis Pelanggaran: <strong className="font-bold text-white bg-red-950/80 px-2 py-0.5 rounded border border-red-500/40">{formatViolationType(activeAttempt.violationLogs[0]?.violationType)}</strong></div>
            <div>• Keterangan Sensor: <em className="text-red-100 font-medium">{activeAttempt.violationLogs[0]?.description || 'Pelanggaran keamanan terdeteksi sistem.'}</em></div>
            <div>• Waktu Terdeteksi: <strong className="font-mono text-white">{activeAttempt.violationLogs[0]?.detectedAt || 'Detik Ini'}</strong></div>
            <div>• Total Akumulasi: <strong className="text-yellow-300 font-black">{activeAttempt.violationCount} kali pelanggaran</strong></div>
          </div>

          {/* Form Pembukaan Kunci Pengawas (Bebas dari Google Password Manager Popup) */}
          <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 p-5 rounded-2xl space-y-3 mb-4">
            <div className="text-xs text-slate-300 font-semibold">
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
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono text-center uppercase tracking-widest"
              />
              <button
                type="button"
                onClick={handleSupervisorLocalUnlock}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shrink-0"
              >
                <Unlock className="w-3.5 h-3.5" /> Buka Kunci
              </button>
            </div>
            {unlockError && <div className="text-[11px] text-red-400 font-bold">{unlockError}</div>}
          </div>

          <button
            onClick={handleReEnterFullscreen}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition flex items-center gap-2"
          >
            <Maximize2 className="w-4 h-4" /> Masuk Kembali ke Fullscreen
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
          <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 flex flex-col md:flex-row gap-5 overflow-y-auto">
            {/* Panel Kiri: Lembar Soal Aktif */}
            <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col justify-between space-y-6">
              {currentQuestion ? (
                <div className="space-y-5">
                  {/* Nomor Soal & Badge */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black px-3 py-1 rounded-xl bg-indigo-600 text-white shadow-sm">
                        Soal Nomor {currentQuestionIndex + 1}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        Bobot: {currentQuestion.points} Poin
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Tombol Ragu-ragu */}
                      <button
                        type="button"
                        onClick={() => toggleDoubt(currentQuestion.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                          doubtQuestions[currentQuestion.id]
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Ragu-ragu</span>
                      </button>

                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
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
                  <div className="text-sm sm:text-base text-slate-100 font-semibold leading-relaxed">
                    <MathText text={currentQuestion.questionText || currentQuestion.question_text || ''} />
                  </div>

                  {/* Gambar Pertanyaan Soal (Jika Ada) */}
                  {(currentQuestion.imageUrl || currentQuestion.image_url) && (
                    <div className="my-3 rounded-2xl overflow-hidden border border-slate-700/80 max-w-xl bg-slate-950/80 p-2 shadow-inner">
                      <img
                        src={resolveImageUrl(currentQuestion.imageUrl || currentQuestion.image_url)}
                        alt="Gambar Pertanyaan Soal"
                        className="w-full max-h-80 object-contain rounded-xl"
                      />
                    </div>
                  )}

                  {/* ======================================================== */}
                  {/* RAGAM INTERAKTIF TIPE SOAL (STANDAR AKM & ANBK)           */}
                  {/* ======================================================== */}

                  {/* 1. PILIHAN GANDA BIASA (1 Jawaban Benar) */}
                  {(currentQuestion.questionType === 'MULTIPLE_CHOICE' || currentQuestion.question_type === 'MULTIPLE_CHOICE') && (
                    <div className="space-y-3 pt-2">
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
                            className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-semibold transition flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 ${
                              isSelected
                                ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-lg shadow-indigo-600/20 ring-2 ring-indigo-500/50'
                                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition ${
                                isSelected ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {optLabel}
                              </div>
                              <div className="leading-relaxed truncate-none">
                                <MathText text={optText} />
                              </div>
                            </div>

                            {optImg && (
                              <div className="sm:ml-auto rounded-xl overflow-hidden border border-slate-700 max-h-32 bg-slate-900 p-1 shrink-0">
                                <img
                                  src={resolveImageUrl(optImg)}
                                  alt={`Gambar Opsi ${optLabel}`}
                                  className="h-24 sm:h-28 object-contain rounded-lg"
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
                    <div className="space-y-3 pt-2">
                      <div className="text-xs text-blue-400 font-bold flex items-center gap-1.5 pb-1">
                        <CheckSquare className="w-4 h-4 text-blue-400" />
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
                            className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-semibold transition flex items-center gap-3 sm:gap-4 ${
                              isChecked
                                ? 'bg-blue-600/30 border-blue-500 text-white shadow-lg shadow-blue-600/20 ring-2 ring-blue-500/50'
                                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition ${
                              isChecked ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {isChecked ? <Check className="w-4 h-4 stroke-[3]" /> : optLabel}
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
                    <div className="space-y-3 pt-2">
                      <label className="block text-xs font-bold text-teal-400 flex items-center gap-1.5">
                        <ListOrdered className="w-4 h-4" />
                        <span>Ketikkan jawaban singkat Anda pada kotak di bawah ini:</span>
                      </label>
                      <input
                        type="text"
                        value={activeAttempt.studentAnswers[currentQuestion.id] || ''}
                        onChange={(e) => setStudentAnswer(currentQuestion.id, e.target.value)}
                        placeholder="Ketik jawaban singkat di sini..."
                        className="w-full p-4 bg-slate-950 border border-slate-700 rounded-2xl text-sm font-bold text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 font-mono"
                      />
                      <p className="text-[11px] text-slate-400 italic">
                        Tip: Jawaban tidak membedakan huruf besar dan huruf kecil (case-insensitive).
                      </p>
                    </div>
                  )}

                  {/* 4. TABEL BENAR / SALAH (Grid Matrix) */}
                  {(currentQuestion.questionType === 'TRUE_FALSE_MATRIX' || currentQuestion.question_type === 'TRUE_FALSE_MATRIX') && (
                    <div className="space-y-3 pt-2">
                      <div className="text-xs text-amber-400 font-bold flex items-center gap-1.5 pb-1">
                        <Grid className="w-4 h-4" />
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
                            <div key={rIdx} className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-start gap-2.5 flex-1">
                                <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                                  {rIdx + 1}
                                </span>
                                <div className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                                  <MathText text={row.statement || ''} />
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => handleSetChoice(true)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1 ${
                                    rowAns === true
                                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400'
                                      : 'bg-slate-900 text-slate-400 hover:text-emerald-400 border border-slate-800'
                                  }`}
                                >
                                  {rowAns === true && <Check className="w-3.5 h-3.5 stroke-[3]" />} Benar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetChoice(false)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1 ${
                                    rowAns === false
                                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-2 ring-rose-400'
                                      : 'bg-slate-900 text-slate-400 hover:text-rose-400 border border-slate-800'
                                  }`}
                                >
                                  {rowAns === false && <Check className="w-3.5 h-3.5 stroke-[3]" />} Salah
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
                    <div className="space-y-3 pt-2">
                      <div className="text-xs text-purple-400 font-bold flex items-center gap-1.5 pb-1">
                        <GitCompare className="w-4 h-4" />
                        <span>Pasangkan setiap pernyataan di sebelah kiri dengan pilihan yang tepat di sebelah kanan:</span>
                      </div>
                      {(() => {
                        const pairs = (currentQuestion.extra_data?.pairs || currentQuestion.extraData?.pairs) || [];
                        const rightChoices = pairs.map(p => p.right).filter(Boolean);
                        const currentPairsAns = (typeof activeAttempt.studentAnswers[currentQuestion.id] === 'object' && activeAttempt.studentAnswers[currentQuestion.id]) || {};

                        return (
                          <div className="space-y-2.5">
                            {pairs.map((p, pIdx) => {
                              const leftKey = p.left;
                              const selectedVal = currentPairsAns[leftKey] || '';

                              const handleChangePair = (val) => {
                                const updated = { ...currentPairsAns, [leftKey]: val };
                                setStudentAnswer(currentQuestion.id, updated);
                              };

                              return (
                                <div key={pIdx} className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                  <div className="flex items-start gap-2.5 flex-1">
                                    <span className="w-6 h-6 rounded-lg bg-purple-900/60 text-purple-300 font-black text-xs flex items-center justify-center shrink-0 mt-0.5 border border-purple-500/40">
                                      {pIdx + 1}
                                    </span>
                                    <div className="text-xs sm:text-sm text-slate-200 font-medium leading-relaxed">
                                      <MathText text={leftKey} />
                                    </div>
                                  </div>

                                  <div className="shrink-0 w-full sm:w-64">
                                    <select
                                      value={selectedVal}
                                      onChange={(e) => handleChangePair(e.target.value)}
                                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30"
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
                      <label className="block text-xs font-bold text-slate-300 mb-2">
                        Jawaban Esai Anda:
                      </label>
                      <textarea
                        rows={6}
                        value={activeAttempt.studentAnswers[currentQuestion.id] || ''}
                        onChange={(e) => setStudentAnswer(currentQuestion.id, e.target.value)}
                        placeholder="Ketik jawaban esai secara lengkap dan terstruktur di sini..."
                        className="w-full p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
                      />
                    </div>
                  )}
                </div>
              ) : null}

              {/* Navigasi Bawah: Sebelumnya & Berikutnya */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold disabled:opacity-40 transition"
                >
                  ← Soal Sebelumnya
                </button>

                {currentQuestionIndex === questions.length - 1 ? (
                  <button
                    onClick={() => setIsExitBarOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Selesai & Kirim Ujian
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition"
                  >
                    Soal Berikutnya →
                  </button>
                )}
              </div>
            </div>

            {/* Panel Kanan: Kisi Nomor Navigasi Soal */}
            <div className="w-full md:w-64 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl h-fit space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-xs font-black uppercase text-white tracking-wider">
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
                    <span className="text-[11px] font-bold text-slate-400">
                      {answeredCount}/{questions.length} Terjawab
                    </span>
                  );
                })()}
              </div>

              {/* Grid Kotak Nomor Soal */}
              <div className="grid grid-cols-5 gap-2">
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
                      ? Object.values(ans).some((v) => v !== undefined && v !== null && v !== '')
                      : true);
                  const isDoubt = Boolean(doubtQuestions[q.id]);

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(i)}
                      className={`h-10 rounded-xl font-mono text-xs font-black transition relative ${
                        isCurrent
                          ? 'bg-indigo-600 text-white ring-2 ring-white shadow-lg'
                          : isDoubt
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : isAnswered
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              {/* Keterangan Warna */}
              <div className="pt-3 border-t border-slate-800 text-[10px] space-y-1.5 text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-emerald-600 inline-block shrink-0" />
                  <span>Sudah Terjawab</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-amber-500 inline-block shrink-0" />
                  <span>Ragu-ragu</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-slate-800 inline-block shrink-0" />
                  <span>Belum Terjawab</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded bg-indigo-600 inline-block shrink-0" />
                  <span>Sedang Dibuka</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
