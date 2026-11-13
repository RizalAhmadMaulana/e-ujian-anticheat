import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import { proctoringApi } from '../../api/proctoringApi';
import { examApi } from '../../api/examApi';
import { getClassroomsApi } from '../../api/authApi';
import { 
  ShieldAlert, 
  Trash2, 
  RefreshCw, 
  Search, 
  Filter, 
  ExternalLink, 
  Check, 
  CheckCircle2, 
  AlertTriangle, 
  FileSpreadsheet, 
  X,
  Users,
  Clock,
  CheckSquare,
  Square
} from 'lucide-react';

export default function ViolationHistory() {
  const navigate = useNavigate();
  const { examSessions, examPackages } = useExamStore();

  const [allSessions, setAllSessions] = useState([]);
  const [allPackages, setAllPackages] = useState([]);
  const [allClassrooms, setAllClassrooms] = useState([]);

  // Multi-level Filtering (Identik dengan Menu E-Jurnal)
  const [selectedPackageFilter, setSelectedPackageFilter] = useState('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Data Pelanggaran
  const [violations, setViolations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);

  // Modal Konfirmasi Hapus Satuan & Massal
  const [deleteTarget, setDeleteTarget] = useState(null); // Single violation object
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 1. Ambil data master sesi, paket, dan kelas saat inisialisasi
  useEffect(() => {
    const initializeMasterData = async () => {
      setIsLoading(true);
      try {
        const [sessionsData, packagesData, classroomsData] = await Promise.allSettled([
          examApi.getSessions(),
          examApi.getPackages(),
          getClassroomsApi()
        ]);

        const sessions = sessionsData.status === 'fulfilled' && Array.isArray(sessionsData.value) ? sessionsData.value : examSessions;
        const packages = packagesData.status === 'fulfilled' && Array.isArray(packagesData.value) ? packagesData.value : examPackages;
        const classrooms = classroomsData.status === 'fulfilled' && Array.isArray(classroomsData.value) ? classroomsData.value : [];

        setAllSessions(sessions || []);
        setAllPackages(packages || []);
        setAllClassrooms(classrooms || []);

        if (sessions && sessions.length > 0) {
          setSelectedSessionId(sessions[0].id);
        }
      } catch (err) {
        console.warn('Gagal memuat master data Riwayat Pelanggaran:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeMasterData();
  }, []);

  // 2. Filter sesi berdasarkan pilihan Paket Soal & Kelas
  const filteredSessions = useMemo(() => {
    return allSessions.filter((ses) => {
      const matchPackage = 
        selectedPackageFilter === 'ALL' || 
        ses.package === selectedPackageFilter || 
        ses.packageId === selectedPackageFilter || 
        ses.package_id === selectedPackageFilter;

      const sessionClass = ses.classroom || ses.classroom_name;
      const matchClass = 
        selectedClassFilter === 'ALL' || 
        sessionClass === selectedClassFilter;

      return matchPackage && matchClass;
    });
  }, [allSessions, selectedPackageFilter, selectedClassFilter]);

  // Update selectedSessionId jika sesi yang sedang dipilih tidak ada di daftar filtered
  useEffect(() => {
    if (filteredSessions.length > 0) {
      if (!filteredSessions.some((s) => s.id === selectedSessionId)) {
        setSelectedSessionId(filteredSessions[0].id);
      }
    } else {
      setSelectedSessionId('');
    }
  }, [filteredSessions, selectedSessionId]);

  // 3. Sesi aktif yang sedang dipilih
  const currentSession = useMemo(() => {
    if (!selectedSessionId) return filteredSessions[0] || allSessions[0] || null;
    return allSessions.find((s) => s.id === selectedSessionId) || filteredSessions[0] || null;
  }, [selectedSessionId, allSessions, filteredSessions]);

  // 4. Ambil daftar pelanggaran terfilter dari backend
  const fetchViolations = async () => {
    if (!currentSession?.id) {
      setViolations([]);
      setSelectedIds([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await proctoringApi.getViolations({
        session_id: currentSession.id
      });
      setViolations(Array.isArray(data) ? data : []);
      setSelectedIds([]);
    } catch (err) {
      console.warn('Gagal memuat log pelanggaran backend:', err);
      setViolations([]);
      setSelectedIds([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, [currentSession?.id]);

  // 5. Filter pencarian teks
  const filteredViolations = useMemo(() => {
    if (!searchQuery.trim()) return violations;
    const q = searchQuery.toLowerCase();
    return violations.filter(
      (v) =>
        (v.student_name && v.student_name.toLowerCase().includes(q)) ||
        (v.nisn && v.nisn.toLowerCase().includes(q)) ||
        (v.description && v.description.toLowerCase().includes(q)) ||
        (v.violation_type_label && v.violation_type_label.toLowerCase().includes(q))
    );
  }, [violations, searchQuery]);

  // Statistik Ringkasan
  const totalViolations = violations.length;
  const uniqueStudents = new Set(violations.map((v) => v.nisn || v.student_name)).size;
  const unlockedCount = violations.filter((v) => Boolean(v.unlocked_by_teacher_at)).length;
  const stillLockedCount = Math.max(0, totalViolations - unlockedCount);

  // Toggle Pilihan Checkbox
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredViolations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredViolations.map((v) => v.id));
    }
  };

  const handleToggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Handler Hapus Satuan
  const handleConfirmSingleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await proctoringApi.deleteViolation(deleteTarget.id);
      setToastMessage(`Catatan pelanggaran ${deleteTarget.student_name} berhasil dihapus. E-Jurnal telah disinkronkan.`);
      setTimeout(() => setToastMessage(''), 5000);
      setDeleteTarget(null);
      await fetchViolations();
    } catch (err) {
      alert('Gagal menghapus catatan pelanggaran: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  // Handler Hapus Massal (Terpilih atau Seluruh Sesi)
  const handleConfirmBulkDelete = async () => {
    if (!currentSession?.id) return;
    setIsDeleting(true);
    try {
      const payload = selectedIds.length > 0 
        ? { ids: selectedIds } 
        : { session_id: currentSession.id };

      const res = await proctoringApi.bulkDeleteViolations(payload);
      setToastMessage(res.message || 'Catatan pelanggaran berhasil dihapus dan E-Jurnal telah disinkronkan.');
      setTimeout(() => setToastMessage(''), 5000);
      setIsBulkDeleteModalOpen(false);
      setSelectedIds([]);
      await fetchViolations();
    } catch (err) {
      alert('Gagal menghapus catatan pelanggaran massal: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ======================================================== */}
      {/* 1. HEADER HALAMAN & ACTION TOOLBAR                       */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              Riwayat Pelanggaran Integritas Ujian
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5 leading-relaxed">
            Monitor dan bersihkan data pelanggaran sensor yang tidak disengaja oleh siswa sebelum E-Jurnal Berita Acara dicetak resmi.
          </p>
        </div>

        {/* Toolbar Tombol Aksi */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/teacher/ejournal')}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-xs hover:-translate-y-0.5 active:scale-[0.98]"
            title="Buka Lembar E-Jurnal Berita Acara untuk Verifikasi & Cetak"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Lihat di E-Jurnal</span>
          </button>

          <button
            onClick={fetchViolations}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition shadow-2xs hover:-translate-y-0.5 active:scale-[0.98]"
            title="Muat Ulang Riwayat"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-zinc-900' : ''}`} />
          </button>
        </div>
      </div>

      {/* Toast Notifikasi Sukses */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-medium flex items-center gap-2 shadow-2xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. KARTU FILTER PERSIS E-JURNAL (PAKET, KELAS, & SESI)   */}
      {/* ======================================================== */}
      <div className="bg-white rounded-xl p-5 border border-zinc-200/90 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <span>Pilih Paket Soal, Rombel Kelas, & Sesi Ujian</span>
          </div>
          <span className="text-[11px] font-mono font-medium text-zinc-500">
            {filteredSessions.length} sesi asesmen
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* 1. Filter Paket Soal */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              Filter Paket Soal:
            </label>
            <select
              value={selectedPackageFilter}
              onChange={(e) => setSelectedPackageFilter(e.target.value)}
              className="w-full text-xs font-medium rounded-lg border border-zinc-200 focus:outline-none focus:border-zinc-400 py-2 px-2.5 bg-white text-zinc-900"
            >
              <option value="ALL">Semua Paket Soal</option>
              {allPackages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.subject_name || pkg.subjectName} — {pkg.title}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filter Kelas / Rombel */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              Filter Kelas / Rombel:
            </label>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="w-full text-xs font-medium rounded-lg border border-zinc-200 focus:outline-none focus:border-zinc-400 py-2 px-2.5 bg-white text-zinc-900"
            >
              <option value="ALL">Semua Kelas</option>
              {allClassrooms.map((cls) => (
                <option key={cls.id || cls.name} value={cls.name}>
                  Kelas {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Pilih Sesi Ujian Terbuka */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              Pilih Sesi Ujian Terbuka:
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              disabled={filteredSessions.length === 0}
              className="w-full text-xs font-medium rounded-lg border border-zinc-200 focus:outline-none focus:border-zinc-400 py-2 px-2.5 bg-white text-zinc-900 disabled:opacity-50"
            >
              {filteredSessions.length === 0 ? (
                <option value="">Tidak ada sesi yang cocok</option>
              ) : (
                filteredSessions.map((ses) => (
                  <option key={ses.id} value={ses.id}>
                    {ses.subject_name || ses.subjectName} • {ses.classroom_name || ses.classroom} ({ses.title})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. 4 KARTU METRIK STATISTIK PELANGGARAN                   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Total Pelanggaran
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-rose-600 mt-1">
            {totalViolations} <span className="text-xs font-normal text-zinc-500 font-sans">kejadian</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Siswa Terdeteksi
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 mt-1">
            {uniqueStudents} <span className="text-xs font-normal text-zinc-500 font-sans">orang</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Sudah Dibuka Kunci
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 mt-1">
            {unlockedCount} <span className="text-xs font-normal text-zinc-500 font-sans">kali</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200/90 shadow-2xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Status Masih Terkunci
          </div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-600 mt-1">
            {stillLockedCount} <span className="text-xs font-normal text-zinc-500 font-sans">kali</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. TABEL RIWAYAT PELANGGARAN PERSIS CATATAN INTEGRITAS   */}
      {/* ======================================================== */}
      <div className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs overflow-hidden space-y-4 p-5">
        {/* Toolbar Tabel: Search & Tombol Hapus Massal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari siswa, NISN, atau keterangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 focus:outline-none focus:border-zinc-400 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.length > 0 ? (
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs active:scale-[0.98]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Terpilih ({selectedIds.length})</span>
              </button>
            ) : violations.length > 0 ? (
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 text-xs font-semibold transition flex items-center gap-1.5 active:scale-[0.98]"
                title="Hapus seluruh log pelanggaran pada sesi aktif ini sekaligus"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Bersihkan Seluruh Log Sesi</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Kontainer Tabel */}
        <div className="overflow-x-auto rounded-lg border border-rose-200">
          <table className="w-full text-xs text-left">
            <thead className="bg-rose-50 text-rose-900 font-semibold uppercase text-[10px] tracking-wider border-b border-rose-200">
              <tr>
                <th className="py-2.5 px-3 text-center w-8">
                  <input
                    type="checkbox"
                    checked={filteredViolations.length > 0 && selectedIds.length === filteredViolations.length}
                    onChange={handleToggleSelectAll}
                    className="rounded border-zinc-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                </th>
                <th className="py-2.5 px-3 text-center w-10">No</th>
                <th className="py-2.5 px-3">Nama Siswa</th>
                <th className="py-2.5 px-3 text-center">NISN</th>
                <th className="py-2.5 px-3 text-center">Jenis Pelanggaran</th>
                <th className="py-2.5 px-3">Keterangan Sensor</th>
                <th className="py-2.5 px-3 text-center">Waktu</th>
                <th className="py-2.5 px-3 text-center">Status Buka Kunci</th>
                <th className="py-2.5 px-3 text-center w-16">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-100 bg-rose-50/20">
              {isLoading ? (
                <tr>
                  <td colSpan="9" className="py-10 text-center text-zinc-500 text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1.5 text-rose-600" />
                    <span>Memuat riwayat pelanggaran...</span>
                  </td>
                </tr>
              ) : filteredViolations.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-zinc-400 text-xs">
                    {searchQuery ? (
                      <div>Tidak ditemukan data pelanggaran dengan kata kunci "{searchQuery}".</div>
                    ) : (
                      <div className="space-y-1">
                        <div className="font-semibold text-zinc-700">Bersih! Tidak Ada Catatan Pelanggaran</div>
                        <p className="text-zinc-500 text-[11px]">
                          Seluruh siswa pada sesi ini mengerjakan secara tertib tanpa ada insiden yang tercatat.
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredViolations.map((v, idx) => {
                  const isSelected = selectedIds.includes(v.id);
                  return (
                    <tr 
                      key={v.id || idx}
                      className={`hover:bg-rose-100/40 transition ${isSelected ? 'bg-rose-100/60' : ''}`}
                    >
                      <td className="py-2 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(v.id)}
                          className="rounded border-zinc-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-2 px-3 text-center font-mono font-semibold text-rose-700">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-3 font-semibold text-zinc-900">
                        {v.student_name}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-zinc-600">
                        {v.nisn}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-medium text-[10px]">
                          {v.violation_type_label || v.violation_type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-zinc-700 leading-relaxed">
                        {v.description}
                      </td>
                      <td className="py-2 px-3 text-center font-mono text-zinc-600">
                        {v.detected_at ? new Date(v.detected_at).toLocaleTimeString('id-ID') : '-'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {v.unlocked_by_teacher_at ? (
                          <span className="text-emerald-700 font-medium text-[10px] flex items-center justify-center gap-1">
                            <Check className="w-3 h-3" /> Dibuka [{new Date(v.unlocked_by_teacher_at).toLocaleTimeString('id-ID')}]
                          </span>
                        ) : (
                          <span className="text-rose-700 font-semibold text-[10px]">
                            Terkunci
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(v)}
                          className="p-1.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-100 text-rose-600 transition shadow-2xs active:scale-95"
                          title="Hapus catatan pelanggaran ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Keterangan Sinkronisasi Otomatis E-Jurnal */}
        <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Setiap data riwayat yang dihapus di sini otomatis langsung memperbarui catatan integritas dan rekapitulasi di E-Jurnal.</span>
          </div>
          <div className="font-mono">
            Menampilkan {filteredViolations.length} dari {totalViolations} data
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. MODAL KONFIRMASI HAPUS SATUAN                         */}
      {/* ======================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn select-none">
          <div className="bg-white rounded-xl border border-zinc-200/90 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-zinc-900 tracking-tight">
                  Hapus Catatan Pelanggaran Siswa?
                </h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  Apakah Anda yakin ingin menghapus catatan insiden untuk siswa <strong>{deleteTarget.student_name}</strong>?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3 text-xs text-zinc-600 space-y-1">
              <div>• <strong>Jenis:</strong> {deleteTarget.violation_type_label || deleteTarget.violation_type}</div>
              <div>• <strong>Keterangan:</strong> {deleteTarget.description}</div>
              <div>• <strong>Waktu:</strong> {deleteTarget.detected_at ? new Date(deleteTarget.detected_at).toLocaleTimeString('id-ID') : '-'}</div>
            </div>

            <div className="text-[11px] text-zinc-500 leading-relaxed bg-amber-50 border border-amber-200/80 p-3 rounded-lg text-amber-900">
              Penghapusan ini akan mengurangkan total akumulasi pelanggaran siswa tersebut dan seketika tercermin pada lembar Berita Acara E-Jurnal sebelum dicetak.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmSingleDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs active:scale-[0.98] disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Catatan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODAL KONFIRMASI HAPUS MASSAL                         */}
      {/* ======================================================== */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn select-none">
          <div className="bg-white rounded-xl border border-zinc-200/90 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-zinc-900 tracking-tight">
                  {selectedIds.length > 0 
                    ? `Hapus ${selectedIds.length} Catatan Pelanggaran Terpilih?` 
                    : `Bersihkan Seluruh Log Pelanggaran Sesi Ini?`}
                </h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  {selectedIds.length > 0
                    ? `Seluruh ${selectedIds.length} catatan pelanggaran yang Anda pilih akan dihapus permanen dari basis data.`
                    : `Seluruh catatan insiden pelanggaran pada sesi ${currentSession?.title || 'ini'} akan dihapus permanen.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-[11px] text-zinc-600 bg-zinc-50 border border-zinc-200/80 p-3 rounded-lg leading-relaxed">
              Tindakan ini akan me-reset akumulasi pelanggaran siswa yang bersangkutan. Tabel Catatan Integritas pada E-Jurnal otomatis disinkronkan secara bersih sebelum Anda mencetak dokumen berita acara.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-3.5 py-2 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs active:scale-[0.98] disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Ya, Hapus Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
