import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Users, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Search, 
  Filter, 
  GraduationCap, 
  Briefcase, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  School,
  FileSpreadsheet,
  UploadCloud,
  Download,
  FileCheck,
  CheckCircle,
  XCircle,
  FileUp
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import { 
  getUsersApi, 
  createUserApi, 
  updateUserApi, 
  deleteUserApi, 
  getClassroomsApi,
  downloadUserTemplateExcelApi,
  importUsersExcelApi
} from '../../api/authApi';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState(''); // '' | 'TEACHER' | 'STUDENT'
  const [classFilter, setClassFilter] = useState('');

  // Modal states (Tambah / Edit Pengguna Manual)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    role: 'STUDENT',
    classroom_id: '',
    password: ''
  });
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal states (Import Massal Excel)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch Classrooms for dropdowns
  const fetchClassrooms = async () => {
    try {
      const data = await getClassroomsApi();
      setClassrooms(data || []);
    } catch (err) {
      console.error('Gagal mengambil daftar kelas:', err);
    }
  };

  // Fetch Users with active filters
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (classFilter) params.classroom_id = classFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const data = await getUsersApi(params);
      setUsers(data || []);
    } catch (err) {
      console.error('Gagal mengambil data pengguna:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roleFilter, classFilter, searchQuery]);

  useEffect(() => {
    fetchClassrooms();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setSelectedUserId(null);
    setFormData({
      username: '',
      full_name: '',
      role: 'STUDENT',
      classroom_id: classrooms[0]?.id || '',
      password: ''
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setIsEditing(true);
    setSelectedUserId(user.id);
    setFormData({
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      classroom_id: user.classroom_id || '',
      password: '' // Kosongkan password saat edit, isi hanya jika ingin reset
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.full_name.trim()) {
      setModalError('Username/NIP/NISN dan Nama Lengkap wajib diisi!');
      return;
    }

    setIsSubmitting(true);
    setModalError('');
    try {
      const payload = {
        username: formData.username.trim(),
        full_name: formData.full_name.trim(),
        role: formData.role,
        classroom_id: formData.role === 'STUDENT' && formData.classroom_id ? formData.classroom_id : null,
      };
      if (formData.password) {
        payload.password = formData.password;
      }

      if (isEditing) {
        await updateUserApi(selectedUserId, payload);
      } else {
        await createUserApi(payload);
      }
      setIsModalOpen(false);
      await fetchUsers();
    } catch (err) {
      const errDetail = 
        err.response?.data?.username?.[0] || 
        err.response?.data?.detail || 
        'Gagal menyimpan pengguna. Pastikan username belum pernah terdaftar.';
      setModalError(errDetail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (user) => {
    if (window.confirm(`Yakin ingin menghapus pengguna "${user.full_name}" (${user.username})?`)) {
      try {
        await deleteUserApi(user.id);
        await fetchUsers();
      } catch (err) {
        alert('Gagal menghapus pengguna: ' + (err.response?.data?.detail || err.message));
      }
    }
  };

  // Download Template Excel
  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      await downloadUserTemplateExcelApi('Template_Import_Siswa_E-Ujian.xlsx');
    } catch (err) {
      alert('Gagal mengunduh template Excel: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // Buka Modal Import Excel
  const handleOpenImportModal = () => {
    setImportFile(null);
    setImportResult(null);
    setImportError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsImportModalOpen(true);
  };

  // Pilih File
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.match(/\.(xlsx|xls)$/i)) {
        setImportError('Format berkas tidak didukung! Harap pilih berkas berekstensi .xlsx atau .xls.');
        setImportFile(null);
        return;
      }
      setImportFile(file);
      setImportError('');
      setImportResult(null);
    }
  };

  // Submit Import Excel
  const handleImportExcel = async (e) => {
    e.preventDefault();
    if (!importFile) {
      setImportError('Silakan pilih berkas Excel terlebih dahulu.');
      return;
    }

    setIsImporting(true);
    setImportError('');
    try {
      const res = await importUsersExcelApi(importFile);
      setImportResult(res);
      await fetchUsers();
      await fetchClassrooms();
    } catch (err) {
      setImportError(err.response?.data?.error || 'Gagal mengimpor data siswa dari berkas Excel.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Manajemen Pengguna & Hak Akses
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola data akun Guru Pengawas dan Siswa Peserta Ujian yang memiliki hak akses sistem.
          </p>
        </div>

        {/* Tombol Aksi Header */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Tombol Unduh Template Excel */}
          <button
            onClick={handleDownloadTemplate}
            disabled={isDownloadingTemplate}
            className="px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-2 border-emerald-300 hover:border-emerald-500 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
            title="Unduh file template Excel (.xlsx) untuk format data siswa"
          >
            {isDownloadingTemplate ? (
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-700" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            )}
            <span>Unduh Template Excel</span>
          </button>

          {/* Tombol Import Excel */}
          <button
            onClick={handleOpenImportModal}
            className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-2 border-indigo-300 hover:border-indigo-500 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-sm"
            title="Import data siswa massal dari file Excel / hasil Google Form"
          >
            <UploadCloud className="w-4 h-4 text-indigo-600" />
            <span>Import Excel</span>
          </button>

          {/* Tombol Tambah Manual */}
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-md shadow-indigo-600/30"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Manual</span>
          </button>
        </div>
      </div>

      {/* Bar Filter & Pencarian */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Input Pencarian */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Nama, NISN, atau NIP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Filter Peran */}
          <div className="sm:col-span-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">Semua Peran (Guru & Siswa)</option>
              <option value="TEACHER">Guru Pengawas</option>
              <option value="STUDENT">Peserta Siswa</option>
            </select>
          </div>

          {/* Filter Kelas */}
          <div className="sm:col-span-3">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">Semua Kelas</option>
              {classrooms.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* Refresh Button */}
          <div className="sm:col-span-1 flex items-center justify-end">
            <button
              onClick={fetchUsers}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 transition w-full flex items-center justify-center"
              title="Muat Ulang"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium pt-1">
          Menampilkan <strong className="text-slate-800">{users.length}</strong> akun pengguna terdaftar.
        </div>
      </div>

      {/* Tabel Data Pengguna */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Nama Lengkap</th>
                <th className="py-3.5 px-4">Username (NIP / NISN)</th>
                <th className="py-3.5 px-4 text-center">Peran</th>
                <th className="py-3.5 px-4">Kelas</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400 text-xs">
                    {isLoading ? 'Memuat data pengguna...' : 'Tidak ditemukan data pengguna yang cocok.'}
                  </td>
                </tr>
              ) : (
                users.map((u, index) => {
                  const isTeacher = u.role === 'TEACHER';
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-center font-bold text-slate-500">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                        {u.full_name}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        {u.username}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          isTeacher 
                            ? 'bg-purple-50 text-purple-700 border-purple-200' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {isTeacher ? (
                            <>
                              <Briefcase className="w-3.5 h-3.5" />
                              <span>Guru Pengawas</span>
                            </>
                          ) : (
                            <>
                              <GraduationCap className="w-3.5 h-3.5" />
                              <span>Siswa Peserta</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isTeacher ? (
                          <span className="text-slate-400 italic text-[11px]">- Semua -</span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[11px]">
                            {u.classroom_name || 'Belum Diatur'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.is_active 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {u.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition"
                            title="Edit Pengguna & Password"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(u)}
                            className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition"
                            title="Hapus Pengguna"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Pengguna */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Username / NIP / NISN */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Username / NIP / NISN <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={isEditing}
                placeholder="Contoh: 0067829101 atau guru01"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-100"
              />
            </div>

            {/* Peran Akun */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Peran Pengguna <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="STUDENT">Siswa Peserta</option>
                <option value="TEACHER">Guru Pengawas</option>
              </select>
            </div>
          </div>

          {/* Nama Lengkap */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Ahmad Fadhil Ramadhan"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Kelas (Khusus Siswa) */}
          {formData.role === 'STUDENT' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Kelas Siswa <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.classroom_id}
                onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Pilih Kelas</option>
                {classrooms.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.academic_year})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Kata Sandi */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Kata Sandi (Password) {isEditing ? <span className="text-slate-400 font-normal">(Kosongkan jika tidak ingin mengubah)</span> : <span className="text-slate-400 font-normal">(Default: 123456)</span>}
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder={isEditing ? 'Biarkan kosong untuk mempertahankan password lama' : 'Masukkan password (misal: 123456)'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Simpan Perubahan' : 'Buat Pengguna'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: IMPORT MASSAL DATA SISWA DARI FILE EXCEL        */}
      {/* ======================================================== */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          if (!isImporting) {
            setIsImportModalOpen(false);
          }
        }}
        title="Import Data Siswa dari File Excel"
      >
        <div className="space-y-4">
          {/* Petunjuk Pengisian */}
          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 space-y-2">
            <div className="font-extrabold flex items-center gap-1.5 text-indigo-950">
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <span>Panduan Import Otomatis Data Siswa:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-indigo-800">
              Unggah file Excel (<strong>.xlsx</strong>) rekapan siswa (misal: hasil Google Form / SPSS atau template kami). 
              Sistem akan <strong>otomatis membuatkan akun siswa</strong>, menghubungkan ke kelas, dan mengenkripsi kata sandi.
            </p>
            <div className="pt-1 flex items-center justify-between border-t border-indigo-200/60">
              <span className="text-[11px] text-slate-500">Belum punya formatnya?</span>
              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={isDownloadingTemplate}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                <span>Unduh Template Excel Resmi</span>
              </button>
            </div>
          </div>

          {/* Area Upload File */}
          <form onSubmit={handleImportExcel} className="space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`p-6 border-2 border-dashed rounded-2xl cursor-pointer text-center transition flex flex-col items-center justify-center gap-2.5 ${
                importFile 
                  ? 'bg-emerald-50/60 border-emerald-400 hover:bg-emerald-50' 
                  : 'bg-slate-50 border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />

              {importFile ? (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-emerald-900">{importFile.name}</div>
                    <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                      Ukuran: {(importFile.size / 1024).toFixed(1)} KB • Klik untuk mengganti berkas
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Klik untuk memilih berkas Excel (.xlsx)
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Maksimal ukuran 10 MB per berkas
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Pesan Error */}
            {importError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{importError}</span>
              </div>
            )}

            {/* Hasil Ringkasan Import */}
            {importResult && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
                <div className="font-extrabold flex items-center gap-1.5 text-emerald-950">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>{importResult.message}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                    <div className="text-slate-500">Akun Baru Dibuat:</div>
                    <div className="text-sm font-black text-emerald-700">{importResult.created_count} Siswa</div>
                  </div>
                  <div className="bg-white/80 p-2 rounded-lg border border-emerald-200">
                    <div className="text-slate-500">Akun Diperbarui:</div>
                    <div className="text-sm font-black text-indigo-700">{importResult.updated_count} Siswa</div>
                  </div>
                </div>

                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-emerald-200 text-[10px] text-amber-800 space-y-1">
                    <div className="font-bold">Catatan Peringatan Baris:</div>
                    <ul className="list-disc pl-4 space-y-0.5">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Tombol Aksi Modal */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                disabled={isImporting}
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 transition"
              >
                {importResult ? 'Selesai & Tutup' : 'Batal'}
              </button>

              {!importResult && (
                <button
                  type="submit"
                  disabled={isImporting || !importFile}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sedang Memproses Excel...</span>
                    </>
                  ) : (
                    <>
                      <FileUp className="w-3.5 h-3.5" />
                      <span>Mulai Import Data Siswa</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}

