import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import Modal from '../../components/common/Modal';
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
  Layers
} from 'lucide-react';

export default function StudentLobby() {
  const navigate = useNavigate();
  const { currentUser, setScreenOrientation, logout, examSessions } = useExamStore();

  // Modals State
  const [isOrientationModalOpen, setIsOrientationModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  // Digital Clock Real-Time State
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between select-none">
      {/* ======================================================== */}
      {/* 1. TOP HEADER BAR */}
      {/* ======================================================== */}
      <header className="bg-slate-900/90 border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
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
      {/* 2. MAIN CONTENT AREA (BERANDA EXAMBROWSER) */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center space-y-6">
        {/* Banner Ucapan & Jam Real-Time Mobile */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-indigo-400 font-bold mb-1 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{greeting}, {currentUser?.fullName?.split(' ')[0] || 'Siswa'}!</span>
            <span className="sm:hidden">• {timeString} WIB</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Pusat Aktivitas Asesmen Digital Siswa
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            Pilih menu di bawah ini untuk memulai asesmen terkunci, melihat jadwal ujian kelas, atau membaca tata tertib.
          </p>
        </div>

        {/* ======================================================== */}
        {/* GRID MENU UTAMA BERGAYA EXAMBROWSER */}
        {/* ======================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* KARTU 1: E-UJIAN (MENU UTAMA) */}
          <div
            onClick={() => setIsOrientationModalOpen(true)}
            className="cursor-pointer group relative bg-gradient-to-br from-indigo-950/90 via-slate-900/90 to-slate-900/90 border-2 border-indigo-500/60 hover:border-indigo-400 rounded-3xl p-6 transition-all duration-300 shadow-2xl hover:shadow-indigo-500/20 transform hover:-translate-y-1.5 flex flex-col justify-between overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300 group-hover:scale-110 transition-transform shadow-lg shadow-indigo-600/30">
                  <FileText className="w-7 h-7" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500 text-white shadow-sm">
                  Menu Utama
                </span>
              </div>
              <h3 className="text-xl font-black text-white group-hover:text-indigo-200 transition">
                E-UJIAN
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Masuk ke ruang pengerjaan asesmen mandiri atau formulir Google Form dalam proteksi layar penuh terkunci (*Zero-Tolerance Lockdown*).
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-indigo-500/20 flex items-center justify-between text-xs font-bold text-indigo-400 group-hover:text-indigo-300">
              <span>Buka Ruang Ujian</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* KARTU 2: JADWAL UJIAN */}
          <div
            onClick={() => setIsScheduleModalOpen(true)}
            className="cursor-pointer group bg-slate-900/80 border border-slate-800 hover:border-slate-600 rounded-3xl p-6 transition-all duration-300 shadow-xl hover:shadow-slate-800/30 transform hover:-translate-y-1 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:scale-110 transition-transform">
                  <Calendar className="w-7 h-7" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                  Kelas {currentUser?.classroom}
                </span>
              </div>
              <h3 className="text-xl font-black text-white group-hover:text-slate-200 transition">
                JADWAL UJIAN
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Lihat daftar jadwal sesi ujian aktif hari ini, mata pelajaran, serta durasi waktu pengerjaan asesmen.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-white">
              <span>Lihat Jadwal Lengkap</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* KARTU 3: INFORMASI TATA TERTIB */}
          <div
            onClick={() => setIsRulesModalOpen(true)}
            className="cursor-pointer group bg-slate-900/80 border border-slate-800 hover:border-slate-600 rounded-3xl p-6 transition-all duration-300 shadow-xl hover:shadow-slate-800/30 transform hover:-translate-y-1 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                  <Info className="w-7 h-7" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Wajib Dibaca
                </span>
              </div>
              <h3 className="text-xl font-black text-white group-hover:text-slate-200 transition">
                TATA TERTIB UJIAN
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Ketahui protokol anti-curang, larangan membuka tab baru, perpindahan aplikasi, screenshot, dan pembekuan layar.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-white">
              <span>Baca Ketentuan & Aturan</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="py-4 text-center text-slate-500 text-xs border-t border-slate-900">
        SMK Negeri 1 Informatika • Portal Ujian Anti-Cheat Berbasis Web & ExamBrowser
      </footer>

      {/* ======================================================== */}
      {/* 3. MODAL PILIH ORIENTASI LAYAR (PORTRAIT / LANDSCAPE) */}
      {/* ======================================================== */}
      <Modal
        isOpen={isOrientationModalOpen}
        onClose={() => setIsOrientationModalOpen(false)}
        title="PILIH ORIENTASI LAYAR UJIAN"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 leading-relaxed">
            Pilihlah mode orientasi perangkat yang paling nyaman untuk mengerjakan soal. Tampilan lembar ujian akan menyesuaikan secara presisi:
          </p>

          <div className="grid grid-cols-2 gap-3.5">
            {/* Opsi Portrait */}
            <button
              onClick={() => handleSelectOrientation('PORTRAIT')}
              className="p-5 rounded-2xl border-2 border-indigo-200 hover:border-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/60 flex flex-col items-center text-center transition group shadow-sm"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-700 mb-3 group-hover:scale-110 transition-transform">
                <Smartphone className="w-8 h-8" />
              </div>
              <span className="font-extrabold text-slate-900 text-sm">PORTRAIT</span>
              <span className="text-[11px] text-slate-500 mt-0.5">Mode Tegak (Layar Smartphone)</span>
              <span className="mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-800">
                Rekomendasi HP
              </span>
            </button>

            {/* Opsi Landscape */}
            <button
              onClick={() => handleSelectOrientation('LANDSCAPE')}
              className="p-5 rounded-2xl border-2 border-indigo-200 hover:border-indigo-600 bg-indigo-50/50 hover:bg-indigo-100/60 flex flex-col items-center text-center transition group shadow-sm"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-700 mb-3 group-hover:scale-110 transition-transform">
                <Monitor className="w-8 h-8" />
              </div>
              <span className="font-extrabold text-slate-900 text-sm">LANDSCAPE</span>
              <span className="text-[11px] text-slate-500 mt-0.5">Mode Mendatar (Tablet / PC)</span>
              <span className="mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-800">
                Rekomendasi PC / Tablet
              </span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
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
          <p className="text-xs text-slate-600">
            Daftar sesi ujian yang dijadwalkan untuk kelas <strong>{currentUser?.classroom}</strong>:
          </p>

          <div className="space-y-2.5 max-h-80 overflow-y-auto">
            {examSessions.map((session) => (
              <div
                key={session.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
              >
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                    {session.classroom}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm mt-1">{session.subjectName}</h4>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {session.title} • {session.durationMinutes} Menit
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-indigo-600">{session.startTime} - {session.endTime} WIB</div>
                  <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">Sesi Siap Dibuka</div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsScheduleModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition"
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
        title="TATA TERTIB & PROTOKOL ANTI-NYONTEK"
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs text-slate-700">
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 font-medium">
            Setiap peserta ujian diawasi secara otomatis oleh sensor sistem integritas real-time. Pelanggaran akan mencatat jam, detik, dan mengunci layar ujian Anda!
          </div>

          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <Ban className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>
                <strong>Dilarang Membuka Tab Baru / Minimalkan Browser:</strong> Segala upaya berpindah ke tab Google, pencarian materi, atau AI akan langsung membekukan layar Anda.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <Ban className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>
                <strong>Dilarang Keluar dari Mode Fullscreen:</strong> Menekan tombol ESC atau keluar layar penuh memicu status pelanggaran dan alarm di ruang pengawas.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <Ban className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
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
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
            >
              Saya Mengerti & Siap Ujian
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
