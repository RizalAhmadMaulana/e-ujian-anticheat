import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Eye, 
  MapPin, 
  Phone, 
  Mail, 
  UserCheck, 
  Calendar,
  Sparkles,
  School
} from 'lucide-react';
import { useExamStore } from '../../store/useExamStore';
import { getSchoolSettingsApi, updateSchoolSettingsApi } from '../../api/authApi';

export default function SchoolSettings() {
  const { currentUser, schoolSettings, fetchSchoolSettings, updateSchoolSettings } = useExamStore();

  const [formData, setFormData] = useState({
    name: 'MIS RISALAH',
    sub_header: 'KEMENTERIAN AGAMA REPUBLIK INDONESIA',
    address: 'Jl. Raya Karangampel No. 45',
    phone: '(0234) 123456',
    email: 'info@mis-risalah.sch.id',
    principal_name: "H. Ahmad Syafi'i, M.Pd.I",
    principal_nip: '197508102003121002',
    city: 'Indramayu',
    academic_year: '2026/2027',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Ambil data pengaturan sekolah saat mount
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const data = await getSchoolSettingsApi();
        if (data && data.name) {
          setFormData({
            name: data.name || '',
            sub_header: data.sub_header || '',
            address: data.address || '',
            phone: data.phone || '',
            email: data.email || '',
            principal_name: data.principal_name || '',
            principal_nip: data.principal_nip || '',
            city: data.city || '',
            academic_year: data.academic_year || '2026/2027',
          });
        }
      } catch (err) {
        console.warn('Fallback settings dari store:', err);
        if (schoolSettings) {
          setFormData(schoolSettings);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, [schoolSettings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMessage('Nama sekolah tidak boleh kosong.');
      return;
    }

    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await updateSchoolSettingsApi(formData);
      if (res) {
        await updateSchoolSettings(formData);
        setSuccessMessage('Pengaturan identitas sekolah berhasil disimpan dan disinkronkan ke E-Jurnal!');
        setTimeout(() => setSuccessMessage(''), 4000);
      }
    } catch (err) {
      console.error('Gagal menyimpan pengaturan sekolah:', err);
      // Fallback local update
      updateSchoolSettings(formData);
      setSuccessMessage('Pengaturan tersimpan di sesi lokal.');
      setTimeout(() => setSuccessMessage(''), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                Pengaturan & Identitas Sekolah
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Ubah nama sekolah, kop dinas, alamat, dan pejabat kepala sekolah untuk dokumen E-Jurnal resmi.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchSchoolSettings}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          <span>Muat Ulang</span>
        </button>
      </div>

      {/* Alert Notifikasi */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-300 text-red-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ======================================================== */}
        {/* KOLOM KIRI: FORMULIR INPUT PENGATURAN (7 Kolom) */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Form Identitas & Dokumen Resmi</h2>
              <p className="text-xs text-slate-500">Data ini otomatis tercetak pada Berita Acara, Lembar E-Jurnal, dan Ekspor PDF/Excel.</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
              Dinamis
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* 1. Nama Sekolah & Instansi */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Nama Sekolah / Madrasah <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="Contoh: MIS RISALAH / SMK NEGERI 1 INFORMATIKA"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Instansi / Sub-Header Kop Surat
              </label>
              <input
                type="text"
                name="sub_header"
                value={formData.sub_header}
                onChange={handleChange}
                placeholder="Contoh: KEMENTERIAN AGAMA REPUBLIK INDONESIA / DINAS PENDIDIKAN"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <span className="text-[11px] text-slate-400 block">Tampil pada baris paling atas kop dokumen resmi</span>
            </div>

            {/* 2. Alamat & Kota */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Alamat Lengkap
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Contoh: Jl. Raya Karangampel No. 45"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Kota / Kabupaten
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Contoh: Indramayu"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* 3. Telepon & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nomor Telepon
                </label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Contoh: (0234) 123456"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Email Resmi
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Contoh: info@mis-risalah.sch.id"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* 4. Pejabat Kepala Sekolah & NIP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Nama Kepala Sekolah / Madrasah
                </label>
                <input
                  type="text"
                  name="principal_name"
                  value={formData.principal_name}
                  onChange={handleChange}
                  placeholder="Contoh: H. Ahmad Syafi'i, M.Pd.I"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  NIP / NUPTK Kepala Sekolah
                </label>
                <input
                  type="text"
                  name="principal_nip"
                  value={formData.principal_nip}
                  onChange={handleChange}
                  placeholder="Contoh: 197508102003121002"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* 5. Tahun Ajaran Aktif */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Tahun Ajaran Aktif
              </label>
              <input
                type="text"
                name="academic_year"
                value={formData.academic_year}
                onChange={handleChange}
                placeholder="Contoh: 2026/2027"
                className="w-full sm:w-1/2 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Tombol Simpan Form */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/30 transition flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan Perubahan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Pengaturan Sekolah</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* ======================================================== */}
        {/* KOLOM KANAN: LIVE PREVIEW KOP & TANDA TANGAN (5 Kolom) */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-extrabold uppercase tracking-wider">Pratinjau Lembar Dokumen</span>
            </div>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
              Live Preview
            </span>
          </div>

          {/* Kotak Kertas A4 Mini */}
          <div className="bg-white rounded-2xl border border-slate-300 shadow-lg p-6 space-y-6 text-slate-800 text-center">
            {/* Kop Surat Live Preview */}
            <div className="border-b-2 border-slate-900 pb-4 text-center space-y-1">
              {formData.sub_header && (
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {formData.sub_header}
                </div>
              )}
              <h3 className="text-base sm:text-lg font-black text-slate-950 tracking-tight leading-tight">
                {formData.name || 'NAMA SEKOLAH'}
              </h3>
              <p className="text-[10px] text-slate-500 leading-tight">
                {[
                  formData.address,
                  formData.phone ? `Telp: ${formData.phone}` : null,
                  formData.email ? `Email: ${formData.email}` : null
                ].filter(Boolean).join(' • ')}
              </p>
            </div>

            {/* Judul Dokumen Preview */}
            <div className="space-y-0.5 py-1">
              <div className="text-xs font-black uppercase text-slate-900 underline underline-offset-2">
                Berita Acara & E-Jurnal Pelaksanaan Asesmen
              </div>
              <div className="text-[10px] text-slate-500">
                Tahun Ajaran {formData.academic_year || '2026/2027'} • Sistem Anti-Cheat Lockdown
              </div>
            </div>

            {/* Ilustrasi Tabel Nilai */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-[11px] space-y-1">
              <div className="flex justify-between font-bold text-slate-700">
                <span>Contoh Rekapitulasi:</span>
                <span className="text-emerald-700 font-extrabold">32 Siswa Hadir</span>
              </div>
              <div className="text-slate-500 text-[10px]">
                Rekapitulasi kehadiran, hasil pengerjaan soal, skor pilihan ganda, dan log sensor kecurangan.
              </div>
            </div>

            {/* Tanda Tangan Pengesahan Live Preview */}
            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-center text-[10px]">
              <div>
                <div className="text-slate-500">Mengetahui,</div>
                <div className="font-bold text-slate-900">Kepala {formData.name || 'Sekolah'}</div>
                <div className="h-12 flex items-center justify-center text-slate-300 italic text-[9px]">
                  (Tanda Tangan & Cap)
                </div>
                <div className="font-bold text-slate-900 underline">
                  {formData.principal_name || 'Nama Kepala Sekolah'}
                </div>
                <div className="text-slate-500 font-mono text-[9px]">
                  {formData.principal_nip ? `NIP. ${formData.principal_nip}` : '-'}
                </div>
              </div>

              <div>
                <div className="text-slate-500">
                  {formData.city || 'Kota'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="font-bold text-slate-900">Guru Pengawas Ujian</div>
                <div className="h-12 flex items-center justify-center text-slate-300 italic text-[9px]">
                  (Tanda Tangan)
                </div>
                <div className="font-bold text-slate-900 underline">
                  {currentUser?.fullName || currentUser?.full_name || currentUser?.username || 'Guru Pengawas Ujian'}
                </div>
                <div className="text-slate-500 font-mono text-[9px]">
                  {currentUser?.nip ? `NIP. ${currentUser.nip}` : (currentUser?.username ? `NIP. ${currentUser.username}` : '-')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

