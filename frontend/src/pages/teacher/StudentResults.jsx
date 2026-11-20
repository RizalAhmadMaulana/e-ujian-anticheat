import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Award, 
  Search, 
  Filter, 
  BookOpen, 
  School, 
  Calendar, 
  Users, 
  CheckCircle, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  FileSpreadsheet, 
  RefreshCw, 
  Eye, 
  ChevronRight, 
  X, 
  Sparkles, 
  HelpCircle, 
  FileText, 
  Check, 
  AlertCircle, 
  TrendingUp, 
  Clock, 
  ShieldAlert, 
  ShieldCheck, 
  ExternalLink,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { 
  getSessionsApi, 
  getPackagesApi, 
  getSessionStudentResultsApi, 
  getStudentAttemptBreakdownApi,
  downloadSessionResultsExcelApi,
  openStudentRemedialApi
} from '../../api/examApi';
import { getClassroomsApi } from '../../api/authApi';
import MathText from '../../components/common/MathText';
import { resolveImageUrl, handleImageErrorFallback } from '../../utils/imageUrlFormatter';

export default function StudentResults() {
  const [searchParams] = useSearchParams();

  // Master Filter Data
  const [sessions, setSessions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);

  // Active Filter Selection
  const [selectedPackageId, setSelectedPackageId] = useState('ALL');
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [selectedSessionId, setSelectedSessionId] = useState(searchParams.get('session') || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusTab, setStatusTab] = useState('SUBMITTED'); // SUBMITTED | IN_PROGRESS | ALL

  // Session Results Data
  const [sessionResults, setSessionResults] = useState(null);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [resultsError, setResultsError] = useState('');
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Student Attempt Breakdown Modal State
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [breakdownData, setBreakdownData] = useState(null);
  const [isLoadingBreakdown, setIsLoadingBreakdown] = useState(false);
  const [breakdownFilter, setBreakdownFilter] = useState('ALL'); // ALL | CORRECT | INCORRECT | ESSAY

  // Student Remedial Modal State
  const [remedialStudent, setRemedialStudent] = useState(null);
  const [isOpeningRemedial, setIsOpeningRemedial] = useState(false);
  const [remedialFeedback, setRemedialFeedback] = useState(null);

  // 1. Inisialisasi Filter Data (Paket, Kelas, dan Sesi)
  useEffect(() => {
    const fetchFilterData = async () => {
      setIsLoadingFilters(true);
      try {
        const [sessRes, pkgRes, clsRes] = await Promise.allSettled([
          getSessionsApi(),
          getPackagesApi(),
          getClassroomsApi()
        ]);

        const sessList = sessRes.status === 'fulfilled' && Array.isArray(sessRes.value) ? sessRes.value : [];
        const pkgList = pkgRes.status === 'fulfilled' && Array.isArray(pkgRes.value) ? pkgRes.value : [];
        const clsList = clsRes.status === 'fulfilled' && Array.isArray(clsRes.value) ? clsRes.value : [];

        // Tampilkan seluruh paket ujian dan sesi (pilihan ganda, esai, campuran, dll) tanpa dibatasi
        setSessions(sessList);
        setPackages(pkgList);
        setClassrooms(clsList);

        // Jika belum ada session terpilih dari URL, pilih sesi pertama yang tersedia
        if (!selectedSessionId && sessList.length > 0) {
          setSelectedSessionId(sessList[0].id);
        }
      } catch (err) {
        console.error('Gagal mengambil master data filter:', err);
      } finally {
        setIsLoadingFilters(false);
      }
    };

    fetchFilterData();
  }, []);

  // 2. Filter Sesi Ujian Berdasarkan Paket Soal & Kelas Terpilih
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // Filter Paket Soal
      if (selectedPackageId !== 'ALL') {
        const sPkgId = s.package?.id || s.package_id || s.packageId;
        if (sPkgId && String(sPkgId) !== String(selectedPackageId)) return false;
      }

      // Filter Kelas
      if (selectedClassId !== 'ALL') {
        if (s.is_all_classrooms || s.allow_all_classes || s.allowAllClasses) return true; // Sesi untuk semua kelas tetap lolos
        const multiClassIds = Array.isArray(s.classrooms) ? s.classrooms.map((c) => String(c?.id || c || '')) : [];
        const singleClassId = s.classroom?.id ? String(s.classroom.id) : (s.classroom_id ? String(s.classroom_id) : null);
        const matchClass = multiClassIds.includes(String(selectedClassId)) || singleClassId === String(selectedClassId);
        if (!matchClass) return false;
      }

      return true;
    });
  }, [sessions, selectedPackageId, selectedClassId]);

  // Sinkronisasi Sesi Terpilih jika di luar filter
  useEffect(() => {
    if (filteredSessions.length > 0) {
      if (!filteredSessions.some((s) => String(s.id) === String(selectedSessionId))) {
        setSelectedSessionId(filteredSessions[0].id);
      }
    } else {
      setSelectedSessionId('');
    }
  }, [filteredSessions, selectedSessionId]);

  // Helper selectedClassObj
  const selectedClassObj = useMemo(() => {
    if (selectedClassId === 'ALL') return null;
    return classrooms.find((c) => String(c.id) === String(selectedClassId));
  }, [classrooms, selectedClassId]);

  // 3. Fetch Rekapitulasi Nilai Siswa untuk Sesi & Kelas Terpilih
  const fetchSessionResults = useCallback(async (sessionId, classId = selectedClassId) => {
    if (!sessionId) {
      setSessionResults(null);
      return;
    }

    setIsLoadingResults(true);
    setResultsError('');
    try {
      const clsParam = (classId && classId !== 'ALL') ? classId : null;
      const data = await getSessionStudentResultsApi(sessionId, clsParam);
      setSessionResults(data);
    } catch (err) {
      console.error('Gagal mengambil rekapitulasi nilai sesi:', err);
      setResultsError(err.response?.data?.error || 'Gagal memuat rekapitulasi nilai siswa.');
      setSessionResults(null);
    } finally {
      setIsLoadingResults(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionResults(selectedSessionId, selectedClassId);
    }
  }, [selectedSessionId, selectedClassId, fetchSessionResults]);

  // 4. Fetch Rincian Lembar Jawaban Siswa (Breakdown Modal)
  const handleOpenBreakdownModal = async (student) => {
    if (!student.attempt_id) return;
    setSelectedAttempt(student);
    setIsLoadingBreakdown(true);
    setBreakdownFilter('ALL');
    try {
      const data = await getStudentAttemptBreakdownApi(student.attempt_id);
      setBreakdownData(data);
    } catch (err) {
      console.error('Gagal memuat rincian lembar jawaban:', err);
      setBreakdownData(null);
    } finally {
      setIsLoadingBreakdown(false);
    }
  };

  const handleCloseBreakdownModal = () => {
    setSelectedAttempt(null);
    setBreakdownData(null);
  };

  // 4b. Handler Buka Akses Remidi Siswa
  const handleOpenRemedialModal = (student) => {
    setRemedialStudent(student);
  };

  const handleCloseRemedialModal = () => {
    setRemedialStudent(null);
  };

  const handleConfirmOpenRemedial = async () => {
    if (!remedialStudent || !selectedSessionId) return;
    setIsOpeningRemedial(true);
    try {
      const res = await openStudentRemedialApi(selectedSessionId, remedialStudent.student_id, 'open');
      setRemedialFeedback({
        type: 'success',
        message: res.message || `Akses remidi untuk ${remedialStudent.student_name} berhasil dibuka.`
      });
      handleCloseRemedialModal();
      await fetchSessionResults(selectedSessionId, selectedClassId);
    } catch (err) {
      console.error('Gagal membuka akses remidi:', err);
      alert(err.response?.data?.error || 'Gagal membuka akses remidi siswa. Silakan coba lagi.');
    } finally {
      setIsOpeningRemedial(false);
    }
  };

  // 5. Isolasi Data Siswa Berdasarkan Kelas Terpilih
  const classStudents = useMemo(() => {
    if (!sessionResults?.students) return [];
    if (selectedClassId === 'ALL') return sessionResults.students;

    const targetName = selectedClassObj?.name?.trim().toLowerCase();
    const targetNameClean = targetName ? targetName.replace(/\s+/g, '') : '';
    const targetIdStr = String(selectedClassId);

    return sessionResults.students.filter((st) => {
      if (st.classroom_id && String(st.classroom_id) === targetIdStr) return true;
      if (targetName && st.classroom_name) {
        const cName = st.classroom_name.trim().toLowerCase();
        if (cName === targetName || cName.replace(/\s+/g, '') === targetNameClean) return true;
      }
      return false;
    });
  }, [sessionResults, selectedClassId, selectedClassObj]);

  // 6. Hitung Statistik Nilai Khusus Kelas Terpilih
  const classStats = useMemo(() => {
    const total = classStudents.length;
    const isStudentSubmitted = (s) => (
      s.status === 'SUBMITTED' ||
      s.is_remedial_allowed ||
      Boolean(s.finished_at)
    );
    const submitted = classStudents.filter(isStudentSubmitted);
    const submittedCount = submitted.length;
    const inProgressCount = classStudents.filter((s) => !isStudentSubmitted(s) && s.status !== 'NOT_STARTED').length;

    let average = '-';
    let highest = 0;
    let lowest = 0;

    if (submittedCount > 0) {
      // Siswa yang belum dinilai esainya dikecualikan dari kalkulasi rerata/tertinggi/terendah
      const gradedStudents = submitted.filter((s) => !s.has_ungraded_essay);
      if (gradedStudents.length > 0) {
        const scores = gradedStudents.map((s) => Number(s.final_score !== undefined ? s.final_score : (s.total_score !== null && s.total_score !== undefined ? s.total_score : s.previous_score)) || 0);
        const sum = scores.reduce((a, b) => a + b, 0);
        average = Math.round((sum / gradedStudents.length) * 10) / 10;
        highest = Math.max(...scores);
        lowest = Math.min(...scores);
      }
    }

    return {
      total,
      submittedCount,
      inProgressCount,
      average,
      highest,
      lowest,
    };
  }, [classStudents]);

  // 7. Filter Akhir Data Siswa (Tab Status + Search Query)
  const filteredStudents = useMemo(() => {
    if (!classStudents) return [];

    return classStudents.filter((st) => {
      const isStudentSubmitted = (
        st.status === 'SUBMITTED' ||
        st.is_remedial_allowed ||
        Boolean(st.finished_at)
      );

      // Filter Status Tab (Siswa dengan hak remidi terbuka atau sudah selesai tampil di tab Selesai)
      if (statusTab === 'SUBMITTED' && !isStudentSubmitted) return false;
      if (statusTab === 'IN_PROGRESS' && (isStudentSubmitted || st.status === 'NOT_STARTED')) return false;

      // Filter Pencarian Teks
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = st.student_name?.toLowerCase().includes(q);
        const matchNisn = st.nisn?.toLowerCase().includes(q);
        const matchClass = st.classroom_name?.toLowerCase().includes(q);
        if (!matchName && !matchNisn && !matchClass) return false;
      }

      return true;
    });
  }, [classStudents, statusTab, searchQuery]);

  // Helper Durasi Pengerjaan
  const formatDuration = (started, finished) => {
    if (!started || !finished) return '-';
    try {
      const start = new Date(started).getTime();
      const end = new Date(finished).getTime();
      const diffMinutes = Math.round((end - start) / 60000);
      if (diffMinutes < 1) return '< 1 Menit';
      return `${diffMinutes} Menit`;
    } catch {
      return '-';
    }
  };

  // Current session object for quick info
  const currentSessionObj = useMemo(() => {
    return sessions.find((s) => String(s.id) === String(selectedSessionId)) || null;
  }, [sessions, selectedSessionId]);

  // Handler Download Rekapitulasi Nilai & Analisis Butir Soal ke Excel (.xlsx) Sesuai Filter
  const handleDownloadExcel = async () => {
    if (!selectedSessionId) {
      alert('Silakan pilih sesi ujian terlebih dahulu.');
      return;
    }
    setIsExportingExcel(true);
    try {
      const currentPkgTitle = currentSessionObj?.title || 'Rekap_Ujian';
      const classNameForFile = selectedClassObj?.name || (selectedClassId !== 'ALL' ? selectedClassId : (currentSessionObj?.classroom_display || currentSessionObj?.classroom_name || 'Semua_Kelas'));
      const statusSuffix = statusTab !== 'ALL' ? `_${statusTab}` : '';
      const cleanFilename = `Rekap_Nilai_${currentPkgTitle}_${classNameForFile}${statusSuffix}.xlsx`.replace(/[^\w.-]/g, '_');
      
      const classroomParam = selectedClassId !== 'ALL' ? (selectedClassObj?.name || selectedClassId) : null;
      const statusParam = statusTab !== 'ALL' ? statusTab : null;

      await downloadSessionResultsExcelApi(selectedSessionId, cleanFilename, classroomParam, statusParam);
    } catch (err) {
      console.error('Gagal mengunduh file excel rekapitulasi nilai:', err);
      alert('Gagal mengunduh rekap Excel: ' + (err.response?.data?.error || err.message || 'Terjadi kesalahan'));
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ======================================================== */}
      {/* 1. HEADER HALAMAN & INTEGRASI QUICK ACTIONS               */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shadow-2xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                Rekap Nilai Siswa
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 mt-0.5 leading-relaxed">
                Hasil penilaian otomatis, analisis lembar jawaban per butir soal, dan integrasi dengan Berita Acara E-Jurnal.
              </p>
            </div>
          </div>
        </div>

        {/* Tombol Segarkan Data */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchSessionResults(selectedSessionId)}
            disabled={isLoadingResults || !selectedSessionId}
            className="p-2.5 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-lg text-xs font-medium transition disabled:opacity-50 shadow-2xs active:scale-[0.98] cursor-pointer"
            title="Segarkan Rekap Nilai"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingResults ? 'animate-spin text-emerald-600' : 'text-zinc-600'}`} />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. FILTER MULTI-LEVEL (PAKET SOAL, KELAS, & SESI UJIAN)  */}
      {/* ======================================================== */}
      <div className="bg-white rounded-xl p-5 border border-zinc-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-700">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <span>Pilih Paket Soal, Rombel Kelas, & Sesi Ujian</span>
          </div>
          <span className="text-[11px] text-zinc-400 font-mono">
            {filteredSessions.length} sesi tersedia
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* 1. Filter Paket Soal */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              1. Filter Paket Soal:
            </label>
            <select
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
              className="w-full text-xs bg-zinc-50 hover:bg-white focus:bg-white border border-zinc-300 rounded-lg p-2.5 text-zinc-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition font-medium cursor-pointer"
            >
              <option value="ALL">-- Seluruh Paket Soal Mandiri ({packages.length}) --</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.subject_name || pkg.subjectName} — {pkg.title}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filter Kelas / Rombel */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              2. Filter Kelas / Rombel:
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full text-xs bg-zinc-50 hover:bg-white focus:bg-white border border-zinc-300 rounded-lg p-2.5 text-zinc-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition font-medium cursor-pointer"
            >
              <option value="ALL">-- Seluruh Kelas ({classrooms.length}) --</option>
              {classrooms.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Pilih Sesi Ujian Terbuka */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              3. Sesi Ujian Aktif:
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              disabled={filteredSessions.length === 0}
              className="w-full text-xs bg-emerald-50/50 hover:bg-emerald-50 focus:bg-white border border-emerald-300/80 rounded-lg p-2.5 text-emerald-950 font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition cursor-pointer disabled:opacity-50"
            >
              {filteredSessions.length === 0 ? (
                <option value="">Tidak ada sesi yang cocok</option>
              ) : (
                filteredSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title} ({s.classroom_display || s.classroom_name || 'Semua Kelas'})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Ringkasan Info Sesi Terpilih */}
        {currentSessionObj && (
          <div className="bg-zinc-50 border border-zinc-200/80 rounded-lg p-3 text-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3 text-zinc-700">
              <span className="font-bold text-zinc-900">{currentSessionObj.title}</span>
              <span className="text-zinc-300">•</span>
              <span>Mapel: <strong>{currentSessionObj.subject_name || currentSessionObj.subjectName || '-'}</strong></span>
              <span className="text-zinc-300">•</span>
              <span>Kelas: <strong>{currentSessionObj.classroom_display || currentSessionObj.classroom_name || 'Semua Kelas'}</strong></span>
              <span className="text-zinc-300">•</span>
              <span>Durasi: <strong>{currentSessionObj.duration_minutes || currentSessionObj.durationMinutes} Menit</strong></span>
            </div>
            <div className="text-[11px] font-mono text-zinc-500">
              ID Sesi: {currentSessionObj.id?.slice(0, 8)}...
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. 4 KPI STATISTIK KARTU NILAI KELAS                    */}
      {/* ======================================================== */}
      {sessionResults && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Total Peserta */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-zinc-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Total Peserta</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-zinc-900">
                {classStats.total}
              </span>
              <span className="text-xs text-zinc-500 font-medium">Siswa</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">
              {selectedClassObj ? `Terdaftar di kelas ${selectedClassObj.name}` : 'Terdaftar dalam sesi ini'}
            </div>
          </div>

          {/* Card 2: Sudah Selesai / Terkirim */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-zinc-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Selesai / Terkirim</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600">
                {classStats.submittedCount}
              </span>
              <span className="text-xs text-zinc-500 font-medium">
                {classStats.total > 0
                  ? `(${Math.round((classStats.submittedCount / classStats.total) * 100)}%)`
                  : ''}
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">Lembar jawaban terarsip</div>
          </div>

          {/* Card 3: Rata-Rata Nilai */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-zinc-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Rata-Rata Kelas</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-600">
                {classStats.average}
              </span>
              <span className="text-xs text-zinc-500 font-medium">/ 100</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">Skor rerata {selectedClassObj?.name || 'kelas'}</div>
          </div>

          {/* Card 4: Tertinggi & Terendah */}
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-zinc-200/90 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tertinggi / Terendah</span>
              <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2 font-mono">
              <span className="text-xl sm:text-2xl font-black text-emerald-600">
                {classStats.highest}
              </span>
              <span className="text-zinc-400 font-light">/</span>
              <span className="text-xl sm:text-2xl font-black text-rose-500">
                {classStats.lowest}
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-1">Rentang nilai siswa</div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. TABEL REKAPITULASI NILAI & ACTION LIHAT LEMBAR JAWABAN */}
      {/* ======================================================== */}
      <div className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs overflow-hidden">
        {/* Toolbar Pencarian & Filter Tab */}
        <div className="p-4 border-b border-zinc-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-zinc-50/50">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-zinc-200/70 p-1 rounded-lg overflow-x-auto">
            <button
              type="button"
              onClick={() => setStatusTab('SUBMITTED')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                statusTab === 'SUBMITTED'
                  ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Selesai ({classStats.submittedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusTab('IN_PROGRESS')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                statusTab === 'IN_PROGRESS'
                  ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Sedang Mengerjakan ({classStats.inProgressCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusTab('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                statusTab === 'ALL'
                  ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Semua Peserta ({classStats.total})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Box */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama siswa atau NISN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
            </div>

            {/* Tombol Unduh Rekap Excel di Atas Tabel */}
            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={isExportingExcel || !selectedSessionId}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-xs font-semibold transition shadow-2xs active:scale-[0.98] shrink-0 cursor-pointer disabled:cursor-not-allowed"
              title="Unduh seluruh rekapitulasi nilai dan rincian jawaban siswa ke format Excel (.xlsx)"
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 ${isExportingExcel ? 'animate-bounce' : ''}`} />
              <span className="hidden sm:inline">{isExportingExcel ? 'Menyiapkan...' : 'Download Excel'}</span>
              <span className="sm:hidden">Excel</span>
            </button>
          </div>
        </div>

        {/* Remedial Feedback Banner */}
        {remedialFeedback && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-medium">{remedialFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setRemedialFeedback(null)}
              className="p-1 hover:bg-amber-100 rounded text-amber-700 hover:text-amber-900 transition font-bold"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tabel Data Siswa */}
        <div className="overflow-x-auto">
          {isLoadingResults ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <div className="text-xs text-zinc-500 font-medium">Memuat rekap nilai siswa...</div>
            </div>
          ) : resultsError ? (
            <div className="py-14 text-center space-y-3 px-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-semibold text-zinc-800">
                  {resultsError.includes('500') || resultsError.includes('Gagal memuat')
                    ? 'Belum Ada Aktivitas Pengerjaan Sesi Ini'
                    : resultsError}
                </div>
                <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                  Belum ada siswa yang mulai atau mengirimkan lembar jawaban pada sesi ujian ini. Nilai dan analisis butir soal akan otomatis terdata secara real-time saat siswa mulai mengerjakan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fetchSessionResults(selectedSessionId)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold shadow-2xs transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-zinc-500" />
                <span>Segarkan Data</span>
              </button>
            </div>
          ) : !selectedSessionId ? (
            <div className="py-16 text-center space-y-2 text-zinc-400">
              <Filter className="w-8 h-8 mx-auto text-zinc-300" />
              <div className="text-xs font-medium">Silakan pilih sesi ujian pada filter di atas untuk melihat nilai.</div>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-14 text-center space-y-3 px-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-semibold text-zinc-700">Belum Ada Siswa yang Terdata</div>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  {searchQuery 
                    ? `Tidak ditemukan siswa dengan kata kunci "${searchQuery}". Coba kata kunci lain.`
                    : statusTab === 'SUBMITTED'
                      ? `Belum ada siswa ${selectedClassObj ? `kelas ${selectedClassObj.name}` : ''} yang berstatus Selesai pada sesi ini.`
                      : `Belum ada siswa ${selectedClassObj ? `kelas ${selectedClassObj.name}` : ''} yang terdaftar atau mengerjakan sesi ini.`}
                </p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3 text-center w-12">No</th>
                  <th className="py-3 px-3">NISN</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-3">Kelas</th>
                  <th className="py-3 px-3 text-center">Waktu Selesai</th>
                  <th className="py-3 px-3">Durasi</th>
                  <th className="py-3 px-3 text-center">Jawaban Benar</th>
                  <th className="py-3 px-3 text-center">Sensor Anti-Cheat</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Nilai Akhir</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredStudents.map((st, idx) => (
                  <tr key={st.student_id || idx} className="hover:bg-zinc-50/80 transition">
                    <td className="py-3 px-3 text-center font-mono text-zinc-400">
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3 font-mono text-zinc-600">
                      {st.nisn || '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                          {st.student_name ? st.student_name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div className="font-semibold text-zinc-900">
                          {st.student_name}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-zinc-600 font-medium">
                      {st.classroom_name || '-'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {st.finished_at ? (
                        <div className="flex flex-col items-center leading-tight">
                          <span className="font-mono text-zinc-800 text-[11px] font-semibold whitespace-nowrap">
                            {st.finished_date && st.finished_date !== '-' 
                              ? st.finished_date 
                              : new Date(st.finished_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="font-mono text-zinc-500 text-[10px] whitespace-nowrap">
                            {st.finished_time && st.finished_time !== '-'
                              ? `${st.finished_time} WIB`
                              : `${new Date(st.finished_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-400 font-mono text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-zinc-500 font-mono text-[11px]">
                      {formatDuration(st.started_at, st.finished_at)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center gap-1 font-mono font-semibold text-zinc-700">
                        <span className="text-emerald-600 font-bold">{st.correct_count ?? 0}</span>
                        <span className="text-zinc-400">/</span>
                        <span>{st.total_questions ?? sessionResults.total_questions ?? 0}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {st.violation_count > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200">
                          <ShieldAlert className="w-3 h-3" />
                          <span>{st.violation_count} Pelanggaran</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                          <ShieldCheck className="w-3 h-3" />
                          <span>0 Bersih</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {st.is_remedial_allowed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs">
                          <RotateCcw className="w-3 h-3 text-amber-600" />
                          <span>Remidi Terbuka</span>
                        </span>
                      ) : (st.status === 'SUBMITTED' || Boolean(st.finished_at)) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          <span>Selesai</span>
                        </span>
                      ) : st.status === 'LOCKED_VIOLATION' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-500" />
                          <span>Terkunci</span>
                        </span>
                      ) : st.status === 'NOT_STARTED' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <span>Belum Masuk</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <Clock className="w-3 h-3 text-blue-500" />
                          <span>Mengerjakan</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {st.has_ungraded_essay ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 font-semibold text-xs shadow-2xs">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Belum Dinilai</span>
                          </span>
                          <span className="text-[10px] text-zinc-400 font-medium">
                            {st.essay_graded_count !== undefined ? `${st.essay_graded_count}/${st.total_essay_questions || 0} Esai Dinilai` : 'Menunggu Koreksi'}
                          </span>
                        </div>
                      ) : st.total_score !== null && st.total_score !== undefined && st.status !== 'NOT_STARTED' ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="inline-flex items-baseline gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 text-white font-mono font-bold text-xs shadow-2xs">
                            <span className="text-sm font-black text-emerald-400">{st.total_score}</span>
                            <span className="text-[10px] text-zinc-400">/ 100</span>
                          </div>
                          {st.previous_score !== null && st.previous_score !== undefined && (
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200" 
                              title={`Nilai Awal: ${st.previous_score}${st.remedial_score !== null && st.remedial_score !== undefined ? `, Nilai Remidi: ${st.remedial_score}` : ''} (Sistem Otomatis Mengambil Nilai Tertinggi)`}
                            >
                              <RotateCcw className="w-2.5 h-2.5 text-amber-600" />
                              <span>Awal: {st.previous_score}</span>
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-400 font-mono">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenBreakdownModal(st)}
                          disabled={!st.attempt_id || st.status === 'NOT_STARTED'}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-50 border border-zinc-200 hover:border-emerald-300 text-zinc-700 hover:text-emerald-700 font-semibold text-xs transition shadow-2xs active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                          title={st.status === 'NOT_STARTED' ? 'Siswa belum memulai ujian' : 'Lihat Rincian Analisis Jawaban Siswa per Butir Soal'}
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Lihat Jawaban</span>
                        </button>

                        {/* Tombol Buka Remidi */}
                        {st.status !== 'NOT_STARTED' && (
                          <button
                            type="button"
                            onClick={() => handleOpenRemedialModal(st)}
                            disabled={isOpeningRemedial}
                            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-semibold text-xs transition shadow-2xs active:scale-[0.98] cursor-pointer ${
                              st.is_remedial_allowed
                                ? 'bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 shadow-amber-500/20'
                                : 'bg-white hover:bg-amber-50 border border-amber-200 hover:border-amber-300 text-amber-700'
                            }`}
                            title="Buka akses remidi untuk siswa ini (nilai awal disimpan & sistem otomatis mencatat nilai tertinggi)"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${st.is_remedial_allowed ? 'animate-spin' : 'text-amber-600'}`} />
                            <span>{st.is_remedial_allowed ? 'Remidi Aktif' : 'Buka Remidi'}</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. MODAL DETAIL LEMBAR JAWABAN SISWA                     */}
      {/* ======================================================== */}
      {selectedAttempt && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-zinc-200 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 font-bold shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-zinc-900">
                    Lembar Jawaban: {selectedAttempt.student_name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 mt-0.5 font-medium">
                    <span>NISN: <strong>{selectedAttempt.nisn}</strong></span>
                    <span>•</span>
                    <span>Kelas: <strong>{selectedAttempt.classroom_name}</strong></span>
                    <span>•</span>
                    <span>{sessionResults?.subject_name}</span>
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleCloseBreakdownModal}
                className="p-2 rounded-lg bg-white hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 border border-zinc-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-zinc-50/30">
              {isLoadingBreakdown ? (
                <div className="py-20 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                  <div className="text-xs text-zinc-500 font-medium">Mengambil analisis lembar jawaban siswa...</div>
                </div>
              ) : !breakdownData ? (
                <div className="py-16 text-center space-y-2 text-zinc-400">
                  <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                  <div className="text-xs font-semibold text-zinc-700">Rincian jawaban tidak dapat ditemukan.</div>
                </div>
              ) : (
                <>
                  {/* Score KPI Header Inside Modal */}
                  <div className="bg-white border border-zinc-200/90 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-xl bg-zinc-950 flex flex-col items-center justify-center text-white shrink-0 shadow-xs">
                        <span className="text-2xl font-black font-mono text-emerald-400">
                          {breakdownData.total_score}
                        </span>
                        <span className="text-[9px] uppercase tracking-wider text-zinc-400">Skor Akhir</span>
                      </div>
                      <div>
                        <div className="text-xs text-zinc-400 uppercase font-semibold tracking-wider">Capaian Nilai</div>
                        <div className="text-sm font-bold text-zinc-900 mt-0.5">
                          {breakdownData.total_score} dari {breakdownData.total_max_points || 100} Poin Maksimal
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          Persentase: <strong>{breakdownData.total_max_points ? Math.round((breakdownData.total_score / breakdownData.total_max_points) * 100) : 0}%</strong>
                        </div>
                      </div>
                    </div>

                    {/* Breakdown Badges */}
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                        <div className="text-base font-bold font-mono text-emerald-700">{breakdownData.total_correct ?? 0}</div>
                        <div className="text-[10px] text-emerald-600 font-medium">Benar</div>
                      </div>
                      <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-center">
                        <div className="text-base font-bold font-mono text-rose-700">{breakdownData.total_incorrect ?? 0}</div>
                        <div className="text-[10px] text-rose-600 font-medium">Salah / Belum</div>
                      </div>
                      <div className="px-3 py-2 rounded-lg bg-zinc-100 border border-zinc-200 text-center">
                        <div className="text-base font-bold font-mono text-zinc-800">{breakdownData.total_questions ?? 0}</div>
                        <div className="text-[10px] text-zinc-600 font-medium">Total Soal</div>
                      </div>
                    </div>
                  </div>

                  {/* Filter Tabs Inside Modal */}
                  <div className="flex items-center gap-1 border-b border-zinc-200 pb-2">
                    <button
                      type="button"
                      onClick={() => setBreakdownFilter('ALL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        breakdownFilter === 'ALL'
                          ? 'bg-zinc-900 text-white'
                          : 'bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200'
                      }`}
                    >
                      Semua Soal ({breakdownData.items?.length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBreakdownFilter('CORRECT')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        breakdownFilter === 'CORRECT'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      Benar ({breakdownData.items?.filter((i) => i.status === 'CORRECT' || i.status === 'PARTIAL').length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBreakdownFilter('INCORRECT')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        breakdownFilter === 'INCORRECT'
                          ? 'bg-rose-600 text-white'
                          : 'bg-white hover:bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      Salah ({breakdownData.items?.filter((i) => i.status === 'INCORRECT' || i.status === 'UNANSWERED').length || 0})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBreakdownFilter('ESSAY')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        breakdownFilter === 'ESSAY'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white hover:bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      Esai ({breakdownData.items?.filter((i) => i.question_type === 'ESSAY').length || 0})
                    </button>
                  </div>

                  {/* Question Breakdown List */}
                  <div className="space-y-4">
                    {breakdownData.items
                      ?.filter((item) => {
                        if (breakdownFilter === 'CORRECT') return item.status === 'CORRECT' || item.status === 'PARTIAL';
                        if (breakdownFilter === 'INCORRECT') return item.status === 'INCORRECT' || item.status === 'UNANSWERED';
                        if (breakdownFilter === 'ESSAY') return item.question_type === 'ESSAY';
                        return true;
                      })
                      .map((item, idx) => (
                        <div
                          key={item.question_id || idx}
                          className="bg-white rounded-xl border border-zinc-200/90 p-4 sm:p-5 shadow-2xs space-y-3"
                        >
                          {/* Item Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-zinc-900 text-white font-mono font-bold text-xs flex items-center justify-center">
                                {item.order_number}
                              </span>
                              <span className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">
                                {item.question_type === 'MULTIPLE_CHOICE' && 'Pilihan Ganda'}
                                {item.question_type === 'MULTIPLE_CHOICE_COMPLEX' && 'Pilihan Ganda Kompleks'}
                                {item.question_type === 'SHORT_ANSWER' && 'Isian Singkat'}
                                {item.question_type === 'TRUE_FALSE_MATRIX' && 'Matriks Benar / Salah'}
                                {item.question_type === 'MATCHING_PAIR' && 'Menjodohkan'}
                                {item.question_type === 'ESSAY' && 'Esai / Uraian'}
                              </span>
                            </div>

                            {/* Status Badge */}
                            <div>
                              {item.status === 'CORRECT' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Benar (+{item.earned_points} Poin)</span>
                                </span>
                              )}
                              {item.status === 'PARTIAL' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>Sebagian (+{item.earned_points} Poin)</span>
                                </span>
                              )}
                              {item.status === 'INCORRECT' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <X className="w-3.5 h-3.5" />
                                  <span>Salah (0 Poin)</span>
                                </span>
                              )}
                              {item.status === 'UNANSWERED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                                  <span>Tidak Dijawab (0 Poin)</span>
                                </span>
                              )}
                              {item.status === 'ESSAY_GRADED' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                  <Award className="w-3.5 h-3.5" />
                                  <span>Esai Dinilai (+{item.earned_points} / {item.points} Poin)</span>
                                </span>
                              )}
                              {item.status === 'ESSAY_PENDING' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-violet-50 text-violet-700 border border-violet-200">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Esai Menunggu Koreksi Guru</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Teks Butir Soal (KaTeX Ready) */}
                          <div className="text-xs sm:text-sm font-medium text-zinc-800 leading-relaxed pt-1">
                            <MathText text={item.question_text} />
                          </div>

                          {/* Lampiran Gambar Soal (Jika Ada) */}
                          {(item.image_url || item.imageUrl) && (
                            <div className="pt-2">
                              <div className="inline-block p-2 rounded-xl bg-white border border-zinc-200 shadow-2xs max-w-full">
                                <img
                                  src={resolveImageUrl(item.image_url || item.imageUrl)}
                                  alt={`Gambar Soal Nomor ${item.number || idx + 1}`}
                                  className="max-h-64 sm:max-h-80 w-auto rounded-lg object-contain bg-white block"
                                  loading="lazy"
                                  onError={handleImageErrorFallback}
                                />
                              </div>
                            </div>
                          )}

                          {/* Opsi Pilihan Ganda Visualizer (Jika Pilihan Ganda) */}
                          {item.options && item.options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                              {item.options.map((opt) => {
                                const isCorrect = opt.is_correct;
                                const isChosen = opt.is_chosen;

                                let borderClass = 'border-zinc-200 bg-zinc-50/50 text-zinc-700';
                                if (isCorrect && isChosen) {
                                  borderClass = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold ring-1 ring-emerald-500/30';
                                } else if (isCorrect && !isChosen) {
                                  borderClass = 'border-emerald-300 bg-emerald-50/60 text-emerald-800';
                                } else if (!isCorrect && isChosen) {
                                  borderClass = 'border-rose-400 bg-rose-50 text-rose-900 line-through';
                                }

                                return (
                                  <div
                                    key={opt.id}
                                    className={`p-2.5 rounded-lg border text-xs flex flex-col gap-2 ${borderClass}`}
                                  >
                                    <div className="flex items-start gap-2 w-full">
                                      <span className="font-bold shrink-0">{opt.label}.</span>
                                      <div className="flex-1">
                                        <MathText text={opt.text} />
                                      </div>
                                      {isChosen && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-900 text-white shrink-0">
                                          Pilihan Siswa
                                        </span>
                                      )}
                                      {isCorrect && !isChosen && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-600 text-white shrink-0">
                                          Kunci
                                        </span>
                                      )}
                                    </div>
                                    {(opt.image_url || opt.imageUrl) && (
                                      <div className="mt-1 pl-5">
                                        <div className="inline-block p-1.5 rounded-lg bg-white border border-zinc-200 shadow-2xs max-w-full">
                                          <img
                                            src={resolveImageUrl(opt.image_url || opt.imageUrl)}
                                            alt={`Gambar Opsi ${opt.label}`}
                                            className="max-h-40 w-auto rounded object-contain bg-white block"
                                            loading="lazy"
                                            onError={handleImageErrorFallback}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Lembar Perbandingan Jawaban Siswa vs Kunci Sistem */}
                          <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-xs space-y-2 mt-2">
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-zinc-500 min-w-28 shrink-0">Jawaban Siswa:</span>
                              <span className={`font-semibold ${
                                item.status === 'CORRECT' 
                                  ? 'text-emerald-700' 
                                  : item.status === 'INCORRECT' 
                                    ? 'text-rose-600' 
                                    : 'text-zinc-800'
                              }`}>
                                {item.student_answer_display}
                              </span>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-zinc-500 min-w-28 shrink-0">Kunci Jawaban:</span>
                              <span className="font-semibold text-emerald-800">
                                {item.correct_answer_display}
                              </span>
                            </div>
                            {item.feedback && (
                              <div className="flex items-start gap-2 pt-1 border-t border-zinc-200/80">
                                <span className="font-bold text-blue-600 min-w-28 shrink-0">Catatan Guru:</span>
                                <span className="text-zinc-700 italic">{item.feedback}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-zinc-200 bg-zinc-50 flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                Tekan tombol di kanan untuk menutup lembar analisis.
              </span>
              <button
                type="button"
                onClick={handleCloseBreakdownModal}
                className="px-5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition active:scale-[0.98]"
              >
                Tutup Lembar Jawaban
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODAL KONFIRMASI BUKA REMIDI SISWA                   */}
      {/* ======================================================== */}
      {remedialStudent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-zinc-200 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-100 bg-amber-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 font-bold shrink-0">
                  <RotateCcw className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">
                    Buka Akses Remidi Siswa
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Konfirmasi pembukaan sesi remedial mandiri
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseRemedialModal}
                disabled={isOpeningRemedial}
                className="w-8 h-8 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Card Siswa */}
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-zinc-900 text-sm">{remedialStudent.student_name}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    Nilai Awal: {remedialStudent.total_score ?? remedialStudent.previous_score ?? 0}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-zinc-500 font-mono text-[11px]">
                  <span>NISN: <strong>{remedialStudent.nisn}</strong></span>
                  <span>•</span>
                  <span>Kelas: <strong>{remedialStudent.classroom_name}</strong></span>
                </div>
              </div>

              {/* Ketentuan Remidi */}
              <div className="space-y-2">
                <div className="font-semibold text-zinc-800 flex items-center gap-1.5 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Ketentuan Otomatisasi Sistem Remidi:</span>
                </div>
                <ul className="space-y-2 text-zinc-600 pl-5 list-disc leading-relaxed text-[11px]">
                  <li>
                    Siswa diizinkan masuk dan mengerjakan kembali lembar asesmen ini melalui ExamBrowser.
                  </li>
                  <li>
                    <strong className="text-emerald-700">Pembersihan Pelanggaran:</strong> Seluruh catatan pelanggaran sensor siswa pada sesi ini di-reset menjadi <strong>0 Bersih</strong> dan disinkronkan ke E-Jurnal Guru.
                  </li>
                  <li>
                    <strong className="text-amber-700">Prinsip Nilai Tertinggi:</strong> Sistem menyimpan nilai awal siswa (<strong>{remedialStudent.total_score ?? remedialStudent.previous_score ?? 0}</strong>). Jika perolehan nilai remidi lebih rendah dari nilai awal, sistem secara otomatis <strong>tetap mengambil dan mencatat nilai yang paling tinggi</strong>.
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCloseRemedialModal}
                disabled={isOpeningRemedial}
                className="px-4 py-2 rounded-xl border border-zinc-300 text-zinc-700 font-semibold text-xs hover:bg-white transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmOpenRemedial}
                disabled={isOpeningRemedial}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-2xs transition cursor-pointer disabled:opacity-60"
              >
                {isOpeningRemedial ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Membuka Remidi...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Ya, Buka Remidi</span>
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
