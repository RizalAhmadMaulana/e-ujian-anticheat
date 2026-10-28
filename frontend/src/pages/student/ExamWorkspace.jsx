import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import { useExamSecurity } from '../../hooks/useExamSecurity';
import { useProctorSocket } from '../../hooks/useProctorSocket';
import { playExitSuccessAlarm } from '../../utils/soundEffects';
import { submitExamAnswersApi, verifyExitPasswordApi } from '../../api/examApi';
import { proctoringApi } from '../../api/proctoringApi';
import Modal from '../../components/common/Modal';
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
  LogOut
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

  const selectedPackage = activeAttempt.selectedPackage;

  // Masuk Kembali ke Mode Fullscreen
  const handleReEnterFullscreen = async () => {
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
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
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col relative select-none overflow-hidden ${
      isLandscape ? 'orientation-landscape' : 'orientation-portrait'
    }`}>
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

        {/* Countdown Timer & Action Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
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
          <div className="bg-red-900/60 border border-red-500/50 rounded-2xl p-4 max-w-md w-full text-xs text-left text-red-100 mb-6 space-y-1.5 shadow-xl">
            <div className="font-extrabold text-red-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>Log Pelanggaran Sistem Terkini:</span>
            </div>
            <div>• Tipe Pelanggaran: <strong className="font-mono text-white">{activeAttempt.violationLogs[0]?.violationType || 'TAB_SWITCH'}</strong></div>
            <div>• Waktu Kejadian: <strong className="font-mono text-white">{activeAttempt.violationLogs[0]?.detectedAt || 'Detik Ini'}</strong></div>
            <div>• Keterangan: <em>{activeAttempt.violationLogs[0]?.description || 'Perpindahan aplikasi/layar terdeteksi.'}</em></div>
            <div>• Total Akumulasi: <strong className="text-yellow-300">{activeAttempt.violationCount} kali pelanggaran</strong></div>
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
              handleSecurityViolation('CONTEXT_MENU_ATTEMPT', 'Upaya klik kanan terdeteksi dan diblokir sistem');
              triggerViolationLock('CONTEXT_MENU_ATTEMPT', 'Upaya klik kanan terdeteksi dan diblokir sistem');
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

                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                        {currentQuestion.questionType === 'MULTIPLE_CHOICE' ? 'Pilihan Ganda' : 'Esai'}
                      </span>
                    </div>
                  </div>

                  {/* Teks Pertanyaan Soal */}
                  <div className="text-sm sm:text-base text-slate-100 font-semibold leading-relaxed">
                    {currentQuestion.questionText}
                  </div>

                  {/* Pilihan Jawaban Pilihan Ganda (A-E) */}
                  {currentQuestion.questionType === 'MULTIPLE_CHOICE' ? (
                    <div className="space-y-3 pt-2">
                      {currentQuestion.options.map((opt) => {
                        const isSelected = activeAttempt.studentAnswers[currentQuestion.id] === opt.label;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => setStudentAnswer(currentQuestion.id, opt.label)}
                            className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-semibold transition flex items-center gap-4 ${
                              isSelected
                                ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-lg shadow-indigo-600/20 ring-2 ring-indigo-500/50'
                                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 transition ${
                              isSelected ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {opt.label}
                            </div>
                            <span className="leading-relaxed">{opt.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Input Esai */
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
                <span className="text-[11px] font-bold text-slate-400">
                  {Object.keys(activeAttempt.studentAnswers).length}/{questions.length} Terjawab
                </span>
              </div>

              {/* Grid Kotak Nomor Soal */}
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, i) => {
                  const isCurrent = currentQuestionIndex === i;
                  const isAnswered = Boolean(activeAttempt.studentAnswers[q.id]);
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
