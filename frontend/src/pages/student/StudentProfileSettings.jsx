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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between select-none relative">
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
              {currentUser?.fullName} • {studentClassName} (NISN: {currentUser?.username})
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
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 z-10">
        {/* Navigation Back Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/student/lobby')}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm hover:border-slate-700"
          >
            <ArrowLeft className="w-4 h-4 text-indigo-400" />
            <span>Kembali ke Beranda Asesmen</span>
          </button>

          {/* Security Badge Status */}
          <div className="flex items-center gap-2">
            {profileMeta.needs_profile_completion ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Perlu Dilengkapi</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                <BadgeCheck className="w-4 h-4 text-emerald-400" />
                <span>Profil Aman</span>
              </div>
            )}
            <button
              type="button"
              onClick={loadProfile}
              disabled={isLoading}
              title="Muat ulang data"
              className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Title Header Card */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 shrink-0">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Pengaturan Profil Siswa
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Kelola nama lengkap, email, NISN, dan kata sandi akun asesmen Anda.
              </p>
            </div>
          </div>
        </div>

        {/* Alert Notifikasi */}
        {successMessage && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-sm animate-fade-in shadow-md">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-300 text-sm animate-fade-in shadow-md">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Warning Box jika kata sandi masih bawaan atau email belum diatur */}
        {profileMeta.needs_profile_completion && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200 space-y-1.5 shadow-sm">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-300">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Pemberitahuan Keamanan Akun Siswa:</span>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              {profileMeta.is_password_default && '• Akun Anda masih menggunakan kata sandi bawaan (NISN). Mohon ganti kata sandi di bawah ini agar akun Anda tidak dapat diakses orang lain.\n'}
              {!profileMeta.is_profile_complete && '• Lengkapi nama lengkap dan email aktif Anda untuk identitas pengerjaan asesmen.'}
            </p>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Card 1: Informasi Biodata Peserta */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Biodata Peserta Asesmen</h2>
                  <p className="text-xs text-slate-400">Terhubung langsung dengan Manajemen Pengguna dan Data Siswa Sekolah.</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                Kelas: {studentClassName}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nama Lengkap */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Nama Lengkap Siswa <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Contoh: Rizal Ahmad Maulana"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">Nama ini dicantumkan pada Berita Acara dan Rekap Nilai E-Jurnal.</p>
              </div>

              {/* NISN / Username */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  NISN / Nomor Induk <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Contoh: 0081234567"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">Digunakan untuk login ke Portal Ujian.</p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Alamat Email Aktif <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Contoh: siswa@gmail.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Digunakan untuk pemulihan akun jika lupa sandi.</p>
              </div>
            </div>
          </div>

          {/* Card 2: Keamanan & Ganti Kata Sandi */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Ganti Kata Sandi Akun Siswa (Opsional)</h2>
                  <p className="text-xs text-slate-400">Kosongkan bagian ini jika Anda tidak ingin mengubah kata sandi.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Kata Sandi Lama */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Kata Sandi Lama
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    name="current_password"
                    value={formData.current_password}
                    onChange={handleChange}
                    placeholder="Kata sandi saat ini"
                    className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Sandi saat ini (default: NISN).</p>
              </div>

              {/* Kata Sandi Baru */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimal 6 karakter"
                    className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Gunakan sandi yang mudah Anda ingat.</p>
              </div>

              {/* Konfirmasi Kata Sandi Baru */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Ulangi Sandi Baru
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="Ulangi kata sandi baru"
                    className="w-full pr-10 pl-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Harus sama dengan sandi baru.</p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Info className="w-4 h-4 text-indigo-400" />
              <span>Perubahan data otomatis terhubung dengan sistem data sekolah.</span>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-7 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 border-t border-slate-900 text-slate-500 text-xs shrink-0">
        Portal Asesmen Digital Siswa • E-Ujian Anti-Cheat Terproteksi
      </footer>
    </div>
  );
}

