import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useExamStore } from '../store/useExamStore';
import { fetchCurrentUserApi } from '../api/authApi';
import { 
  LayoutDashboard, 
  School,
  Users,
  FolderKanban, 
  CalendarClock, 
  Radio, 
  FileSpreadsheet, 
  Building2, 
  Settings,
  LogOut, 
  Menu, 
  X, 
  ShieldCheck, 
  UserCheck, 
  GraduationCap, 
  ShieldAlert, 
  Bell,
  FileCheck 
} from 'lucide-react';
import WelcomeProfileModal from '../components/modals/WelcomeProfileModal';

export default function TeacherLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const { currentUser, logout, proctoringStudents, schoolSettings, fetchSchoolSettings } = useExamStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSchoolSettings?.();
    fetchCurrentUserApi?.().then((user) => {
      if (user) {
        useExamStore.getState().setCurrentUser(user);

        const isDismissed = sessionStorage.getItem('dismiss_profile_welcome_modal') === 'true';
        if (!isDismissed && user.needs_profile_completion) {
          setShowWelcomeModal(true);
        }
      }
    }).catch(() => {});
  }, [fetchSchoolSettings]);

  // Hitung jumlah siswa yang sedang terkunci akibat pelanggaran
  const lockedStudentsCount = proctoringStudents.filter(
    (s) => s.status === 'LOCKED_VIOLATION'
  ).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { 
      to: '/teacher/dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard 
    },
    { 
      to: '/teacher/classrooms', 
      label: 'Data Kelas / Rombel', 
      icon: School 
    },
    { 
      to: '/teacher/teachers', 
      label: 'Data Guru', 
      icon: UserCheck 
    },
    { 
      to: '/teacher/students', 
      label: 'Data Siswa', 
      icon: GraduationCap 
    },
    { 
      to: '/teacher/users', 
      label: 'Manajemen Pengguna', 
      icon: Users 
    },
    { 
      to: '/teacher/packages', 
      label: 'Bank Soal & Paket Ujian', 
      icon: FolderKanban 
    },
    { 
      to: '/teacher/sessions', 
      label: 'Jadwal & Sesi Ujian', 
      icon: CalendarClock 
    },
    { 
      to: '/teacher/proctoring', 
      label: 'Live Proctoring', 
      icon: Radio, 
      badge: lockedStudentsCount > 0 ? `${lockedStudentsCount} Terkunci` : null,
      isAlert: lockedStudentsCount > 0 
    },
    { 
      to: '/teacher/grading', 
      label: 'Koreksi Esai', 
      icon: FileCheck 
    },
    { 
      to: '/teacher/violations', 
      label: 'Riwayat Pelanggaran', 
      icon: ShieldAlert 
    },
    { 
      to: '/teacher/ejournal', 
      label: 'E-Jurnal Ujian', 
      icon: FileSpreadsheet 
    },
    { 
      to: '/teacher/settings', 
      label: 'Pengaturan Sekolah', 
      icon: Building2 
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row">
      {/* ======================================================== */}
      {/* MOBILE HEADER BAR */}
      {/* ======================================================== */}
      <div className="md:hidden bg-[#090D16] text-zinc-100 flex items-center justify-between px-4 py-3 border-b border-zinc-800 sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-zinc-100">E-Ujian & E-Jurnal</div>
            <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Guru Pengawas</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lockedStudentsCount > 0 && (
            <button
              onClick={() => navigate('/teacher/proctoring')}
              className="px-2 py-1 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] font-medium flex items-center gap-1 animate-pulse"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{lockedStudentsCount}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/teacher/profile')}
            title="Pengaturan Profil Akun"
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SIDEBAR NAVIGATION (Desktop & Mobile Drawer) */}
      {/* ======================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-[#090D16] text-zinc-300 flex flex-col border-r border-zinc-800/80 transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-200 shadow-xs">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="font-bold text-zinc-100 text-sm tracking-tight">E-UJIAN PRO</div>
              <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Portal Pengawas</div>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-zinc-400 hover:text-zinc-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto">
          <div className="px-2.5 py-1 text-[10px] font-mono font-medium uppercase tracking-wider text-zinc-500">
            Menu Utama
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-zinc-800/90 text-white font-semibold border border-zinc-700/60 shadow-xs'
                      : 'hover:bg-zinc-900 hover:text-zinc-200 text-zinc-400'
                  }`
                }
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0 text-zinc-400" />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                    item.isAlert
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 animate-pulse'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile Card */}
        <div className="p-2.5 border-t border-zinc-800/80 bg-zinc-950/40">
          <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/60 border border-zinc-800">
            <div 
              onClick={() => {
                setIsMobileMenuOpen(false);
                navigate('/teacher/profile');
              }}
              className="flex items-center gap-2 overflow-hidden cursor-pointer hover:opacity-85 transition"
              title="Buka Pengaturan Profil"
            >
              <div className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 font-semibold text-xs shrink-0">
                {currentUser?.fullName?.charAt(0) || currentUser?.username?.charAt(0) || 'G'}
              </div>
              <div className="overflow-hidden min-w-0">
                <div className="text-xs font-semibold text-zinc-100 truncate">
                  {currentUser?.fullName || currentUser?.full_name || currentUser?.username || 'Guru Pengawas'}
                </div>
                <div className="text-[10px] font-mono text-zinc-400 truncate">
                  {currentUser?.nip || currentUser?.username || '-'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  navigate('/teacher/profile');
                }}
                title="Pengaturan Profil Akun"
                className="p-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleLogout}
                title="Keluar dari Akun"
                className="p-1 text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 rounded transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop for Mobile */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* ======================================================== */}
      {/* MAIN CONTENT AREA WITH DESKTOP TOP BAR */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-zinc-50">
        {/* Desktop Header */}
        <header className="hidden md:flex bg-white border-b border-zinc-200/80 px-6 py-3 items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200/80">
              {schoolSettings?.name || 'MIS RISALAH'}
            </span>
            <span className="text-zinc-300">•</span>
            <span className="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Zero-Tolerance Lockdown Aktif
            </span>
          </div>

          <div className="flex items-center gap-3">
            {lockedStudentsCount > 0 && (
              <button
                onClick={() => navigate('/teacher/proctoring')}
                className="px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-rose-100 transition animate-pulse"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>{lockedStudentsCount} Siswa Terkunci</span>
              </button>
            )}

            <div className="flex items-center gap-2.5 pl-3 border-l border-zinc-200">
              <button
                type="button"
                onClick={() => navigate('/teacher/profile')}
                title="Pengaturan Profil & Akun"
                className="p-1.5 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-md border border-zinc-200 transition group"
              >
                <Settings className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform duration-200" />
              </button>

              <div 
                onClick={() => navigate('/teacher/profile')}
                className="text-right cursor-pointer hover:opacity-85 transition"
                title="Buka Pengaturan Profil Akun"
              >
                <div className="text-xs font-semibold text-zinc-800 leading-tight">
                  {currentUser?.fullName || currentUser?.full_name || currentUser?.username || 'Guru Pengawas'}
                </div>
                <div className="text-[10px] text-zinc-400 font-mono">Guru Pengawas Ujian</div>
              </div>

              <button
                onClick={handleLogout}
                title="Keluar"
                className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 rounded-md transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      {/* Pop Up Lengkapi Profil / Ganti Kata Sandi Bawaan Pertama Kali Login */}
      {showWelcomeModal && currentUser && (
        <WelcomeProfileModal
          user={currentUser}
          onClose={() => setShowWelcomeModal(false)}
        />
      )}
    </div>
  );
}
