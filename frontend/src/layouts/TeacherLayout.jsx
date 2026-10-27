import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useExamStore } from '../store/useExamStore';
import { 
  LayoutDashboard, 
  School,
  Users,
  FolderKanban, 
  CalendarClock, 
  Radio, 
  FileSpreadsheet, 
  Building2,
  LogOut, 
  Menu, 
  X, 
  ShieldCheck, 
  UserCheck,
  ShieldAlert,
  Bell
} from 'lucide-react';

export default function TeacherLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { currentUser, logout, proctoringStudents, schoolSettings, fetchSchoolSettings } = useExamStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSchoolSettings?.();
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
      <div className="md:hidden bg-slate-900 text-white flex items-center justify-between px-4 py-3 border-b border-slate-800 sticky top-0 z-40 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight">E-Ujian & E-Jurnal</div>
            <div className="text-[10px] text-slate-400">Guru Pengawas</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {lockedStudentsCount > 0 && (
            <button
              onClick={() => navigate('/teacher/proctoring')}
              className="px-2 py-1 rounded bg-red-600 text-white text-[11px] font-bold flex items-center gap-1 animate-pulse"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{lockedStudentsCount}</span>
            </button>
          )}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SIDEBAR NAVIGATION (Desktop & Mobile Drawer) */}
      {/* ======================================================== */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand / Logo */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 border border-indigo-400/50 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="font-black text-white text-base tracking-tight">E-UJIAN PRO</div>
              <div className="text-[10px] text-indigo-400 font-bold tracking-wider uppercase">Portal Guru & E-Jurnal</div>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
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
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition duration-150 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                      : 'hover:bg-slate-800 hover:text-white text-slate-400'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    item.isAlert
                      ? 'bg-red-500 text-white border border-red-400 animate-pulse-fast shadow-sm shadow-red-500/50'
                      : 'bg-indigo-500/20 text-indigo-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile Card */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-white truncate">
                  {currentUser?.fullName || 'Drs. Budi Santoso'}
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  NIP: {currentUser?.username || '198507122010011002'}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Keluar dari Akun"
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700/60 rounded-lg transition shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Backdrop for Mobile */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden"
        />
      )}

      {/* ======================================================== */}
      {/* MAIN CONTENT AREA WITH DESKTOP TOP BAR */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {/* Desktop Header */}
        <header className="hidden md:flex bg-white border-b border-slate-200/80 px-8 py-4 items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {schoolSettings?.name || 'MIS RISALAH'}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Zero-Tolerance Lockdown Aktif
            </span>
          </div>

          <div className="flex items-center gap-4">
            {lockedStudentsCount > 0 ? (
              <button
                onClick={() => navigate('/teacher/proctoring')}
                className="px-3.5 py-1.5 rounded-lg bg-red-100 border border-red-300 text-red-700 text-xs font-bold flex items-center gap-2 hover:bg-red-200 transition animate-pulse"
              >
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <span>{lockedStudentsCount} Siswa Perlu Di-Unlock!</span>
              </button>
            ) : (
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Semua Siswa Kondusif
              </span>
            )}

            <div className="h-6 w-px bg-slate-200" />

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-800">
                  {currentUser?.fullName || 'Drs. Budi Santoso, M.Kom'}
                </div>
                <div className="text-[11px] text-slate-500">Guru Pengawas Ujian</div>
              </div>
              <button
                onClick={handleLogout}
                title="Keluar"
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
