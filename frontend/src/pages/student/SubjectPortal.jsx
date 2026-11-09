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
  LogOut,
  Settings
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

  const studentClassName = typeof currentUser?.classroom === 'object' && currentUser?.classroom !== null
    ? (currentUser.classroom.name || currentUser.classroom_name || '-')
    : (currentUser?.classroom || currentUser?.classroom_name || '-');

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
    <div className="min-h-screen bg-[#090D16] text-zinc-100 flex flex-col justify-between select-none relative overflow-x-hidden">
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
      {/* 2. MAIN CONTENT AREA */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center space-y-5 z-10">
        {/* Navigation & Header Status Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/student/lobby')}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 shadow-2xs hover:bg-zinc-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali ke Lobby</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1 rounded-lg bg-zinc-900 text-zinc-300 border border-zinc-800 font-medium flex items-center gap-1.5 shadow-2xs">
              {activeAttempt.screenOrientation === 'LANDSCAPE' ? (
                <Monitor className="w-3.5 h-3.5 text-zinc-400" />
              ) : (
                <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
              )}
              <span>Orientasi: {activeAttempt.screenOrientation}</span>
            </span>
          </div>
        </div>

        {/* Big Title Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium mb-1 shadow-2xs">
            <Lock className="w-3.5 h-3.5 text-zinc-400" /> Ruang Ujian Terproteksi — Kelas {studentClassName}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Selamat Datang di Portal Ujian — Pilih Mata Pelajaran
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
            Klik tombol mata pelajaran di bawah ini untuk memulai pengerjaan. Layar Anda akan langsung dikunci dalam mode <strong className="text-white">Fullscreen Otomatis</strong>.
          </p>
        </div>

        {/* Warning Callout Box */}
        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/60 text-amber-200 text-xs flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <div className="font-bold text-white text-xs">
              Peringatan Keamanan Asesmen:
            </div>
            <p className="text-amber-200/90 text-[11px]">
              Begitu tombol mata pelajaran ditekan, jangan tekan tombol ESC, tombol Home, atau berpindah ke aplikasi lain. Layar akan langsung dibekukan dan kejadian tersebut akan tercatat dalam <strong>E-Jurnal Guru</strong>.
            </p>
          </div>
        </div>

        {/* Real-time Schedule Alert / Notification Banner */}
        {portalAlert && (
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-3 shadow-2xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-bold text-white text-xs">Pemberitahuan Akses Jadwal Ujian:</div>
              <p className="text-rose-200 text-[11px] leading-relaxed">{portalAlert}</p>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* LIST TOMBOL MATA PELAJARAN (EXAMBROWSER BIG BUTTONS) */}
        {/* ======================================================== */}
        <div className="space-y-3">
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
                className={`w-full group relative text-left p-4 sm:p-5 rounded-xl border transition-all duration-150 shadow-2xs flex items-center justify-between overflow-hidden hover:-translate-y-0.5 active:scale-[0.99] ${
                  isSelected
                    ? 'border-blue-500 bg-zinc-900 ring-2 ring-blue-500/20'
                    : !schedule.canStart
                    ? schedule.status === 'CLOSED'
                      ? 'border-zinc-800/60 bg-zinc-900/40 opacity-75 cursor-not-allowed'
                      : 'border-zinc-800/60 bg-zinc-900/50 opacity-80 cursor-not-allowed'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/80 hover:bg-zinc-900 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3.5 sm:gap-4">
                  {/* Icon Box */}
                  <div
                    className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 border transition-transform group-hover:scale-105 ${
                      !schedule.canStart
                        ? schedule.status === 'CLOSED'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : isNative
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}
                  >
                    {!schedule.canStart ? (
                      <Lock className="w-5 h-5" />
                    ) : isNative ? (
                      <BookOpen className="w-5 h-5" />
                    ) : (
                      <ExternalLink className="w-5 h-5" />
                    )}
                  </div>

                  {/* Title & Badge */}
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-sm sm:text-base font-bold uppercase tracking-tight transition ${
                        !schedule.canStart ? 'text-zinc-300' : 'text-white group-hover:text-blue-300'
                      }`}>
                        {pkg.subjectName}
                      </span>
                      
                      {/* Type Badge */}
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700"
                      >
                        {isNative ? 'Soal Mandiri' : 'Google Form'}
                      </span>

                      {/* Schedule Status Badge */}
                      {schedule.status === 'CLOSED' && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                          <span>Telah Ditutup</span>
                        </span>
                      )}
                      {schedule.status === 'UPCOMING' && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>Belum Dibuka</span>
                        </span>
                      )}
                      {schedule.status === 'ACTIVE' && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Sedang Berjalan</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-400 font-normal line-clamp-1">
                      {pkg.title}
                    </p>

                    {/* Schedule Time Information */}
                    <div className={`text-[11px] flex items-center gap-1.5 mt-1 font-mono font-medium tabular-nums ${
                      schedule.status === 'CLOSED'
                        ? 'text-rose-400/90'
                        : schedule.status === 'UPCOMING'
                        ? 'text-amber-400/90'
                        : 'text-zinc-400'
                    }`}>
                      <Clock className="w-3 h-3 shrink-0" />
                      <span>{schedule.timeText}</span>
                    </div>
                  </div>
                </div>

                {/* Action Button & Status Indicator */}
                <div className="flex items-center gap-2 text-xs font-semibold shrink-0 pl-2">
                  <span className={`hidden sm:inline-block font-mono tracking-wider ${
                    isSelected 
                      ? 'text-blue-400' 
                      : !schedule.canStart 
                      ? schedule.status === 'CLOSED'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                      : 'text-zinc-400 group-hover:text-white transition-colors'
                  }`}>
                    {isSelected 
                      ? 'MEMBUKA...' 
                      : !schedule.canStart 
                      ? schedule.btnText 
                      : 'MULAI UJIAN'}
                  </span>

                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center transition ${
                    isSelected
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : !schedule.canStart
                      ? schedule.status === 'CLOSED'
                        ? 'bg-zinc-800 border-zinc-700/80 text-rose-400'
                        : 'bg-zinc-800 border-zinc-700/80 text-amber-400'
                      : 'bg-zinc-800 group-hover:bg-zinc-700 border-zinc-700 text-zinc-300 group-hover:text-white'
                  }`}>
                    {isSelected ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : !schedule.canStart ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
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
      <footer className="border-t border-zinc-800/80 bg-[#090D16]/60 px-4 py-3 text-center text-xs text-zinc-500 backdrop-blur-sm z-10 flex items-center justify-center gap-1.5 shrink-0">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Sesi Asesmen Diawasi oleh Pengawas Ruang Ujian & Sistem Anti-Cheat</span>
      </footer>
    </div>
  );
}
