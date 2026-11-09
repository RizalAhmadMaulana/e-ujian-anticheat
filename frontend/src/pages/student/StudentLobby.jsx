import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import { fetchCurrentUserApi } from '../../api/authApi';
import Modal from '../../components/common/Modal';
import WelcomeProfileModal from '../../components/modals/WelcomeProfileModal';
import { 
  FileText, 
  Calendar, 
  Info, 
  LogOut, 
  Smartphone, 
  Monitor, 
  ArrowRight, 
  ShieldAlert,
  GraduationCap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Ban,
  ShieldCheck,
  CalendarCheck,
  Layers,
  Lock,
  Settings
} from 'lucide-react';

export default function StudentLobby() {
  const navigate = useNavigate();
  const { 
    currentUser, 
    setScreenOrientation, 
    logout, 
    examSessions, 
    fetchSessions,
    schoolSettings, 
    fetchSchoolSettings 
  } = useExamStore();

  // Modals State
  const [isOrientationModalOpen, setIsOrientationModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // Digital Clock Real-Time State
  const [currentTime, setCurrentTime] = useState(new Date());

  const studentClassName = typeof currentUser?.classroom === 'object' && currentUser?.classroom !== null
    ? (currentUser.classroom.name || currentUser.classroom_name || '-')
    : (currentUser?.classroom || currentUser?.classroom_name || '-');

  useEffect(() => {
    fetchSchoolSettings?.();
    fetchSessions?.();
    
    // Pengecekan profil akun siswa saat pertama kali masuk lobby
    fetchCurrentUserApi?.().then((user) => {
      if (user) {
        useExamStore.getState().setCurrentUser(user);

        const isDismissed = sessionStorage.getItem('dismiss_profile_welcome_modal') === 'true';
        if (!isDismissed && user.needs_profile_completion) {
          setShowWelcomeModal(true);
        }
      }
    }).catch(() => {});

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [fetchSchoolSettings, fetchSessions]);

  // Helper Format Rentang Jadwal (Tanggal & Jam Mulai hingga Berakhir)
  const formatScheduleRange = (session) => {
    const startTimeStr = session.start_time || session.startTime;
    const endTimeStr = session.end_time || session.endTime;

    if (!startTimeStr && !endTimeStr) {
      return 'Jadwal Belum Ditentukan';
    }

    const sTime = startTimeStr ? new Date(startTimeStr) : null;
    const eTime = endTimeStr ? new Date(endTimeStr) : null;

    const isValid = (d) => d && !isNaN(d.getTime());

    if (!isValid(sTime) && !isValid(eTime)) {
      return `${startTimeStr || ''} - ${endTimeStr || ''} WIB`;
    }

    const formatDate = (d) => d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    const formatTime = (d) => d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (isValid(sTime) && isValid(eTime)) {
      const sDate = formatDate(sTime);
      const eDate = formatDate(eTime);
      const sHour = formatTime(sTime);
      const eHour = formatTime(eTime);

      if (sDate === eDate) {
        return `${sDate} (${sHour} - ${eHour} WIB)`;
      } else {
        return `${sDate} ${sHour} s/d ${eDate} ${eHour} WIB`;
      }
    }

    if (isValid(sTime)) {
      return `Mulai: ${formatDate(sTime)}, ${formatTime(sTime)} WIB`;
    }

    return `Berakhir: ${formatDate(eTime)}, ${formatTime(eTime)} WIB`;
  };

  // Helper Status Sesi Real-Time (Sesi Dibuka / Belum Dibuka / Sudah Ditutup)
  const getScheduleStatus = (session) => {
    const startTimeStr = session.start_time || session.startTime;
    const endTimeStr = session.end_time || session.endTime;
    const now = new Date();

    if (!startTimeStr && !endTimeStr) {
      return {
        status: 'UNKNOWN',
        label: 'Belum Terjadwal',
      };
    }

    const sTime = startTimeStr ? new Date(startTimeStr) : null;
    const eTime = endTimeStr ? new Date(endTimeStr) : null;

    // 1. Jika sudah melewati tanggal/jam berakhir -> Sudah Ditutup
    if (eTime && !isNaN(eTime.getTime()) && now > eTime) {
      return {
        status: 'CLOSED',
        label: 'Sudah Ditutup',
      };
    }

    // 2. Jika waktu/tanggal belum sampai -> Belum Dibuka
    if (sTime && !isNaN(sTime.getTime()) && now < sTime) {
      return {
        status: 'UPCOMING',
        label: 'Belum Dibuka',
      };
    }

    // 3. Waktu dan tanggal sudah sesuai (sedang aktif) -> Sesi Dibuka
    return {
      status: 'ACTIVE',
      label: 'Sesi Dibuka',
    };
  };

  // Format Jam Digital Real-Time
  const hours = currentTime.getHours();
  const timeString = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Ucapan Sapaan Berdasarkan Jam
  let greeting = 'Selamat Pagi';
  if (hours >= 11 && hours < 15) {
    greeting = 'Selamat Siang';
  } else if (hours >= 15 && hours < 18) {
    greeting = 'Selamat Sore';
  } else if (hours >= 18 || hours < 5) {
    greeting = 'Selamat Malam';
  }

  const handleSelectOrientation = (mode) => {
    setScreenOrientation(mode);
    setIsOrientationModalOpen(false);
    navigate('/student/subjects');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-zinc-100 flex flex-col justify-between select-none">
      {/* ======================================================== */}
      {/* 1. TOP HEADER BAR */}
      {/* ======================================================== */}
      <header className="bg-[#090D16]/90 border-b border-zinc-800/80 px-4 sm:px-8 py-3 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
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
      {/* 2. MAIN CONTENT AREA (BERANDA EXAMBROWSER) */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center space-y-6">
        {/* Banner Ucapan & Jam Real-Time Mobile */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-medium mb-1 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{greeting}, {currentUser?.fullName?.split(' ')[0] || 'Siswa'}!</span>
            <span className="sm:hidden font-mono">• {timeString} WIB</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Pusat Aktivitas Asesmen Digital Siswa
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
            Pilih menu di bawah ini untuk memulai asesmen terkunci, melihat jadwal ujian kelas, atau membaca tata tertib.
          </p>
        </div>

        {/* ======================================================== */}
        {/* GRID MENU UTAMA BERGAYA EXAMBROWSER */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* KARTU 1: E-UJIAN (MENU UTAMA) */}
          <div
            onClick={() => setIsOrientationModalOpen(true)}
            className="cursor-pointer group relative bg-zinc-900/80 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 sm:p-6 transition-all duration-150 shadow-2xs hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-blue-400 transition-transform">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-600 text-white shadow-2xs">
                  Menu Utama
                </span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-blue-300 transition">
                E-UJIAN
              </h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Masuk ke ruang pengerjaan asesmen mandiri atau formulir Google Form dalam proteksi layar penuh terkunci (*Zero-Tolerance Lockdown*).
              </p>
            </div>

            <div className="mt-6 pt-3.5 border-t border-zinc-800/80 flex items-center justify-between text-xs font-semibold text-zinc-300 group-hover:text-white">
              <span>Buka Ruang Ujian</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* KARTU 2: JADWAL UJIAN */}
          <div
            onClick={() => setIsScheduleModalOpen(true)}
            className="cursor-pointer group bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 sm:p-6 transition-all duration-150 shadow-2xs hover:-translate-y-0.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-300 transition-transform">
                  <Calendar className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                  Kelas {studentClassName}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-zinc-200 transition">
                JADWAL UJIAN
              </h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Lihat daftar jadwal sesi ujian aktif hari ini, mata pelajaran, serta durasi waktu pengerjaan asesmen.
              </p>
            </div>

            <div className="mt-6 pt-3.5 border-t border-zinc-800/80 flex items-center justify-between text-xs font-semibold text-zinc-400 group-hover:text-white">
              <span>Lihat Jadwal Lengkap</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>

          {/* KARTU 3: INFORMASI TATA TERTIB */}
          <div
            onClick={() => setIsRulesModalOpen(true)}
            className="cursor-pointer group bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 rounded-xl p-5 sm:p-6 transition-all duration-150 shadow-2xs hover:-translate-y-0.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-lg bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-amber-400 transition-transform">
                  <Info className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  Wajib Dibaca
                </span>
              </div>
              <h3 className="text-lg font-bold text-white group-hover:text-zinc-200 transition">
                TATA TERTIB UJIAN
              </h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Ketahui protokol anti-curang, larangan membuka tab baru, perpindahan aplikasi, screenshot, dan pembekuan layar.
              </p>
            </div>

            <div className="mt-6 pt-3.5 border-t border-zinc-800/80 flex items-center justify-between text-xs font-semibold text-zinc-400 group-hover:text-white">
              <span>Baca Ketentuan & Aturan</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="py-4 text-center text-zinc-500 text-xs border-t border-zinc-900">
        {schoolSettings?.name || 'Portal Asesmen Sekolah'} • Portal Ujian Anti-Cheat Berbasis Web & ExamBrowser
      </footer>

      {/* ======================================================== */}
      {/* 3. MODAL PILIH ORIENTASI LAYAR (PORTRAIT / LANDSCAPE) */}
      {/* ======================================================== */}
      <Modal
        isOpen={isOrientationModalOpen}
        onClose={() => setIsOrientationModalOpen(false)}
        title="Pilih Orientasi Layar Ujian"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-zinc-600 leading-relaxed">
            Pilihlah mode orientasi perangkat yang paling nyaman untuk mengerjakan soal. Tampilan lembar ujian akan menyesuaikan secara presisi:
          </p>

          <div className="grid grid-cols-2 gap-3.5">
            {/* Opsi Portrait */}
            <button
              onClick={() => handleSelectOrientation('PORTRAIT')}
              className="p-4 sm:p-5 rounded-xl border border-zinc-200 hover:border-zinc-400 bg-zinc-50 hover:bg-zinc-100 flex flex-col items-center text-center transition hover:-translate-y-0.5 active:scale-[0.98] group shadow-2xs"
            >
              <div className="w-12 h-12 rounded-lg bg-zinc-200/80 flex items-center justify-center text-zinc-800 mb-2.5 group-hover:scale-105 transition-transform">
                <Smartphone className="w-6 h-6" />
              </div>
              <span className="font-bold text-zinc-900 text-sm">PORTRAIT</span>
              <span className="text-[11px] text-zinc-500 mt-0.5">Mode Tegak (Layar Smartphone)</span>
              <span className="mt-2 text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-200 text-zinc-700">
                Rekomendasi HP
              </span>
            </button>

            {/* Opsi Landscape */}
            <button
              onClick={() => handleSelectOrientation('LANDSCAPE')}
              className="p-4 sm:p-5 rounded-xl border border-zinc-200 hover:border-zinc-400 bg-zinc-50 hover:bg-zinc-100 flex flex-col items-center text-center transition hover:-translate-y-0.5 active:scale-[0.98] group shadow-2xs"
            >
              <div className="w-12 h-12 rounded-lg bg-zinc-200/80 flex items-center justify-center text-zinc-800 mb-2.5 group-hover:scale-105 transition-transform">
                <Monitor className="w-6 h-6" />
              </div>
              <span className="font-bold text-zinc-900 text-sm">LANDSCAPE</span>
              <span className="text-[11px] text-zinc-500 mt-0.5">Mode Mendatar (Tablet / PC)</span>
              <span className="mt-2 text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-200 text-zinc-700">
                Rekomendasi PC / Tablet
              </span>
            </button>
          </div>

          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              <strong>Penting:</strong> Setelah Anda memilih orientasi dan mengklik mata pelajaran, sistem akan langsung meminta <strong>Mode Layar Penuh (Fullscreen)</strong>. Jangan tekan tombol keluar atau berpindah tab!
            </span>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* 4. MODAL JADWAL UJIAN AKTIF */}
      {/* ======================================================== */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title="Jadwal Asesmen Aktif Kelas Anda"
        maxWidth="max-w-xl"
      >
        <div className="space-y-3">
          <p className="text-xs text-zinc-600">
            Daftar sesi ujian yang dijadwalkan untuk kelas <strong>{studentClassName}</strong>:
          </p>

          <div className="space-y-2.5 max-h-84 overflow-y-auto pr-0.5">
            {examSessions.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 text-xs">
                Belum ada jadwal sesi asesmen yang aktif untuk kelas Anda saat ini.
              </div>
            ) : (
              examSessions.map((session) => {
                const scheduleRange = formatScheduleRange(session);
                const scheduleStatus = getScheduleStatus(session);

                return (
                  <div
                    key={session.id}
                    className="p-3 sm:p-3.5 rounded-lg border border-zinc-200/90 bg-white hover:border-zinc-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 uppercase tracking-wide">
                          {session.classroom || session.classroom_name || 'Semua Kelas'}
                        </span>
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-600">
                          {session.durationMinutes || session.duration_minutes || 60} Menit
                        </span>
                      </div>
                      <h4 className="font-bold text-zinc-900 text-sm tracking-tight">
                        {session.subjectName || session.subject_name || 'Mata Pelajaran'}
                      </h4>
                      <div className="text-xs text-zinc-500 line-clamp-1">
                        {session.title || 'Sesi Ujian'}
                      </div>
                    </div>

                    <div className="sm:text-right shrink-0 flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-100">
                      {/* Tanggal dan Jam Mulai hingga Berakhir */}
                      <div className="text-xs font-semibold text-zinc-700 font-mono flex items-center sm:justify-end gap-1.5 tabular-nums">
                        <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span>{scheduleRange}</span>
                      </div>

                      {/* Status Sesi Dinamis */}
                      <div className="mt-1">
                        {scheduleStatus.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Sesi Dibuka</span>
                          </span>
                        )}
                        {scheduleStatus.status === 'UPCOMING' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200/80 shadow-2xs">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Belum Dibuka</span>
                          </span>
                        )}
                        {scheduleStatus.status === 'CLOSED' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
                            <Lock className="w-3 h-3 text-rose-600" />
                            <span>Sudah Ditutup</span>
                          </span>
                        )}
                        {scheduleStatus.status === 'UNKNOWN' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                            <span>Belum Terjadwal</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsScheduleModalOpen(false)}
              className="px-3.5 py-1.5 bg-white border border-zinc-200/90 hover:bg-zinc-50 text-zinc-700 rounded-lg text-xs font-semibold transition"
            >
              Tutup Jadwal
            </button>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* 5. MODAL TATA TERTIB & ZERO-TOLERANCE SECURITY */}
      {/* ======================================================== */}
      <Modal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        title="Tata Tertib & Protokol Integritas Ujian"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs text-zinc-700">
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 font-medium">
            Setiap peserta ujian diawasi secara otomatis oleh sensor sistem integritas real-time. Pelanggaran akan mencatat jam, detik, dan mengunci layar ujian Anda!
          </div>

          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <Ban className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                <strong>Dilarang Membuka Tab Baru / Minimalkan Browser:</strong> Segala upaya berpindah ke tab Google, pencarian materi, atau AI akan langsung membekukan layar Anda.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <Ban className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                <strong>Dilarang Keluar dari Mode Fullscreen:</strong> Menekan tombol ESC atau keluar layar penuh memicu status pelanggaran dan alarm di ruang pengawas.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <Ban className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>
                <strong>Dilarang Mengambil Screenshot / Rekam Layar:</strong> Tombol pintas PrintScreen, copy teks, dan klik kanan telah dinonaktifkan sistem.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Prosedur Keluar:</strong> Setelah selesai mengirim jawaban, masukkan <strong>Password Keluar</strong> dari pengawas untuk menutup sesi secara resmi.
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsRulesModalOpen(false)}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition"
            >
              Saya Mengerti & Siap Ujian
            </button>
          </div>
        </div>
      </Modal>

      {/* Pop Up Cek Kelengkapan Biodata / Kata Sandi Bawaan Siswa */}
      {showWelcomeModal && currentUser && (
        <WelcomeProfileModal
          user={currentUser}
          onClose={() => setShowWelcomeModal(false)}
        />
      )}
    </div>
  );
}
