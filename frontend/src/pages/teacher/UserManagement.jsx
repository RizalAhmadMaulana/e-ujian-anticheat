import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Plus, 
  FileSpreadsheet, 
  Download, 
  Edit3, 
  Trash2, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Search, 
  Filter, 
  X,
  ShieldCheck,
  GraduationCap,
  Users
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

  // Filter & Search states
  const [roleFilter, setRoleFilter] = useState(''); // '' | 'TEACHER' | 'STUDENT'
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);

  // Modal Tambah / Edit Pengguna
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    role: 'STUDENT',
    classroom_id: '',
    password: ''
  });
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal Hapus User
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Modal Import Excel
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const fileInputRef = useRef(null);

  // Toast Notifikasi
  const [toastMessage, setToastMessage] = useState('');
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const fetchClassrooms = async () => {
    try {
      const data = await getClassroomsApi();
      setClassrooms(data || []);
    } catch (err) {
      console.error('Gagal mengambil kelas:', err);
    }
  };

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (roleFilter) params.role = roleFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const data = await getUsersApi(params);
      setUsers(data || []);
    } catch (err) {
      console.error('Gagal mengambil data user:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roleFilter, searchTerm]);

  useEffect(() => {
    fetchClassrooms();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [roleFilter, searchTerm, entriesPerPage]);

  // Helper Initials
  const getInitials = (name) => {
    if (!name) return 'US';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Pagination calculation
  const indexOfLastItem = currentPage * entriesPerPage;
  const indexOfFirstItem = indexOfLastItem - entriesPerPage;
  const currentItems = users.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(users.length / entriesPerPage) || 1;

  // Handler Buka Modal Tambah
  const handleOpenAdd = () => {
    setIsEditing(false);
    setSelectedUserId(null);
    setFormData({
      username: '',
      full_name: '',
      email: '',
      role: 'STUDENT',
      classroom_id: classrooms[0]?.id || '',
      password: ''
    });
    setModalError('');
    setIsModalOpen(true);
  };

  // Handler Buka Modal Edit
  const handleOpenEdit = (user) => {
    setIsEditing(true);
    setSelectedUserId(user.id);
    setFormData({
      username: user.username,
      full_name: user.full_name || '',
      email: user.email || '',
      role: user.role,
      classroom_id: user.classroom?.id || user.classroom_id || '',
      password: ''
    });
    setModalError('');
    setIsModalOpen(true);
  };

  // Handler Simpan Data (Tambah / Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.full_name.trim()) {
      setModalError('Username dan Nama Lengkap wajib diisi!');
      return;
    }
    if (!isEditing && !formData.password.trim()) {
      setModalError('Kata sandi wajib diisi untuk pengguna baru!');
      return;
    }

    setIsSubmitting(true);
    setModalError('');

    try {
      const payload = {
        username: formData.username.trim(),
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        role: formData.role
      };

      if (formData.role === 'STUDENT' && formData.classroom_id) {
        payload.classroom_id = formData.classroom_id;
      }

      if (formData.password.trim()) {
        payload.password = formData.password.trim();
      }

      if (isEditing) {
        await updateUserApi(selectedUserId, payload);
        showToast('Data pengguna berhasil diperbarui!');
      } else {
        await createUserApi(payload);
        showToast('Akun pengguna baru berhasil dibuat!');
      }

      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      const errData = err.response?.data;
      let msg = 'Gagal menyimpan data pengguna.';
      if (errData) {
        if (typeof errData === 'string') msg = errData;
        else if (errData.username) msg = `Username: ${errData.username.join(', ')}`;
        else if (errData.detail) msg = errData.detail;
      }
      setModalError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler Buka Modal Hapus
  const handleOpenDelete = (user) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };

  // Eksekusi Hapus User
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await deleteUserApi(userToDelete.id);
      showToast(`Pengguna ${userToDelete.full_name || userToDelete.username} berhasil dihapus!`);
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err) {
      alert('Gagal menghapus pengguna: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  // Unduh Template Excel Pengguna
  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      await downloadUserTemplateExcelApi('Template_Import_User_E-Ujian.xlsx');
      showToast('Template Excel Pengguna berhasil diunduh!');
    } catch (err) {
      alert('Gagal mengunduh template Excel: ' + err.message);
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  // Upload & Import Excel Pengguna
  const handleImportSubmit = async () => {
    if (!importFile) {
      setImportError('Silakan pilih berkas Excel terlebih dahulu!');
      return;
    }
    setIsImporting(true);
    setImportError('');
    setImportResult(null);

    try {
      const res = await importUsersExcelApi(importFile);
      setImportResult(res);
      showToast(res.message || 'Proses impor pengguna berhasil!');
      fetchUsers();
      fetchClassrooms();
    } catch (err) {
      setImportError(err.response?.data?.error || 'Gagal mengimpor file Excel.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notifikasi Floating */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 animate-bounce">
          <div className="px-5 py-3 rounded-xl bg-slate-900 border-2 border-emerald-500 text-white font-bold text-xs flex items-center gap-2.5 shadow-2xl">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header Halaman & 3 Tombol Aksi (Persis Gaya Data Kelas) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Manajemen Pengguna & Hak Akses
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola seluruh akun pengguna, hak akses peran, dan reset kata sandi asesmen.
          </p>
        </div>

        {/* 3 Tombol Aksi Lengkap & Berwarna */}
        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-md shadow-indigo-600/30 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah User</span>
          </button>

          <button
            onClick={() => {
              setImportFile(null);
              setImportError('');
              setImportResult(null);
              setIsImportModalOpen(true);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-md shadow-emerald-600/30 active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={handleDownloadTemplate}
            disabled={isDownloadingTemplate}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50 active:scale-95"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>{isDownloadingTemplate ? 'Mengunduh...' : 'Template Excel'}</span>
          </button>
        </div>
      </div>

      {/* Bar Pencarian, Show Entries, Filter Peran, & Refresh (Persis Gaya Data Kelas) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Sisi Kiri: Show Entries & Filter Peran */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Show Entries */}
          <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
            <span>Show</span>
            <select
              value={entriesPerPage}
              onChange={(e) => setEntriesPerPage(Number(e.target.value))}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>

          <span className="text-slate-300 hidden sm:inline">|</span>

          {/* Filter Peran */}
          <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Peran:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
            >
              <option value="">Semua Peran</option>
              <option value="TEACHER">Guru Pengawas</option>
              <option value="STUDENT">Siswa Peserta</option>
            </select>
          </div>
        </div>

        {/* Sisi Kanan: Search Bar & Counter */}
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Username / Nama..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 font-medium hidden md:inline">
              Total: <strong className="text-slate-800">{users.length}</strong> Pengguna
            </span>
            <button
              onClick={fetchUsers}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
              title="Muat Ulang"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabel Manajemen Pengguna (Persis Gaya Data Kelas dengan Sentuhan Warna) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 w-14 text-center">NO</th>
                <th className="py-3.5 px-4">Nama Lengkap Pengguna</th>
                <th className="py-3.5 px-4">Username (NIP / NISN)</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4 text-center">Role / Hak Akses</th>
                <th className="py-3.5 px-4 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 text-xs">
                    {isLoading ? 'Memuat data pengguna...' : 'Belum ada akun pengguna yang terdaftar.'}
                  </td>
                </tr>
              ) : (
                currentItems.map((u, index) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-center font-bold text-slate-500">
                      {indexOfFirstItem + index + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm ${
                            u.role === 'TEACHER'
                              ? 'bg-gradient-to-tr from-indigo-500 to-purple-600'
                              : 'bg-gradient-to-tr from-emerald-500 to-teal-600'
                          }`}
                        >
                          {getInitials(u.full_name || u.username)}
                        </div>
                        <div>
                          <div className="text-slate-900 font-bold">{u.full_name || '-'}</div>
                          <div className="text-[11px] text-slate-400 font-normal">
                            {u.role === 'TEACHER' ? 'Dewan Guru Pengawas' : (u.classroom?.name || u.classroom_name ? `Kelas: ${u.classroom?.name || u.classroom_name}` : 'Siswa Peserta')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px]">
                        {u.username}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {u.email || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {u.role === 'TEACHER' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200">
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>Guru Pengawas</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                          <Users className="w-3.5 h-3.5" />
                          <span>Siswa Peserta</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 px-2.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition font-bold text-xs flex items-center gap-1 shadow-2xs"
                          title="Edit User & Reset Sandi"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleOpenDelete(u)}
                          className="p-1.5 px-2.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition font-bold text-xs flex items-center gap-1 shadow-2xs"
                          title="Hapus User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Card Footer: Info Entri & Paginasi */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <div>
            Menampilkan <strong className="text-slate-800">{users.length > 0 ? indexOfFirstItem + 1 : 0}</strong> sampai{' '}
            <strong className="text-slate-800">{Math.min(indexOfLastItem, users.length)}</strong> dari{' '}
            <strong className="text-slate-800">{users.length}</strong> pengguna
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs disabled:opacity-40 transition"
            >
              Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`w-7 h-7 rounded-lg font-bold text-xs transition flex items-center justify-center ${
                  currentPage === page
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs disabled:opacity-40 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL TAMBAH / EDIT USER */}
      {/* ======================================================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Perbarui Akun Pengguna' : 'Tambah Pengguna Baru'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Username (NIP / NISN) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Contoh: 19850101... atau 008123..."
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-mono font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Nama lengkap pengguna"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Email (Opsional)
            </label>
            <input
              type="email"
              placeholder="user@sekolah.sch.id"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Peran Akun <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
              >
                <option value="STUDENT">Siswa Peserta</option>
                <option value="TEACHER">Guru Pengawas</option>
              </select>
            </div>

            {formData.role === 'STUDENT' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Kelas / Rombel
                </label>
                <select
                  value={formData.classroom_id}
                  onChange={(e) => setFormData({ ...formData, classroom_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                >
                  <option value="">-- Tanpa Kelas --</option>
                  {classrooms.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {isEditing ? 'Ubah Kata Sandi (Kosongkan jika tidak diubah)' : 'Kata Sandi'} {!isEditing && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={isEditing ? 'Masukkan kata sandi baru...' : 'Masukkan kata sandi akun'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
                required={!isEditing}
              />
            </div>
            {isEditing && (
              <p className="text-[11px] text-slate-500 mt-1">
                * Isi kolom ini untuk me-reset kata sandi pengguna jika pengguna lupa sandi.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold transition shadow-md shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting && <RefreshCw className="w-4 h-4 animate-spin" />}
              <span>{isEditing ? 'Simpan Perubahan' : 'Tambah User'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL KONFIRMASI HAPUS USER */}
      {/* ======================================================== */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Konfirmasi Hapus Pengguna"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Hapus akun pengguna ini?
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Akun <strong>{userToDelete?.full_name || userToDelete?.username}</strong> ({userToDelete?.username}) akan dihapus secara permanen dari sistem.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-md shadow-rose-600/30 disabled:opacity-50"
            >
              {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL IMPORT EXCEL PENGGUNA */}
      {/* ======================================================== */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Pengguna via Excel"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto mb-3 shadow-sm">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <p className="text-xs text-slate-600 font-medium">
              Format Header Kolom Excel: <br />
              <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 mt-1 inline-block">
                username, full_name, email, role, password
              </span>
            </p>
          </div>

          {importError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {importResult && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{importResult.message}</span>
              </div>
              <div className="text-[11px] text-emerald-600 pl-5.5">
                Pengguna Baru: <strong>{importResult.created_count}</strong> • Diperbarui: <strong>{importResult.updated_count}</strong>
              </div>
            </div>
          )}

          <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 bg-slate-50 text-center hover:bg-slate-100/60 transition">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => setImportFile(e.target.files[0] || null)}
              className="text-xs text-slate-700 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer w-full"
            />
            <p className="text-[11px] text-slate-400 mt-2">
              Pilih file spreadsheet .xlsx atau .xls dari komputer Anda.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Unduh Format Template
            </button>

            <button
              type="button"
              onClick={handleImportSubmit}
              disabled={isImporting || !importFile}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/30 transition flex items-center gap-2 disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>Import Sekarang</span>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
