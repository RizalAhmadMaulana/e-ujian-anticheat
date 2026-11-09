import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import { loginApi } from '../../api/authApi';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setCurrentUser, schoolSettings, fetchSchoolSettings } = useExamStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchSchoolSettings?.();
  }, [fetchSchoolSettings]);

  const handleManualLogin = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Silakan masukkan NIP/NISN dan kata sandi Anda.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // 1. Login ke REST API Django
      const res = await loginApi(username.trim(), password.trim());
      if (res && res.user) {
        setCurrentUser({
          id: res.user.id,
          username: res.user.username,
          fullName: res.user.full_name,
          role: res.user.role,
          classroom: res.user.classroom_name,
          schoolName: schoolSettings?.name || 'MIS RISALAH',
        });

        // Redirect otomatis berdasarkan role akun yang login
        if (res.user.role === 'TEACHER') {
          navigate('/teacher/dashboard');
        } else {
          navigate('/student/lobby');
        }
        return;
      }
    } catch (err) {
      console.warn('Login error:', err?.response?.data || err.message);
      if (err.response && (err.response.status === 401 || err.response.status === 400)) {
        setErrorMessage('NIP/NISN atau kata sandi tidak cocok. Silakan periksa kembali.');
      } else if (err.message === 'Network Error') {
        setErrorMessage('Koneksi ke server gagal. Pastikan server backend aktif.');
      } else {
        setErrorMessage('Terjadi kesalahan saat masuk. Silakan coba kembali.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative selection:bg-blue-600/30">
      {/* Subtle Architectural Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-200 mb-4 shadow-sm">
          <ShieldCheck className="w-5 h-5 text-blue-400" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
          E-Ujian & E-Jurnal
        </h1>
        <p className="mt-1.5 text-xs text-zinc-400 font-medium">
          Portal Asesmen Sekolah Anti-Cheat & Rekapitulasi Berita Acara
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-zinc-900/70 backdrop-blur-md border border-zinc-800/90 py-7 px-6 sm:px-8 shadow-xl rounded-xl">
          <div className="mb-6">
            <h2 className="text-base font-semibold text-zinc-100 tracking-tight">Masuk ke Sistem</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Gunakan NIP untuk Guru Pengawas atau NISN untuk Siswa
            </p>
          </div>

          {/* Login Form (Bebas Dialog Simpan Password Browser & Rekomendasi Isian) */}
          <div className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2 text-rose-300 text-xs font-medium">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Nomor Induk (NIP / NISN)
              </label>
              <div className="relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  readOnly
                  onFocus={(e) => e.target.removeAttribute('readonly')}
                  autoComplete="one-time-code"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  role="presentation"
                  data-lpignore="true"
                  data-form-type="other"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualLogin(e)}
                  placeholder="Masukkan NIP Guru atau NISN Siswa"
                  className="block w-full pl-9 pr-3 py-2 bg-zinc-950/80 border border-zinc-800 rounded-lg text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative rounded-lg">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  readOnly
                  onFocus={(e) => e.target.removeAttribute('readonly')}
                  autoComplete="one-time-code"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  role="presentation"
                  data-lpignore="true"
                  data-form-type="other"
                  style={{
                    WebkitTextSecurity: showPassword ? 'none' : 'disc',
                    textSecurity: showPassword ? 'none' : 'disc'
                  }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualLogin(e)}
                  placeholder="Masukkan kata sandi (Default: NIP / NISN)"
                  className="block w-full pl-9 pr-10 py-2 bg-zinc-950/80 border border-zinc-800 rounded-lg text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-zinc-300 transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={handleManualLogin}
              disabled={isLoading}
              className="w-full mt-2 h-10 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs sm:text-sm font-semibold tracking-tight transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-zinc-950/20 border-t-zinc-950 rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk ke Sistem</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {/* Zero-Tolerance Security Footnote */}
          <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Zero-Tolerance Lockdown Aktif
            </span>
            <span className="font-mono text-zinc-500">v2.1</span>
          </div>
        </div>
      </div>
    </div>
  );
}

