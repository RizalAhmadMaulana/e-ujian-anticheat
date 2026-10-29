import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import { getSessionsApi, startExamAttemptApi } from '../../api/examApi';
import { 
  BookOpen, 
  ExternalLink, 
  ArrowRight, 
  ShieldCheck, 
  ArrowLeft, 
  Lock, 
  Sparkles, 
  Maximize2, 
  AlertTriangle, 
  Smartphone, 
  Monitor,
  Clock,
  AlertCircle,
  GraduationCap,
  LogOut
} from 'lucide-react';

export default function SubjectPortal() {
  const navigate = useNavigate();
  const { 
    examPackages, 
    fetchPackages,
    setSelectedPackage, 
    activeAttempt, 
    currentUser, 
    examSessions,
    setAttemptId,
    setSessionId,
    logout
  } = useExamStore();
  
  const [availableSessions, setAvailableSessions] = useState(examSessions);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchingPackageId, setLaunchingPackageId] = useState(null);
  const [portalAlert, setPortalAlert] = useState('');

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const fetchPortalData = async () => {
      try {
        if (fetchPackages) {
          await fetchPackages();
        }
        const sessions = await getSessionsApi();
        if (sessions && sessions.length > 0) {
          setAvailableSessions(sessions);
        }
      } catch (err) {
        console.warn('Gagal sinkronisasi data sesi & paket:', err);
      }
    };
    fetchPortalData();
  }, []);

  const formatDateTimeIndo = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    const dateFormatted = d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timeFormatted = d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${dateFormatted}, ${timeFormatted} WIB`;
  };

  const getScheduleStatus = (session) => {
    if (!session) {
      return {
        status: 'NO_SESSION',
        canStart: false,
        badgeText: 'Belum Terjadwal',
        btnText: 'BELUM TERJADWAL',
        timeText: 'Belum ada jadwal sesi asesmen dari pengawas',
        alertMessage: 'Ujian ini belum dijadwalkan oleh guru pengawas.',
      };
    }

    const now = new Date();
    const startTime = session.start_time || session.startTime;
    const endTime = session.end_time || session.endTime;

    if (startTime) {
      const sDate = new Date(startTime);
      if (!isNaN(sDate.getTime()) && now < sDate) {
        return {
          status: 'UPCOMING',
          canStart: false,
          badgeText: 'Belum Dibuka',
          btnText: 'BELUM DIBUKA',
          timeText: `Dibuka Mulai: ${formatDateTimeIndo(startTime)}`,
          alertMessage: `Ujian belum dibuka! Jadwal pengerjaan baru akan dimulai pada ${formatDateTimeIndo(startTime)}.`,
        };
      }
    }

    if (endTime) {
      const eDate = new Date(endTime);
      if (!isNaN(eDate.getTime()) && now > eDate) {
        return {
          status: 'CLOSED',
          canStart: false,
          badgeText: 'Telah Ditutup',
          btnText: 'SOAL DITUTUP',
          timeText: `Telah Berakhir: ${formatDateTimeIndo(endTime)}`,
          alertMessage: `Ujian ini telah selesai dan resmi ditutup pada ${formatDateTimeIndo(endTime)}. Anda tidak dapat memulai pengerjaan lagi.`,
        };
      }
    }

    return {
      status: 'ACTIVE',
      canStart: true,
      badgeText: 'Sedang Berjalan',
      btnText: 'MULAI UJIAN',
      timeText: endTime ? `Batas Pengerjaan: ${formatDateTimeIndo(endTime)}` : 'Sesi Ujian Aktif',
      alertMessage: null,
    };
  };

  const handleStartExam = (pkg, schedule, matchingSession) => {
    if (!schedule.canStart) {
      setPortalAlert(schedule.alertMessage || 'Ujian tidak dapat dibuka saat ini.');
      setTimeout(() => setPortalAlert(''), 6000);
      return;
    }

    setPortalAlert('');
    setSelectedPackage(pkg);

    if (matchingSession) {
      setSessionId(matchingSession.id, matchingSession.supervisor_pin || matchingSession.supervisorPin || '');
    }

    // Arahkan ke halaman kredensial Password Masuk khusus mapel yang dipilih
    navigate('/student/gatekeeper');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between select-none relative overflow-x-hidden">
      {/* Background Ambience Glow */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

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
      {/* 2. MAIN CONTENT AREA */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center space-y-6 z-10">
        {/* Navigation & Header Status Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/student/lobby')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Lobby</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-xl bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 font-bold flex items-center gap-1.5 shadow-sm">
              {activeAttempt.screenOrientation === 'LANDSCAPE' ? (
                <Monitor className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              )}
              <span>Orientasi: {activeAttempt.screenOrientation}</span>
            </span>
          </div>
        </div>

        {/* Big Title Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-950/70 border border-indigo-500/30 text-indigo-400 text-xs font-bold mb-1 shadow-sm">
            <Lock className="w-3.5 h-3.5" /> Ruang Ujian Terproteksi — Kelas {currentUser?.classroom || 'X TKJ 1'}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
            Selamat Datang di Portal Ujian — Pilih Mata Pelajaran
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            Klik tombol mata pelajaran di bawah ini untuk memulai pengerjaan. Layar Anda akan langsung dikunci dalam mode <strong className="text-white">Fullscreen Otomatis</strong>.
          </p>
        </div>

        {/* Warning Callout Box */}
        <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <div className="font-extrabold text-white text-xs">
              Peringatan Keamanan Asesmen:
            </div>
            <p className="text-amber-200/90 text-[11px]">
              Begitu tombol mata pelajaran ditekan, jangan tekan tombol ESC, tombol Home, atau berpindah ke aplikasi lain. Layar akan langsung dibekukan dan kejadian tersebut akan tercatat dalam <strong>E-Jurnal Guru</strong>.
            </p>
          </div>
        </div>

        {/* Real-time Schedule Alert / Notification Banner */}
        {portalAlert && (
          <div className="p-4 rounded-2xl bg-rose-950/90 border border-rose-500/80 text-rose-200 text-xs flex items-start gap-3 shadow-xl">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-extrabold text-white text-xs">Pemberitahuan Akses Jadwal Ujian:</div>
              <p className="text-rose-200 text-[11px] leading-relaxed">{portalAlert}</p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* LIST TOMBOL MATA PELAJARAN (EXAMBROWSER BIG BUTTONS) */}
        {/* ======================================================== */}
        <div className="space-y-3.5">
          {examPackages.map((pkg) => {
            const isSelected = launchingPackageId === pkg.id;
            const isNative = pkg.examType === 'NATIVE_QUESTIONS';

            const matchingSession = availableSessions.find((s) => {
              const matchPkg = s.package === pkg.id || s.packageId === pkg.id || (s.package && s.package.id === pkg.id);
              const matchTitle = (s.title && pkg.title && s.title.toLowerCase() === pkg.title.toLowerCase()) ||
                                 (s.package_title && pkg.title && s.package_title.toLowerCase() === pkg.title.toLowerCase());
              const matchSubject = (s.subject_name && pkg.subjectName && s.subject_name.toLowerCase() === pkg.subjectName.toLowerCase()) ||
                                   (s.subjectName && pkg.subjectName && s.subjectName.toLowerCase() === pkg.subjectName.toLowerCase());
              return matchPkg || matchTitle || matchSubject;
            });

            const schedule = getScheduleStatus(matchingSession);

            return (
              <button
                key={pkg.id}
                type="button"
                disabled={isLaunching}
                onClick={() => handleStartExam(pkg, schedule, matchingSession)}
                className={`w-full group relative text-left p-5 sm:p-6 rounded-3xl border-2 transition-all duration-200 shadow-xl flex items-center justify-between overflow-hidden ${
                  isSelected
                    ? 'border-indigo-400 bg-indigo-950/90 ring-4 ring-indigo-500/30'
                    : !schedule.canStart
                    ? schedule.status === 'CLOSED'
                      ? 'border-rose-950/70 bg-slate-900/50 hover:bg-slate-900/70 opacity-80 cursor-not-allowed'
                      : 'border-amber-950/70 bg-slate-900/60 hover:bg-slate-900/80 opacity-85 cursor-not-allowed'
                    : 'border-slate-800 hover:border-indigo-500 bg-slate-900/90 hover:bg-slate-900 transform hover:-translate-y-1 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-4 sm:gap-5">
                  {/* Icon Box */}
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-105 ${
                      !schedule.canStart
                        ? schedule.status === 'CLOSED'
                          ? 'bg-rose-950/40 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-950/40 text-amber-400 border border-amber-500/20'
                        : isNative
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-950/40'
                        : 'bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-purple-950/40'
                    }`}
                  >
                    {!schedule.canStart ? (
                      <Lock className="w-7 h-7" />
                    ) : isNative ? (
                      <BookOpen className="w-7 h-7" />
                    ) : (
                      <ExternalLink className="w-7 h-7" />
                    )}
                  </div>

                  {/* Title & Badge */}
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-base sm:text-lg font-black uppercase tracking-tight transition ${
                        !schedule.canStart ? 'text-slate-300' : 'text-white group-hover:text-indigo-300'
                      }`}>
                        {pkg.subjectName}
                      </span>
                      
                      {/* Type Badge */}
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          isNative
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : 'bg-purple-950 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {isNative ? 'Soal Mandiri' : 'Google Form'}
                      </span>

                      {/* Schedule Status Badge */}
                      {schedule.status === 'CLOSED' && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                          <span>Telah Ditutup</span>
                        </span>
                      )}
                      {schedule.status === 'UPCOMING' && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>Belum Dibuka</span>
                        </span>
                      )}
                      {schedule.status === 'ACTIVE' && (
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Sedang Berjalan</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 font-medium line-clamp-1">
                      {pkg.title}
                    </p>

                    {/* Schedule Time Information */}
                    <div className={`text-[11px] flex items-center gap-1.5 mt-1 font-mono font-medium ${
                      schedule.status === 'CLOSED'
                        ? 'text-rose-400/90'
                        : schedule.status === 'UPCOMING'
                        ? 'text-amber-400/90'
                        : 'text-indigo-400/90'
                    }`}>
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{schedule.timeText}</span>
                    </div>
                  </div>
                </div>

                {/* Action Button & Status Indicator */}
                <div className="flex items-center gap-2 text-xs font-black shrink-0 pl-2">
                  <span className={`hidden sm:inline-block font-mono tracking-wider ${
                    isSelected 
                      ? 'text-indigo-400' 
                      : !schedule.canStart 
                      ? schedule.status === 'CLOSED'
                        ? 'text-rose-400 font-bold'
                        : 'text-amber-400 font-bold'
                      : 'text-indigo-400 group-hover:text-white transition-colors'
                  }`}>
                    {isSelected 
                      ? 'MEMBUKA...' 
                      : !schedule.canStart 
                      ? schedule.btnText 
                      : 'MULAI UJIAN'}
                  </span>

                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center transition ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-400 text-white'
                      : !schedule.canStart
                      ? schedule.status === 'CLOSED'
                        ? 'bg-rose-950/60 border-rose-500/40 text-rose-400'
                        : 'bg-amber-950/60 border-amber-500/40 text-amber-400'
                      : 'bg-indigo-600/20 group-hover:bg-indigo-600 border-indigo-500/30 text-indigo-300 group-hover:text-white'
                  }`}>
                    {isSelected ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : !schedule.canStart ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

      </main>

      {/* ======================================================== */}
      {/* 3. FOOTER */}
      {/* ======================================================== */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 px-4 py-3 text-center text-xs text-slate-500 backdrop-blur-sm z-10 flex items-center justify-center gap-1.5 shrink-0">
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span>Sesi Asesmen Diawasi oleh Pengawas Ruang Ujian & Sistem Anti-Cheat</span>
      </footer>
    </div>
  );
}
