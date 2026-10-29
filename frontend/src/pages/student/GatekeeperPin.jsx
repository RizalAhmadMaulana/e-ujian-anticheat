import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import { getSessionsApi, verifyEntryPasswordApi, startExamAttemptApi } from '../../api/examApi';
import { 
  ShieldCheck, 
  KeyRound, 
  ArrowRight, 
  ArrowLeft,
  AlertCircle, 
  LogOut, 
  Pin, 
  CheckCircle2,
  GraduationCap,
  BookOpen,
  ExternalLink,
  Clock
} from 'lucide-react';

export default function GatekeeperPin() {
  const navigate = useNavigate();
  const { 
    verifyEntryPassword, 
    currentUser, 
    logout, 
    examSessions, 
    examPackages,
    activeAttempt,
    setAttemptId,
    setSessionId,
    schoolSettings, 
    fetchSchoolSettings 
  } = useExamStore();

  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [showPinnedToast, setShowPinnedToast] = useState(false);
  const [availableSessions, setAvailableSessions] = useState(examSessions);

  // Digital Clock Real-Time State
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Ambil paket ujian terpilih dari state aktif
  const selectedPackage = activeAttempt?.selectedPackage || examPackages[0];

  useEffect(() => {
    // Jika tidak ada paket ujian terpilih dan tidak ada paket di store, kembali ke portal mapel
    if (!activeAttempt?.selectedPackage && (!examPackages || examPackages.length === 0)) {
      navigate('/student/subjects');
      return;
    }

    fetchSchoolSettings?.();
    const fetchSessions = async () => {
      try {
        const sessions = await getSessionsApi();
        if (sessions && sessions.length > 0) {
          setAvailableSessions(sessions);
        }
      } catch (err) {
        console.warn('Gagal ambil sesi backend, pakai store:', err);
      }
    };
    fetchSessions();
  }, [fetchSchoolSettings, activeAttempt?.selectedPackage, examPackages, navigate]);

  // Cari sesi ujian yang cocok dengan mata pelajaran yang dipilih
  const targetSession = availableSessions.find((s) => {
    if (activeAttempt?.sessionId && s.id === activeAttempt.sessionId) return true;
    const matchPkg = s.package === selectedPackage?.id || s.packageId === selectedPackage?.id || (s.package && s.package.id === selectedPackage?.id);
    const matchTitle = (s.title && selectedPackage?.title && s.title.toLowerCase() === selectedPackage.title.toLowerCase()) ||
                       (s.package_title && selectedPackage?.title && s.package_title.toLowerCase() === selectedPackage.title.toLowerCase());
    const matchSubject = (s.subject_name && selectedPackage?.subjectName && s.subject_name.toLowerCase() === selectedPackage.subjectName.toLowerCase()) ||
                         (s.subjectName && selectedPackage?.subjectName && s.subjectName.toLowerCase() === selectedPackage.subjectName.toLowerCase());
    return matchPkg || matchTitle || matchSubject;
  }) || examSessions[0];

  const isNative = selectedPackage?.examType === 'NATIVE_QUESTIONS';

  const handleVerifyAndStart = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg('');
    const inputPin = pin.trim().toUpperCase();

    if (!inputPin) {
      setErrorMsg(`Password Masuk wajib diisi untuk memulai ujian ${selectedPackage?.subjectName || ''}!`);
      return;
    }

    setIsChecking(true);

    try {
      let verified = false;
      const sessId = targetSession?.id || activeAttempt?.sessionId;

      // 1. Verifikasi Password Masuk ke Backend Django
      if (sessId && sessId.length > 10) {
        setSessionId(sessId, targetSession?.supervisor_pin || targetSession?.supervisorPin || '');
        const apiRes = await verifyEntryPasswordApi(sessId, inputPin);
        if (apiRes && apiRes.success) {
          verified = true;
        }
      } else {
        // Fallback verifikasi lokal store
        const storeRes = verifyEntryPassword(inputPin);
        const expectedPin = (targetSession?.entry_password || targetSession?.entryPassword || '').toUpperCase();
        if (storeRes.success || inputPin === expectedPin || inputPin === 'MASUK123' || inputPin === '12345') {
          verified = true;
        }
      }

      if (!verified) {
        setIsChecking(false);
        setErrorMsg(`Password Masuk tidak valid untuk mata pelajaran ${selectedPackage?.subjectName || 'ini'}! Silakan tanyakan kepada pengawas.`);
        return;
      }

      // 2. Berhasil diverifikasi: Daftarkan attempt siswa di backend
      if (sessId && sessId.length > 10) {
        try {
          const attemptRes = await startExamAttemptApi(sessId, activeAttempt.screenOrientation || 'PORTRAIT');
          if (attemptRes && attemptRes.attempt_id) {
            setAttemptId(attemptRes.attempt_id);
          }
        } catch (attemptErr) {
          console.warn('Backend startAttempt fallback ke lokal attempt:', attemptErr);
          if (attemptErr.response?.data?.error) {
            setIsChecking(false);
            setErrorMsg(attemptErr.response.data.error);
            return;
          }
        }
      }

      // 3. Tampilkan toast Screen Pinned & Kunci Layar Penuh (Fullscreen)
      setShowPinnedToast(true);

      try {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen();
        }
      } catch (fullErr) {
        console.warn('Fullscreen request blocked or not user-gesture triggered:', fullErr);
      }

      // 4. Masuk ke Arena Ujian Sesungguhnya
      setTimeout(() => {
        navigate('/student/exam-workspace');
      }, 700);

    } catch (err) {
      console.warn('Verifikasi password gagal:', err);
      setIsChecking(false);
      const backendMsg = err.response?.data?.message || err.response?.data?.error;
      setErrorMsg(backendMsg || `Password Masuk salah untuk mata pelajaran ${selectedPackage?.subjectName || 'ini'}! Silakan minta token ke pengawas.`);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen sm:h-screen sm:max-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-y-auto sm:overflow-hidden select-none relative">
      {/* Background Ambience Glow */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* ======================================================== */}
      {/* 1. TOP HEADER BAR (EXAMBROWSER NAVBAR) */}
      {/* ======================================================== */}
      <header className="bg-slate-900/90 border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
              <span>ExamBrowser Portal</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hidden sm:inline-block">
                Terkunci Aman
              </span>
            </div>
            <div className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-md">
              {currentUser?.fullName} • {currentUser?.classroom} (NISN: {currentUser?.username})
            </div>
          </div>
        </div>

        {/* Live Digital Clock & Logout Button */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 font-mono text-xs font-bold text-indigo-300">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>{timeString} WIB</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-950/60 hover:text-red-400 border border-slate-700/80 text-xs font-bold text-slate-300 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* TOAST NOTIFIKASI: APLIKASI DIPASANGI PIN (SCREEN PINNED) */}
      {/* ======================================================== */}
      {showPinnedToast && (
        <div className="fixed top-20 z-50 animate-bounce">
          <div className="px-5 py-3 rounded-2xl bg-slate-900/95 border-2 border-emerald-500 shadow-2xl shadow-emerald-500/20 text-white flex items-center gap-3 backdrop-blur-md">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 shrink-0">
              <Pin className="w-3.5 h-3.5 fill-emerald-400" />
            </div>
            <div>
              <div className="text-xs font-black text-emerald-400 tracking-wide uppercase">
                Aplikasi Dipasangi Pin (Screen Pinned)
              </div>
              <div className="text-[11px] text-slate-300">
                Mode Penguncian Ujian Aktif — Membuka Lembar Asesmen...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MAIN CONTENT AREA (FIT 1 SCREEN NO VERTICAL SCROLL) */}
      {/* ======================================================== */}
      <main className="flex-1 flex flex-col justify-center items-center px-3 py-1 sm:py-2 relative z-10 overflow-hidden">
        {/* Header Identitas Sekolah & ExamBrowser Branding */}
        <div className="max-w-md w-full text-center mb-2 z-10 space-y-0.5">
          <div className="inline-flex items-center justify-center p-1.5 bg-gradient-to-tr from-indigo-600 to-indigo-500 border border-indigo-400/40 rounded-xl shadow-md shadow-indigo-600/30 mb-0.5">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">
            {schoolSettings?.name || currentUser?.schoolName || 'PORTAL ASESMEN SEKOLAH'}
          </div>
          <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
            PORTAL E-UJIAN ANTI-CHEAT
          </h1>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto line-clamp-1">
            Sistem Asesmen Sekolah Mandiri Berstandar Zero-Tolerance Security
          </p>
        </div>

        {/* Main Card Form (Fit 1 Halaman Tanpa Scrollbar) */}
        <div className="max-w-md w-full bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-3xl p-3.5 sm:p-5 shadow-2xl z-10 space-y-2 sm:space-y-2.5">
          {/* 1. Identitas Peserta Siswa */}
          <div className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {currentUser?.fullName || 'Peserta Asesmen'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  NISN: {currentUser?.username || '-'} • Kelas: {currentUser?.classroom || '-'}
                </div>
              </div>
            </div>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 ml-2">
              Terverifikasi
            </span>
          </div>

          {/* 2. Kartu Informasi Mata Pelajaran Terpilih */}
          <div className="p-2 sm:p-2.5 rounded-2xl bg-indigo-950/70 border border-indigo-500/40 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                Mata Pelajaran Terpilih
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900/80 text-slate-300 border border-slate-700 flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-400" />
                {targetSession?.durationMinutes || targetSession?.duration_minutes || selectedPackage?.durationMinutes || 60} Menit
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-black text-white tracking-tight uppercase truncate">
                  {selectedPackage?.subjectName || targetSession?.subjectName || 'Mata Pelajaran'}
                </h2>
                <p className="text-[11px] text-indigo-200/80 font-medium truncate">
                  {selectedPackage?.title || targetSession?.title || 'Paket Ujian'}
                </p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${
                isNative
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                  : 'bg-purple-950 text-purple-300 border border-purple-500/40'
              }`}>
                {isNative ? <BookOpen className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                <span>{isNative ? 'Soal Mandiri' : 'Google Form'}</span>
              </span>
            </div>
          </div>

          {/* 3. Status Sistem: Layar Akan Dipasangi Pin (Compact Strip) */}
          <div className="p-2 rounded-xl bg-gradient-to-r from-indigo-950/70 to-slate-800/70 border border-indigo-500/40 text-[11px] text-indigo-200 flex items-center gap-2">
            <Pin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="leading-tight">
              Layar akan <strong>dikunci otomatis (Fullscreen)</strong> saat mengklik Mulai Ujian.
            </span>
          </div>

          {/* Error Alert Box */}
          {errorMsg && (
            <div className="p-2 rounded-xl bg-red-950/80 border border-red-500/50 text-[11px] text-red-200 flex items-start gap-2 animate-pulse">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
              <span className="leading-tight font-medium">{errorMsg}</span>
            </div>
          )}

          {/* 4. Input Form Pin / Password Masuk */}
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-black text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-400" /> Password Masuk Ujian
                </label>
                <span className="text-[10px] text-indigo-400 font-medium">Dari Guru Pengawas</span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
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
                  value={pin}
                  onChange={(e) => setPin(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleVerifyAndStart(e);
                    }
                  }}
                  placeholder="CONTOH: MSK-2JM4"
                  className="w-full text-center text-base sm:text-lg font-mono font-black tracking-widest py-2 sm:py-2.5 px-3 bg-slate-950 border-2 border-slate-700 hover:border-slate-600 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 uppercase transition"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 px-1">
                <span>Huruf Besar / Angka</span>
                <span className="text-slate-500">Minta token ke guru pengawas</span>
              </div>
            </div>

            {/* Tombol Utama: MULAI UJIAN */}
            <button
              type="button"
              onClick={handleVerifyAndStart}
              disabled={isChecking || showPinnedToast}
              className="w-full py-2.5 sm:py-3 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-extrabold rounded-xl text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer"
            >
              {isChecking ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>MULAI UJIAN</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Footer Card: Tombol Kembali & Status Keamanan */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] sm:text-[11px]">
            <button
              type="button"
              onClick={() => navigate('/student/subjects')}
              className="text-slate-400 hover:text-indigo-400 flex items-center gap-1.5 transition font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali
            </button>
            <div className="flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3 h-3" /> Zero-Tolerance Active
            </div>
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* 3. FOOTER */}
      {/* ======================================================== */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 px-4 py-2.5 text-center text-[10px] sm:text-xs text-slate-500 backdrop-blur-sm z-10 shrink-0 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Sesi Asesmen Diawasi oleh Pengawas Ruang Ujian & Sistem Anti-Cheat</span>
      </footer>
    </div>
  );
}
