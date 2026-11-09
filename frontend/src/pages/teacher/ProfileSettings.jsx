import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  KeyRound, 
  Mail, 
  ShieldCheck, 
  ShieldAlert, 
  Save, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Info,
  RefreshCw,
  Lock,
  BadgeCheck
} from 'lucide-react';
import { useExamStore } from '../../store/useExamStore';
import { fetchCurrentUserApi, updateCurrentUserProfileApi } from '../../api/authApi';

export default function ProfileSettings() {
  const { currentUser, setCurrentUser } = useExamStore();

  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    nip: '',
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
  const [profileMeta, setProfileMeta] = useState({
    is_profile_complete: false,
    is_password_default: false,
    needs_profile_completion: false,
  });

  // Muat data profil terbaru dari API
  const loadProfile = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const data = await fetchCurrentUserApi();
      if (data) {
        setFormData((prev) => ({
          ...prev,
          username: data.username || '',
          full_name: data.full_name || data.fullName || '',
          email: data.email || '',
          nip: data.nip || data.username || '',
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
      console.error('Gagal memuat profil pengguna:', err);
      // Fallback ke currentUser dari Zustand store
      if (currentUser) {
        setFormData((prev) => ({
          ...prev,
          username: currentUser.username || '',
          full_name: currentUser.full_name || currentUser.fullName || '',
          email: currentUser.email || '',
          nip: currentUser.nip || currentUser.username || '',
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

  const handleSave = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.full_name.trim()) {
      setErrorMessage('Nama lengkap tidak boleh kosong!');
      return;
    }

    if (!formData.username.trim()) {
      setErrorMessage('Username / NIP tidak boleh kosong!');
      return;
    }

    // Jika mengisi ganti kata sandi
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
        nip: formData.username.trim(),
        email: formData.email.trim(),
      };

      if (formData.password.trim()) {
        payload.current_password = formData.current_password.trim();
        payload.password = formData.password.trim();
      }

      const res = await updateCurrentUserProfileApi(payload);
      if (res) {
        const normalized = {
          ...res,
          fullName: res.full_name || res.username,
          full_name: res.full_name || res.username,
        };
        setCurrentUser(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));

        setProfileMeta({
          is_profile_complete: !!res.is_profile_complete,
          is_password_default: !!res.is_password_default,
          needs_profile_completion: !!res.needs_profile_completion,
        });

        // Kosongkan form password
        setFormData((prev) => ({
          ...prev,
          current_password: '',
          password: '',
          confirm_password: '',
        }));

        setSuccessMessage('Profil Anda berhasil diperbarui dan otomatis disinkronkan ke seluruh sistem!');
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err) {
      console.error('Gagal memperbarui profil:', err);
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-xl border border-zinc-200/90 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200/90 text-zinc-800 flex items-center justify-center shadow-2xs shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              Pengaturan Profil Akun
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
              Kelola informasi data diri, email, NIP/username, dan kata sandi Anda.
            </p>
          </div>
        </div>

        {/* Security Badge Status */}
        <div className="flex items-center gap-2">
          {profileMeta.needs_profile_completion ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Perlu Dilengkapi</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Profil Lengkap & Aman</span>
            </div>
          )}
          <button
            type="button"
            onClick={loadProfile}
            disabled={isLoading}
            title="Muat ulang data"
            className="p-1.5 rounded-lg border border-zinc-200/90 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alert Notifikasi */}
      {successMessage && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Warning Box jika kata sandi masih bawaan atau data belum lengkap */}
      {profileMeta.needs_profile_completion && (
        <div className="p-3.5 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 space-y-1 shadow-2xs">
          <div className="flex items-center gap-2 font-semibold text-xs sm:text-sm text-amber-950">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Pemberitahuan Peningkatan Keamanan Akun:</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            {profileMeta.is_password_default && '• Akun Anda masih menggunakan kata sandi bawaan sistem. Mohon ganti kata sandi di bawah ini demi menjaga keamanan sesi ujian.\n'}
            {!profileMeta.is_profile_complete && '• Lengkapi nama lengkap dan alamat email resmi Anda agar sinkron dengan E-Jurnal dan notifikasi.'}
          </p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Card 1: Biodata Diri & Akun */}
        <div className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs overflow-hidden p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-zinc-100">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-zinc-100 text-zinc-700">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900">Informasi Data Diri</h2>
                <p className="text-xs text-zinc-500">Data ini terhubung langsung dengan Manajemen Pengguna dan Data Guru.</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
              Role: Guru Pengawas
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nama Lengkap */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Nama Lengkap & Gelar <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Contoh: Supeni, S.Pd"
                required
                className="w-full px-3 py-2 bg-zinc-50 rounded-lg border border-zinc-200/90 text-xs sm:text-sm font-medium text-zinc-900 focus:bg-white focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition"
              />
              <p className="text-[11px] text-zinc-400 mt-1">Nama ini akan dicantumkan pada Tanda Tangan E-Jurnal Berita Acara Asesmen.</p>
            </div>

            {/* Username / NIP */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Username / NIP <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Contoh: 198005122005012001"
                required
                className="w-full px-3 py-2 bg-zinc-50 rounded-lg border border-zinc-200/90 text-xs sm:text-sm font-mono font-medium text-zinc-900 focus:bg-white focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition"
              />
              <p className="text-[11px] text-zinc-400 mt-1">Digunakan untuk kredensial login portal guru.</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Alamat Email Aktif <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Contoh: guru@sekolah.sch.id"
                  className="w-full pl-9 pr-3 py-2 bg-zinc-50 rounded-lg border border-zinc-200/90 text-xs sm:text-sm font-medium text-zinc-900 focus:bg-white focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition"
                />
                <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">Digunakan untuk verifikasi dan kontak sekolah.</p>
            </div>
          </div>
        </div>

        {/* Card 2: Keamanan & Ganti Kata Sandi */}
        <div className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs overflow-hidden p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-zinc-100">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-zinc-100 text-zinc-700">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900">Ganti Kata Sandi (Opsional)</h2>
                <p className="text-xs text-zinc-500">Kosongkan bagian ini jika Anda tidak ingin mengubah kata sandi.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Kata Sandi Lama */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Kata Sandi Lama
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  name="current_password"
                  value={formData.current_password}
                  onChange={handleChange}
                  placeholder="Kata sandi saat ini"
                  className="w-full pr-9 pl-3 py-2 bg-zinc-50 rounded-lg border border-zinc-200/90 text-xs sm:text-sm text-zinc-900 focus:bg-white focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">Diperlukan untuk konfirmasi perubahan sandi.</p>
            </div>

            {/* Kata Sandi Baru */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Kata Sandi Baru
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimal 6 karakter"
                  className="w-full pr-9 pl-3 py-2 bg-zinc-50 rounded-lg border border-zinc-200/90 text-xs sm:text-sm text-zinc-900 focus:bg-white focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">Gunakan kombinasi huruf dan angka.</p>
            </div>

            {/* Konfirmasi Kata Sandi Baru */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Ulangi Kata Sandi Baru
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  placeholder="Ulangi kata sandi baru"
                  className="w-full pr-9 pl-3 py-2 bg-zinc-50 rounded-lg border border-zinc-200/90 text-xs sm:text-sm text-zinc-900 focus:bg-white focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">Pastikan sama dengan kata sandi baru.</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Info className="w-3.5 h-3.5 text-zinc-500" />
            <span>Perubahan otomatis tersinkronisasi ke database pengguna portal.</span>
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs sm:text-sm shadow-2xs hover:-translate-y-0.5 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50"
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
    </div>
  );
}

