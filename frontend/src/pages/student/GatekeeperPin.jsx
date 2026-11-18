import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import { getSessionsApi, verifyEntryPasswordApi, startExamAttemptApi } from '../../api/examApi';
import { isValidEntryToken } from '../../utils/tokenGenerator';
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
  Clock,
  Settings
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

  const studentClassName = typeof currentUser?.classroom === 'object' && currentUser?.classroom !== null
    ? (currentUser.classroom.name || currentUser.classroom_name || '-')
    : (currentUser?.classroom || currentUser?.classroom_name || '-');

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

  // Cari sesi ujian yang cocok dengan mata pelajaran yang dipilih (Prioritas ID Paket & Judul)
  const targetSession = React.useMemo(() => {
    // 1. Cocokkan ID Paket Soal secara langsung
    if (selectedPackage?.id) {
      const byPkg = availableSessions.find(s => {
        const sPkgId = typeof s.package === 'object' ? s.package?.id : (s.package || s.packageId || s.exam_package);
        return sPkgId && String(sPkgId) === String(selectedPackage.id);
      });
      if (byPkg) return byPkg;
    }

    // 2. Cocokkan Judul Paket
    if (selectedPackage?.title) {
      const cleanPkgTitle = selectedPackage.title.trim().toLowerCase();
      const byTitle = availableSessions.find(s => {
        const sTitle = (s.title || s.package_title || s.package?.title || '').trim().toLowerCase();
        return sTitle && sTitle === cleanPkgTitle;
      });
      if (byTitle) return byTitle;
    }

    // 3. Cocokkan activeAttempt.sessionId jika ada di availableSessions dan relevan
    if (activeAttempt?.sessionId) {
      const byId = availableSessions.find(s => s.id === activeAttempt.sessionId);
      if (byId) return byId;
    }

    // 4. Fallback jika ada tepat 1 sesi dengan mata pelajaran sama
    if (selectedPackage?.subjectName) {
      const cleanSubj = selectedPackage.subjectName.trim().toLowerCase();
      const sameSubj = availableSessions.filter(s => {
        const sSubj = (s.subject_name || s.subjectName || s.package?.subject_name || '').trim().toLowerCase();
        return sSubj === cleanSubj;
      });
      if (sameSubj.length === 1) return sameSubj[0];
    }

    return availableSessions[0] || examSessions[0];
  }, [availableSessions, selectedPackage, activeAttempt?.sessionId, examSessions]);

  const isNative = selectedPackage?.examType === 'NATIVE_QUESTIONS';

  const isAlreadySubmitted = Boolean(
    (targetSession?.my_attempt?.status === 'SUBMITTED' || Boolean(targetSession?.my_attempt?.finished_at)) &&
    !targetSession?.my_attempt?.is_remedial_allowed
  );

  const handleVerifyAndStart = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isAlreadySubmitted) {
      setErrorMsg('Anda sudah menyelesaikan ujian ini dan lembar jawaban Anda telah tersimpan secara resmi. Pengerjaan ulang hanya dapat dilakukan jika Guru Pengawas membuka akses remidi untuk Anda.');
      return;
    }
    setErrorMsg('');
    const inputPin = pin.trim().toUpperCase().replace(/\s+/g, '');

    if (!inputPin) {
      setErrorMsg(`Password Masuk wajib diisi untuk memulai ujian ${selectedPackage?.subjectName || ''}!`);
      return;
    }

    // 1. PANGGIL FULLSCREEN SEGERA PADA USER GESTURE SINKRON (Sebelum Async Network Calls)
    // Menjamin browser HP langsung masuk ke mode Fullscreen otomatis tanpa terblokir batasan gesture async
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      }
    } catch (_) {}

    setIsChecking(true);

    try {
      let verified = false;

      // Smart Session Resolution: cari apakah token yang diketik siswa cocok dengan salah satu sesi aktif
      let currentTargetSession = targetSession;
      const tokenMatchedSession = availableSessions.find(s => {
        const baseTok = s.entry_password || s.entryPassword || '';
        return isValidEntryToken(s.id, inputPin, baseTok);
      });

      if (tokenMatchedSession) {
        currentTargetSession = tokenMatchedSession;
        // Sinkronkan selectedPackage bila ada paket yang sesuai sesi ini
        const matchingPkg = examPackages.find(p => {
          const sPkgId = typeof tokenMatchedSession.package === 'object' ? tokenMatchedSession.package?.id : (tokenMatchedSession.package || tokenMatchedSession.packageId || tokenMatchedSession.exam_package);
          return (sPkgId && String(p.id) === String(sPkgId)) ||
                 (tokenMatchedSession.title && p.title && tokenMatchedSession.title.toLowerCase() === p.title.toLowerCase()) ||
                 (tokenMatchedSession.package_title && p.title && tokenMatchedSession.package_title.toLowerCase() === p.title.toLowerCase());
        });
        if (matchingPkg) {
          useExamStore.getState().setSelectedPackage(matchingPkg);
        }
      }

      let sessId = currentTargetSession?.id || activeAttempt?.sessionId;

      // 1. Verifikasi Password Masuk ke Backend Django
      if (sessId && sessId.length > 10) {
        setSessionId(sessId, currentTargetSession?.supervisor_pin || currentTargetSession?.supervisorPin || '');
        try {
          const apiRes = await verifyEntryPasswordApi(sessId, inputPin);
          if (apiRes && apiRes.success) {
            verified = true;
            if (apiRes.session_id) {
              sessId = apiRes.session_id;
            }
            if (apiRes.package_id) {
              const pkgFromApi = examPackages.find(p => String(p.id) === String(apiRes.package_id));
              if (pkgFromApi) {
                useExamStore.getState().setSelectedPackage(pkgFromApi);
              }
            }
          }
        } catch (apiErr) {
          console.warn('API verifyEntryPassword fallback ke lokal token validator:', apiErr);
          if (apiErr.response?.data?.status_code === 'ALREADY_SUBMITTED' || apiErr.response?.data?.message?.includes('sudah menyelesaikan')) {
            setIsChecking(false);
            setErrorMsg(apiErr.response.data.message);
            return;
          }
          if (apiErr.response?.data?.message) {
            setErrorMsg(apiErr.response.data.message);
          }
        }
      }

      // 2. Fallback verifikasi lokal store & dynamic token generator (jika offline/mock)
      if (!verified) {
        const baseToken = currentTargetSession?.entry_password || currentTargetSession?.entryPassword || '';
        const isValidDynamic = isValidEntryToken(sessId, inputPin, baseToken);
        const storeRes = verifyEntryPassword(inputPin);
        if (isValidDynamic || storeRes.success) {
          verified = true;
          setErrorMsg('');
        }
      }

      if (!verified) {
        setIsChecking(false);
        setErrorMsg((prev) => prev || `Token Masuk tidak valid atau sudah kedaluwarsa! Token ujian diperbarui secara otomatis setiap 10 menit. Silakan minta token terbaru kepada pengawas.`);
        return;
      }

      // 3. Berhasil diverifikasi: Daftarkan attempt siswa di backend & persist ke store/storage
      const targetOrientation = activeAttempt.screenOrientation || localStorage.getItem('exam_screen_orientation') || 'PORTRAIT';
      if (sessId) {
        useExamStore.getState().setSessionId(sessId, currentTargetSession?.supervisor_pin || currentTargetSession?.supervisorPin || '');
      }

      if (sessId && sessId.length > 10) {
        try {
          const attemptRes = await startExamAttemptApi(sessId, targetOrientation, true);
          if (attemptRes && attemptRes.attempt_id) {
            setAttemptId(attemptRes.attempt_id, attemptRes.violation_count ?? 0);
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

      // Pastikan status terkunci dari sesi sebelumnya di-reset secara mutlak (Anti-False Lock)
      useExamStore.setState((state) => {
        const updated = {
          ...state.activeAttempt,
          isLocked: false,
          _lastViolationLockTime: null,
        };
        try {
          localStorage.setItem('exam_active_attempt', JSON.stringify(updated));
        } catch (_) {}
        return { activeAttempt: updated };
      });

      // 3. Tampilkan toast Screen Pinned & Kunci Layar Penuh (Fullscreen)
      setShowPinnedToast(true);

      try {
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
          document.activeElement.blur();
        }
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen({ navigationUI: 'hide' });
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        } else if (docEl.mozRequestFullScreen) {
          await docEl.mozRequestFullScreen();
        } else if (docEl.msRequestFullscreen) {
          await docEl.msRequestFullscreen();
        }
      } catch (fullErr) {
        console.warn('Fullscreen request blocked or not user-gesture triggered:', fullErr);
      }

      // 4. Kunci Orientasi Layar Sesuai Pilihan Siswa (PORTRAIT / LANDSCAPE)
      if (window.screen && window.screen.orientation && window.screen.orientation.lock) {
        try {
          if (targetOrientation === 'PORTRAIT') {
            await window.screen.orientation.lock('portrait-primary').catch(() => window.screen.orientation.lock('portrait').catch(() => {}));
          } else if (targetOrientation === 'LANDSCAPE') {
            await window.screen.orientation.lock('landscape-primary').catch(() => window.screen.orientation.lock('landscape').catch(() => {}));
          }
        } catch (orientErr) {
          console.warn('Orientation lock error:', orientErr);
        }
      }

      // 5. Masuk ke Arena Ujian Sesungguhnya
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
    <div className="min-h-screen sm:h-screen sm:max-h-screen bg-[#090D16] text-zinc-100 flex flex-col justify-between overflow-y-auto sm:overflow-hidden select-none relative">
      {/* ======================================================== */}
      {/* 1. TOP HEADER BAR (EXAMBROWSER NAVBAR) */}
      {/* ======================================================== */}
      <header className="bg-[#090D16]/90 border-b border-zinc-800/80 px-4 sm:px-8 py-3 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-300 shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm sm:text-base text-zinc-100 tracking-tight flex items-center gap-2">
              <span>ExamBrowser Portal</span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hidden sm:inline-block">
                Terkunci Aman
              </span>
              <button
                type="button"
                onClick={() => navigate('/student/profile')}
                title="Pengaturan Profil Akun Siswa"
                className="p-1 sm:p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition shadow-2xs group"
              >
                <Settings className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform duration-300" />
              </button>
            </div>
            <div 
              onClick={() => navigate('/student/profile')}
              title="Klik untuk membuka Pengaturan Profil"
              className="text-xs text-zinc-400 truncate max-w-[200px] sm:max-w-md cursor-pointer hover:text-zinc-200 transition"
            >
              {currentUser?.fullName} • {studentClassName} (NISN: {currentUser?.username})
            </div>
          </div>
        </div>

        {/* Live Digital Clock & Logout Button */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 font-mono text-xs font-semibold text-zinc-300 tabular-nums">
            <Clock className="w-3.5 h-3.5 text-zinc-400" />
            <span>{timeString} WIB</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-rose-950/40 hover:text-rose-400 border border-zinc-800 text-xs font-medium text-zinc-300 transition"
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
        <div className="fixed top-16 z-50 animate-bounce">
          <div className="px-4 py-2.5 rounded-lg bg-zinc-900 border border-emerald-500/80 shadow-xl text-white flex items-center gap-2.5 backdrop-blur-md">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400 shrink-0">
              <Pin className="w-3 h-3 fill-emerald-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-400 tracking-wide uppercase">
                Aplikasi Dipasangi Pin (Screen Pinned)
              </div>
              <div className="text-[11px] text-zinc-400">
                Mode Penguncian Ujian Aktif — Membuka Lembar Asesmen...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. MAIN CONTENT AREA (FIT 1 SCREEN NO VERTICAL SCROLL) */}
      {/* ======================================================== */}
      <main className="flex-1 flex flex-col justify-center items-center px-3 py-2 relative z-10 overflow-hidden">
        {/* Header Identitas Sekolah & ExamBrowser Branding */}
        <div className="max-w-md w-full text-center mb-3 z-10 space-y-1">
          <div className="inline-flex items-center justify-center p-1.5 bg-zinc-800 border border-zinc-700 rounded-lg shadow-2xs mb-0.5">
            <ShieldCheck className="w-5 h-5 text-zinc-200" />
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            {schoolSettings?.name || currentUser?.schoolName || 'PORTAL ASESMEN SEKOLAH'}
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
            PORTAL E-UJIAN ANTI-CHEAT
          </h1>
          <p className="text-[11px] text-zinc-400 max-w-xs mx-auto line-clamp-1">
            Sistem Asesmen Sekolah Mandiri Berstandar Zero-Tolerance Security
          </p>
        </div>

        {/* Main Card Form */}
        <div className="max-w-md w-full bg-zinc-900/90 backdrop-blur-md border border-zinc-800 rounded-xl p-4 sm:p-5 shadow-2xs z-10 space-y-2.5">
          {/* 1. Identitas Peserta Siswa */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 font-bold text-xs shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {currentUser?.fullName || 'Peserta Asesmen'}
                </div>
                <div className="text-[10px] text-zinc-400 truncate">
                  NISN: {currentUser?.username || '-'} • Kelas: {studentClassName}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0 ml-2">
              Terverifikasi
            </span>
          </div>

          {/* 2. Kartu Informasi Mata Pelajaran Terpilih */}
          <div className="p-2.5 sm:p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/60 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                Mata Pelajaran Terpilih
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800 flex items-center gap-1">
                <Clock className="w-3 h-3 text-zinc-400" />
                {targetSession?.durationMinutes || targetSession?.duration_minutes || selectedPackage?.durationMinutes || 60} Menit
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight uppercase truncate">
                  {selectedPackage?.subjectName || targetSession?.subjectName || 'Mata Pelajaran'}
                </h2>
                <p className="text-[11px] text-zinc-400 font-normal truncate">
                  {selectedPackage?.title || targetSession?.title || 'Paket Ujian'}
                </p>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded shrink-0 flex items-center gap-1 ${
                isNative
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
              }`}>
                {isNative ? <BookOpen className="w-3 h-3" /> : <ExternalLink className="w-3 h-3" />}
                <span>{isNative ? 'Soal Mandiri' : 'Google Form'}</span>
              </span>
            </div>
          </div>

          {/* 3. Status Sistem: Layar Akan Dipasangi Pin (Compact Strip) */}
          <div className="p-2 rounded-lg bg-zinc-800/40 border border-zinc-700/50 text-[11px] text-zinc-300 flex items-center gap-2">
            <Pin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="leading-tight">
              Layar akan <strong>dikunci otomatis (Fullscreen)</strong> saat mengklik Mulai Ujian.
            </span>
          </div>

          {/* Error Alert Box */}
          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 text-[11px] text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-tight font-medium">{errorMsg}</span>
            </div>
          )}

          {/* 4. Input Form Pin / Password Masuk ATAU State Sudah Dikerjakan */}
          {isAlreadySubmitted ? (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Ujian Telah Selesai Dikerjakan</h3>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Anda sudah menyelesaikan ujian ini dan lembar jawaban Anda telah tersimpan secara resmi di portal guru pengawas.
                  {targetSession?.my_attempt?.total_score !== null && targetSession?.my_attempt?.total_score !== undefined && (
                    <span className="block mt-1.5 text-emerald-400 font-mono font-bold text-sm">
                      Nilai Asesmen: {targetSession.my_attempt.total_score}
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-zinc-400 pt-1">
                  Pengerjaan ulang hanya dapat dilakukan jika Guru Pengawas membuka akses remidi melalui menu Rekap Nilai Siswa.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/student/subjects')}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Portal Mapel</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-zinc-400" /> Password Masuk Ujian
                  </label>
                  <span className="text-[10px] text-zinc-400 font-normal">Dari Guru Pengawas</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    autoFocus
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
                    className="w-full text-center text-base sm:text-lg font-mono font-bold tracking-widest py-2 px-3 bg-zinc-950 border border-zinc-700 rounded-lg text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 uppercase transition"
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1 px-1 font-mono">
                  <span>Huruf Besar / Angka</span>
                  <span className="text-zinc-500">Minta token ke guru pengawas</span>
                </div>
              </div>

              {/* Tombol Utama: MULAI UJIAN */}
              <button
                type="button"
                onClick={handleVerifyAndStart}
                disabled={isChecking || showPinnedToast}
                className="w-full py-2.5 px-4 bg-zinc-100 hover:bg-white text-zinc-900 font-semibold rounded-lg text-xs sm:text-sm shadow-2xs transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] cursor-pointer"
              >
                {isChecking ? (
                  <div className="w-4 h-4 border-2 border-zinc-900/30 border-t-zinc-900 rounded-full animate-spin" />
                ) : (
                  <>
                    <span>MULAI UJIAN</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {/* Footer Card: Tombol Kembali & Status Keamanan */}
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px]">
            <button
              type="button"
              onClick={() => navigate('/student/subjects')}
              className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Kembali
            </button>
            <div className="flex items-center gap-1 text-emerald-400 font-medium text-[11px]">
              <CheckCircle2 className="w-3 h-3" /> Zero-Tolerance Active
            </div>
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* 3. FOOTER */}
      {/* ======================================================== */}
      <footer className="border-t border-zinc-800/80 bg-[#090D16]/60 px-4 py-2.5 text-center text-xs text-zinc-500 backdrop-blur-sm z-10 shrink-0 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Sesi Asesmen Diawasi oleh Pengawas Ruang Ujian & Sistem Anti-Cheat</span>
      </footer>
    </div>
  );
}
