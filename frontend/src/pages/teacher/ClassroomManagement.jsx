import React, { useState, useEffect } from 'react';
import { 
  School, 
  Plus, 
  Edit3, 
  Trash2, 
  Users, 
  Calendar, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import Modal from '../../components/common/Modal';
import { 
  getClassroomsApi, 
  createClassroomApi, 
  updateClassroomApi, 
  deleteClassroomApi 
} from '../../api/authApi';

export default function ClassroomManagement() {
  const [classrooms, setClassrooms] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    academic_year: '2026/2027'
  });
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load classrooms from API
  const fetchClassrooms = async () => {
    setIsLoading(true);
    try {
      const data = await getClassroomsApi();
      setClassrooms(data || []);
    } catch (err) {
      console.error('Gagal mengambil data kelas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setSelectedClassId(null);
    setFormData({ name: '', academic_year: '2026/2027' });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cls) => {
    setIsEditing(true);
    setSelectedClassId(cls.id);
    setFormData({
      name: cls.name,
      academic_year: cls.academic_year || '2026/2027'
    });
    setModalError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setModalError('Nama kelas wajib diisi!');
      return;
    }

    setIsSubmitting(true);
    setModalError('');
    try {
      if (isEditing) {
        await updateClassroomApi(selectedClassId, formData);
      } else {
        await createClassroomApi(formData);
      }
      setIsModalOpen(false);
      await fetchClassrooms();
    } catch (err) {
      const errDetail = err.response?.data?.name?.[0] || err.response?.data?.detail || 'Gagal menyimpan data kelas.';
      setModalError(errDetail);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (cls) => {
    if (window.confirm(`Yakin ingin menghapus kelas "${cls.name}"? Siswa di kelas ini akan terlepas.`)) {
      try {
        await deleteClassroomApi(cls.id);
        await fetchClassrooms();
      } catch (err) {
        alert('Gagal menghapus kelas: ' + (err.response?.data?.detail || err.message));
      }
    }
  };

  const filteredClassrooms = classrooms.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.academic_year && c.academic_year.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
              <School className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Data Kelas & Rombongan Belajar
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola data kelas dan tahun ajaran untuk alokasi siswa, paket soal, dan sesi ujian.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold transition flex items-center gap-2 shadow-md shadow-indigo-600/30 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kelas Baru</span>
        </button>
      </div>

      {/* Bar Pencarian & Refresh */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama kelas atau tahun ajaran..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-slate-500 font-medium">
            Total: <strong className="text-slate-800">{filteredClassrooms.length}</strong> Kelas
          </span>
          <button
            onClick={fetchClassrooms}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabel Data Kelas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Nama Kelas / Rombel</th>
                <th className="py-3.5 px-4">Tahun Ajaran</th>
                <th className="py-3.5 px-4 text-center">Jumlah Siswa</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClassrooms.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400 text-xs">
                    {isLoading ? 'Memuat data kelas...' : 'Belum ada data kelas yang terdaftar.'}
                  </td>
                </tr>
              ) : (
                filteredClassrooms.map((cls, index) => (
                  <tr key={cls.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 text-center font-bold text-slate-500">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                      {cls.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[11px]">
                        {cls.academic_year || '2026/2027'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-200">
                        <Users className="w-3.5 h-3.5" />
                        <span>{cls.student_count || 0} Siswa</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenEdit(cls)}
                          className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition"
                          title="Edit Kelas"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(cls)}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition"
                          title="Hapus Kelas"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Kelas */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Data Kelas' : 'Tambah Kelas Baru'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Nama Kelas / Rombel <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: X TKJ 1, XII MIPA 2"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tahun Ajaran <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: 2026/2027"
              value={formData.academic_year}
              onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
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
                  <span>{isEditing ? 'Simpan Perubahan' : 'Tambah Kelas'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

