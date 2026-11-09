import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  GraduationCap, 
  KeyRound, 
  Mail, 
  ShieldCheck, 
  ShieldAlert, 
  Save, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  RefreshCw,
  Lock,
  BadgeCheck,
  Clock,
  LogOut,
  Info,
  UserCheck
} from 'lucide-react';
import { useExamStore } from '../../store/useExamStore';
import { fetchCurrentUserApi, updateCurrentUserProfileApi } from '../../api/authApi';

export default function StudentProfileSettings() {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser, logout } = useExamStore();

  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    nisn: '',
    classroom: '',
    current_password: '',
    password: '',
    confirm_password: '',
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  const [profileMeta, setProfileMeta] = useState({
    is_profile_complete: false,
    is_password_default: false,
    needs_profile_completion: false,
  });

  // Jam Digital
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = currentTime.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const studentClassName = formData.classroom || (typeof currentUser?.classroom === 'object' && currentUser?.classroom !== null ? currentUser.classroom.name : currentUser?.classroom) || '-';

  // Muat data profil terbaru dari backend API
  const loadProfile = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchCurrentUserApi();
      if (data) {
        const cName = data.classroom_name || (typeof data.classroom === 'object' ? data.classroom?.name : data.classroom) || currentUser?.classroom || '-';
        setFormData((prev) => ({
          ...prev,
          username: data.username || '',
          full_name: data.full_name || data.fullName || '',
          email: data.email || '',
          nisn: data.nisn || data.username || '',
          classroom: cName,
          current_password: '',
          password: '',
          confirm_password: '',
        }));
        setProfileMeta({
          is_profile_complete: !!data.is_profile_complete,
          is_password_default: !!data.is_password_default,
          needs_profile_completion: !!data.needs_profile_completion,
        });
      }
    } catch (err) {
      console.error('Gagal memuat profil siswa:', err);
      if (currentUser) {
        setFormData((prev) => ({
          ...prev,
          username: currentUser.username || '',
          full_name: currentUser.full_name || currentUser.fullName || '',
          email: currentUser.email || '',
          nisn: currentUser.nisn || currentUser.username || '',
          classroom: currentUser.classroom || '-',
        }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.full_name.trim()) {
      setErrorMessage('Nama lengkap tidak boleh kosong!');
      return;
    }

    if (!formData.username.trim()) {
      setErrorMessage('NISN / Username tidak boleh kosong!');
      return;
    }

    // Jika mengisi perubahan kata sandi
    if (formData.password.trim() || formData.confirm_password.trim() || formData.current_password.trim()) {
      if (!formData.current_password.trim()) {
        setErrorMessage('Silakan masukkan kata sandi Anda saat ini (lama) untuk verifikasi!');
        return;
      }
      if (!formData.password.trim()) {
        setErrorMessage('Kata sandi baru tidak boleh kosong!');
        return;
      }
      if (formData.password.length < 6) {
        setErrorMessage('Kata sandi baru minimal 6 karakter!');
        return;
      }
      if (formData.password !== formData.confirm_password) {
        setErrorMessage('Konfirmasi kata sandi baru tidak cocok dengan kata sandi baru!');
        return;
      }
    }

    setIsSaving(true);
    try {
      const payload = {
        full_name: formData.full_name.trim(),
        username: formData.username.trim(),
        nisn: formData.username.trim(),
        email: formData.email.trim(),
      };

      if (formData.password.trim()) {
        payload.current_password = formData.current_password.trim();
        payload.password = formData.password.trim();
      }

      const res = await updateCurrentUserProfileApi(payload);
      if (res) {
        const cName = res.classroom_name || formData.classroom || currentUser?.classroom;
        const normalized = {
          ...res,
          fullName: res.full_name || res.username,
          full_name: res.full_name || res.username,
          classroom: cName,
        };
        setCurrentUser(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));

        setProfileMeta({
          is_profile_complete: !!res.is_profile_complete,
          is_password_default: !!res.is_password_default,
          needs_profile_completion: !!res.needs_profile_completion,
        });

        // Kosongkan field kata sandi
        setFormData((prev) => ({
          ...prev,
          current_password: '',
          password: '',
          confirm_password: '',
        }));

        setSuccessMessage('Profil berhasil diperbarui dan otomatis disinkronkan ke seluruh sistem!');
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err) {
      console.error('Gagal memperbarui profil siswa:', err);
      const dataErrors = err.response?.data;
      if (dataErrors) {
        if (typeof dataErrors === 'object') {
          const firstKey = Object.keys(dataErrors)[0];
          const firstVal = dataErrors[firstKey];
          const msg = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
          setErrorMessage(`${firstKey}: ${msg}`);
        } else {
          setErrorMessage(String(dataErrors));
        }
      } else {
        setErrorMessage('Terjadi kesalahan saat menyimpan profil. Silakan coba kembali.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-zinc-100 flex flex-col justify-between selection:bg-zinc-800 relative">
      {/* Subtle Architectural Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* ======================================================== */}
      {/* 1. TOP HEADER BAR (EXAMBROWSER NAVBAR) */}
      {/* ======================================================== */}
      <header className="bg-zinc-900/80 border-b border-zinc-800/80 px-4 sm:px-8 py-3 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-xs sm:text-sm text-zinc-100 tracking-tight flex items-center gap-2">
              <span>ExamBrowser Portal</span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hidden sm:inline-block">
                Terkunci Aman
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 truncate max-w-[200px] sm:max-w-md">
              {currentUser?.fullName} • {studentClassName} (NISN: {currentUser?.username})
            </div>
          </div>
        </div>

        {/* Live Digital Clock & Logout Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-950/60 border border-zinc-800 font-mono text-xs font-semibold text-zinc-400 tabular-nums">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>{timeString} WIB</span>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-rose-950/40 hover:text-rose-400 border border-zinc-800 text-xs font-medium text-zinc-400 hover:border-rose-900/50 transition-all duration-150"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 2. MAIN CONTENT AREA */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 z-10">
        {/* Navigation Back Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/student/lobby')}
            className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-all px-3 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700 active:scale-[0.98]"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
            <span>Kembali ke Beranda Asesmen</span>
          </button>

          {/* Security Badge Status */}
          <div className="flex items-center gap-2">
            {profileMeta.needs_profile_completion ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-medium">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>Perlu Dilengkapi</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Profil Aman</span>
              </div>
            )}
            <button
              type="button"
              onClick={loadProfile}
              disabled={isLoading}
              title="Muat ulang data"
              className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Title Header Card */}
        <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-zinc-800/90 border border-zinc-700/80 text-zinc-200 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-zinc-300" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-zinc-100 tracking-tight">
                Pengaturan Profil Siswa
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5 font-medium">
                Kelola nama lengkap, email, NISN, dan kata sandi akun asesmen Anda.
              </p>
            </div>
          </div>
        </div>

        {/* Alert Notifikasi */}
        {successMessage && (
          <div className="flex items-center gap-3 p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-3 p-3.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-medium">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Warning Box jika kata sandi masih bawaan atau email belum diatur */}
        {profileMeta.needs_profile_completion && (
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-xs text-amber-300">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Pemberitahuan Keamanan Akun Siswa:</span>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed font-normal">
              {profileMeta.is_password_default && '• Akun Anda masih menggunakan kata sandi bawaan (NISN). Mohon ganti kata sandi di bawah ini agar akun Anda tidak dapat diakses orang lain.\n'}
              {!profileMeta.is_profile_complete && '• Lengkapi nama lengkap dan email aktif Anda untuk identitas pengerjaan asesmen.'}
            </p>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Card 1: Informasi Biodata Peserta */}
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-zinc-800 border border-zinc-700/80 text-zinc-300">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">Biodata Peserta Asesmen</h2>
                  <p className="text-[11px] text-zinc-400">Terhubung langsung dengan Manajemen Pengguna dan Data Siswa Sekolah.</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700">
                Kelas: {studentClassName}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nama Lengkap */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Nama Lengkap Siswa <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Contoh: Rizal Ahmad Maulana"
                  required
                  className="w-full px-3.5 py-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-100 text-xs sm:text-sm focus:border-zinc-500 focus:outline-none transition"
                />
                <p className="text-[11px] text-zinc-400 mt-1">Nama ini dicantumkan pada Berita Acara dan Rekap Nilai E-Jurnal.</p>
              </div>

              {/* NISN / Username */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  NISN / Nomor Induk <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Contoh: 0081234567"
                  required
                  className="w-full px-3.5 py-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-100 text-xs sm:text-sm font-mono focus:border-zinc-500 focus:outline-none transition"
                />
                <p className="text-[11px] text-zinc-400 mt-1">Digunakan untuk login ke Portal Ujian.</p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Alamat Email Aktif <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Contoh: siswa@gmail.com"
                    className="w-full pl-9 pr-3.5 py-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-100 text-xs sm:text-sm focus:border-zinc-500 focus:outline-none transition"
                  />
                  <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">Digunakan untuk pemulihan akun jika lupa sandi.</p>
              </div>
            </div>
          </div>

          {/* Card 2: Keamanan & Ganti Kata Sandi */}
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800/80">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-md bg-zinc-800 border border-zinc-700/80 text-zinc-300">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">Ganti Kata Sandi Akun Siswa (Opsional)</h2>
                  <p className="text-[11px] text-zinc-400">Kosongkan bagian ini jika Anda tidak ingin mengubah kata sandi.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Kata Sandi Lama */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Kata Sandi Lama
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    name="current_password"
                    value={formData.current_password}
                    onChange={handleChange}
                    placeholder="Kata sandi saat ini"
                    className="w-full pr-9 pl-3.5 py-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-100 text-xs sm:text-sm focus:border-zinc-500 focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition"
                  >
                    {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">Sandi saat ini (default: NISN).</p>
              </div>

              {/* Kata Sandi Baru */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimal 6 karakter"
                    className="w-full pr-9 pl-3.5 py-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-100 text-xs sm:text-sm focus:border-zinc-500 focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">Gunakan sandi yang mudah diingat.</p>
              </div>

              {/* Konfirmasi Kata Sandi Baru */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Ulangi Sandi Baru
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full pr-9 pl-3.5 py-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-zinc-100 text-xs sm:text-sm focus:border-zinc-500 focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">Harus sama dengan sandi baru.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Info className="w-3.5 h-3.5 text-zinc-400" />
              <span>Perubahan data otomatis disinkronkan ke server sekolah.</span>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-5 py-2 rounded-lg bg-zinc-100 hover:bg-white active:scale-[0.98] text-zinc-900 font-semibold text-xs tracking-tight shadow-2xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-900" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-zinc-900" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 border-t border-zinc-800/80 text-zinc-500 text-xs font-mono shrink-0">
        Portal Asesmen Digital Siswa • E-Ujian Anti-Cheat Terproteksi
      </footer>
    </div>
  );
}

