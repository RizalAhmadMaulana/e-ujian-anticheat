import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import { loginApi } from '../../api/authApi';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  GraduationCap, 
  BookOpen, 
  Sparkles,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setCurrentUser, loginAsTeacher, loginAsStudent } = useExamStore();

  const [activeRole, setActiveRole] = useState('TEACHER'); // 'TEACHER' | 'STUDENT'
  const [username, setUsername] = useState('guru');
  const [password, setPassword] = useState('guru123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleRoleChange = (role) => {
    setActiveRole(role);
    setErrorMessage('');
    if (role === 'TEACHER') {
      setUsername('guru');
      setPassword('guru123');
    } else {
      setUsername('siswa');
      setPassword('siswa123');
    }
  };

  const handleManualLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      // 1. Coba login ke REST API Django
      const res = await loginApi(username.trim(), password.trim());
      if (res && res.user) {
        setCurrentUser({
          id: res.user.id,
          username: res.user.username,
          fullName: res.user.full_name,
          role: res.user.role,
          classroom: res.user.classroom_name,
          schoolName: 'SMK Negeri 1 Informatika',
        });

        if (res.user.role === 'TEACHER') {
          navigate('/teacher/dashboard');
        } else {
          navigate('/student/gatekeeper');
        }
        return;
      }
    } catch (err) {
      console.warn('Backend login fallback ke mode offline/mock:', err?.response?.data || err.message);
      // Jika kredensial salah secara eksplisit dari backend, tampilkan error
      if (err.response && err.response.status === 401) {
        setErrorMessage('Username atau kata sandi tidak cocok dengan akun database.');
        setIsLoading(false);
        return;
      }
      
      // Jika backend tidak aktif / offline, gunakan fallback mock
      if (activeRole === 'TEACHER') {
        loginAsTeacher();
        navigate('/teacher/dashboard');
      } else {
        loginAsStudent();
        navigate('/student/gatekeeper');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickTeacherLogin = async () => {
    setIsLoading(true);
    try {
      const res = await loginApi('guru', 'guru123');
      if (res && res.user) {
        setCurrentUser({
          id: res.user.id,
          username: res.user.username,
          fullName: res.user.full_name,
          role: res.user.role,
          schoolName: 'SMK Negeri 1 Informatika',
        });
      }
    } catch {
      loginAsTeacher();
    } finally {
      setIsLoading(false);
      navigate('/teacher/dashboard');
    }
  };

  const handleQuickStudentLogin = async () => {
    setIsLoading(true);
    try {
      const res = await loginApi('siswa', 'siswa123');
      if (res && res.user) {
        setCurrentUser({
          id: res.user.id,
          username: res.user.username,
          fullName: res.user.full_name,
          role: res.user.role,
          classroom: res.user.classroom_name,
          schoolName: 'SMK Negeri 1 Informatika',
        });
      }
    } catch {
      loginAsStudent();
    } finally {
      setIsLoading(false);
      navigate('/student/gatekeeper');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glow Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 px-4">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl mb-4 shadow-lg shadow-indigo-500/10">
          <ShieldCheck className="w-10 h-10 text-indigo-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          E-Ujian & E-Jurnal
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Portal Asesmen Sekolah Anti-Cheat Terintegrasi Berita Acara Otomatis
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl z-10 px-4">
        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700/60 py-8 px-6 sm:px-10 shadow-2xl rounded-2xl">
          {/* Form Role Toggle */}
          <div className="flex rounded-xl bg-slate-900/70 p-1 mb-6 border border-slate-700/60">
            <button
              type="button"
              onClick={() => handleRoleChange('TEACHER')}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
                activeRole === 'TEACHER'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Masuk sebagai Guru
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('STUDENT')}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition ${
                activeRole === 'STUDENT'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Masuk sebagai Siswa
            </button>
          </div>

          {/* Login Form */}
          <form onSubmit={handleManualLogin} className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-2 text-red-200 text-xs">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {activeRole === 'TEACHER' ? 'Nomor Induk Pegawai (NIP) / Email' : 'Nomor Induk Siswa Nasional (NISN)'}
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={activeRole === 'TEACHER' ? 'Masukkan NIP Anda' : 'Masukkan NISN Anda'}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-900/80 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="text-[11px] text-center text-slate-400 mt-2">
              {activeRole === 'TEACHER' ? (
                <span>Akun Guru: <code className="text-indigo-300 font-mono font-bold">guru</code> / <code className="text-indigo-300 font-mono font-bold">guru123</code></span>
              ) : (
                <span>Akun Siswa: <code className="text-indigo-300 font-mono font-bold">siswa</code> / <code className="text-indigo-300 font-mono font-bold">siswa123</code></span>
              )}
            </div>
          </form>

          {/* Zero-Tolerance Security Footnote */}
          <div className="mt-6 pt-5 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Zero-Tolerance Lockdown Aktif
            </span>
            <span>Versi Web 2.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}

