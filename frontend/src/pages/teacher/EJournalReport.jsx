import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import StatusBadge from '../../components/common/StatusBadge';
import { ejournalApi } from '../../api/ejournalApi';
import { examApi } from '../../api/examApi';
import { getClassroomsApi } from '../../api/authApi';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  Save, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Building2, 
  Calendar, 
  Clock, 
  UserCheck, 
  Check, 
  FileText, 
  ShieldCheck,
  RefreshCw,
  FileDown,
  FolderKanban,
  School,
  Filter,
  Search,
  Award,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  BookOpen
} from 'lucide-react';

export default function EJournalReport() {
  const navigate = useNavigate();
  const { 
    examSessions, 
    examPackages,
    saveSupervisorNotes, 
    currentUser, 
    schoolSettings, 
    fetchSchoolSettings,
    fetchPackages,
    fetchSessions
  } = useExamStore();

  const [allSessions, setAllSessions] = useState([]);
  const [allPackages, setAllPackages] = useState([]);
  const [allClassrooms, setAllClassrooms] = useState([]);

  // Multi-level Filtering
  const [selectedPackageFilter, setSelectedPackageFilter] = useState('ALL');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [journalData, setJournalData] = useState(null);
  const [notes, setNotes] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // 1. Ambil seluruh data sesi, paket, kelas, dan pengaturan sekolah dari backend
  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        fetchSchoolSettings?.();
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
        console.warn('Gagal memuat data awal E-Jurnal:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [fetchSchoolSettings]);

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

  // 3. Sesi aktif yang sedang dilihat
  const currentSession = useMemo(() => {
    if (!selectedSessionId) return filteredSessions[0] || allSessions[0] || null;
    return allSessions.find((s) => s.id === selectedSessionId) || filteredSessions[0] || null;
  }, [selectedSessionId, allSessions, filteredSessions]);

  // 4. Ambil detail E-Jurnal dari backend saat sesi aktif berubah
  useEffect(() => {
    const fetchJournal = async () => {
      if (!currentSession?.id) {
        setJournalData(null);
        setNotes('');
        return;
      }
      setIsLoading(true);
      try {
        const data = await ejournalApi.getJournal(currentSession.id);
        if (data) {
          setJournalData(data);
          setNotes(data.supervisor_notes || '');
        }
      } catch (err) {
        console.warn('Gagal ambil data E-Jurnal backend:', err);
        setJournalData(null);
        setNotes(currentSession?.supervisorNotes || currentSession?.supervisor_notes || '');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJournal();
  }, [currentSession]);

  // Simpan Catatan Berita Acara
  const handleSaveNotes = async () => {
    if (!currentSession?.id) return;
    setIsSaved(false);

    try {
      await ejournalApi.updateSupervisorNotes(currentSession.id, notes);
    } catch (err) {
      console.warn('Fallback save notes:', err);
    }

    saveSupervisorNotes(currentSession.id, notes);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  // Unduh PDF Resmi Berita Acara
  const handleExportPDF = async () => {
    if (!currentSession?.id) return;
    setIsExportingPdf(true);
    try {
      const clsName = currentSession.classroom_name || currentSession.classroom || 'Kelas';
      const subjName = (currentSession.subject_name || currentSession.subjectName || 'Ujian').replace(/\s+/g, '_');
      await ejournalApi.downloadPdf(
        currentSession.id,
        `Berita_Acara_${clsName}_${subjName}.pdf`
      );
    } catch (err) {
      console.warn('Gagal export PDF backend, fallback ke print browser:', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Unduh Excel Resmi Rekapitulasi Nilai & Pelanggaran
  const handleExportExcel = async () => {
    if (!currentSession?.id) return;
    setIsExportingExcel(true);
    try {
      const clsName = currentSession.classroom_name || currentSession.classroom || 'Kelas';
      const subjName = (currentSession.subject_name || currentSession.subjectName || 'Ujian').replace(/\s+/g, '_');
      await ejournalApi.downloadExcel(
        currentSession.id,
        `Rekap_Nilai_${clsName}_${subjName}.xlsx`
      );
    } catch (err) {
      console.warn('Gagal export Excel via backend:', err);
      alert('Gagal mengunduh Excel dari backend.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Daftar data kehadiran & nilai siswa
  const attendanceList = useMemo(() => {
    if (journalData && Array.isArray(journalData.attendance_records)) {
      return journalData.attendance_records;
    }
    return [];
  }, [journalData]);

  const filteredAttendance = useMemo(() => {
    if (!searchQuery.trim()) return attendanceList;
    const q = searchQuery.toLowerCase();
    return attendanceList.filter((s) => 
      (s.student_name && s.student_name.toLowerCase().includes(q)) ||
      (s.nisn && s.nisn.toLowerCase().includes(q))
    );
  }, [attendanceList, searchQuery]);

  const violationList = useMemo(() => {
    if (journalData && Array.isArray(journalData.violation_records)) {
      return journalData.violation_records;
    }
    return [];
  }, [journalData]);

  // Hitung Nilai Rata-Rata, Tertinggi, dan Terendah
  const validScores = attendanceList
    .map((s) => (s.total_score !== null && s.total_score !== undefined ? Number(s.total_score) : null))
    .filter((score) => score !== null && !isNaN(score));

  const averageScore = validScores.length > 0 
    ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
    : '-';
  const highestScore = validScores.length > 0 ? Math.max(...validScores).toFixed(0) : '-';
  const lowestScore = validScores.length > 0 ? Math.min(...validScores).toFixed(0) : '-';

  const totalScheduled = journalData ? journalData.total_students_scheduled : 0;
  const presentStudents = journalData ? journalData.total_students_present : attendanceList.length;
  const absentStudents = journalData ? journalData.total_students_absent : Math.max(0, totalScheduled - presentStudents);
  const totalViolations = journalData ? journalData.total_violations_recorded : violationList.length;

  // Nama Pengawas & Pejabat Sekolah
  const displaySchool = schoolSettings || {
    name: 'MIS RISALAH',
    sub_header: 'KEMENTERIAN AGAMA REPUBLIK INDONESIA',
    address: 'Jl. Raya Karangampel No. 45',
    phone: '(0234) 123456',
    email: 'info@mis-risalah.sch.id',
    principal_name: "H. Ahmad Syafi'i, M.Pd.I",
    principal_nip: '197508102003121002',
    city: 'Indramayu',
    academic_year: '2026/2027',
  };

  const teacherName = journalData?.teacher_name || currentUser?.fullName || currentUser?.full_name || 'Guru Pengawas';
  const teacherNip = currentUser?.username || '198507122010011002';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ======================================================== */}
      {/* 1. HEADER HALAMAN & TOMBOL EKSPOR */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                E-Jurnal & Rekapitulasi Nilai Ujian
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Dokumentasi resmi kehadiran, rekapitulasi nilai per kelas, log sensor anti-cheat, dan unduh PDF/Excel.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Ekspor Resmi (Responsive on Mobile) */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleExportPDF}
            disabled={isExportingPdf || !currentSession}
            className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm shadow-indigo-600/30 disabled:opacity-50"
            title="Unduh Berita Acara Format PDF Resmi"
          >
            <FileDown className="w-4 h-4" />
            <span>{isExportingPdf ? 'Membuat PDF...' : 'Unduh Berita Acara (PDF)'}</span>
          </button>

          <button
            onClick={handleExportExcel}
            disabled={isExportingExcel || !currentSession}
            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/30 disabled:opacity-50"
            title="Ekspor Rekapitulasi Nilai Format Excel .xlsx"
          >
            <Download className="w-4 h-4" />
            <span>{isExportingExcel ? 'Membuat Excel...' : 'Ekspor Rekap (Excel .xlsx)'}</span>
          </button>

          <button
            onClick={() => window.print()}
            disabled={!currentSession}
            className="hidden sm:flex p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition disabled:opacity-50 items-center justify-center"
            title="Cetak Langsung Lembar Dokumen (Print Preview)"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. FILTER MULTI-LEVEL (PAKET SOAL, KELAS, & SESI UJIAN) */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 print:hidden">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>Pilih Paket Soal, Rombel Kelas, & Sesi Ujian</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Ditemukan {filteredSessions.length} sesi asesmen
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Filter 1: Paket Soal */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Filter Paket Soal:
            </label>
            <select
              value={selectedPackageFilter}
              onChange={(e) => setSelectedPackageFilter(e.target.value)}
              className="w-full text-xs font-semibold rounded-xl border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 py-2 bg-slate-50 text-slate-800"
            >
              <option value="ALL">Semua Paket Soal ({allPackages.length})</option>
              {allPackages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.subject_name || pkg.subjectName} — {pkg.title}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 2: Kelas / Rombel */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Filter Kelas / Rombel:
            </label>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="w-full text-xs font-semibold rounded-xl border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 py-2 bg-slate-50 text-slate-800"
            >
              <option value="ALL">Semua Kelas</option>
              {allClassrooms.map((cls) => (
                <option key={cls.id} value={cls.name}>
                  {cls.name} ({cls.academic_year || 'Aktif'})
                </option>
              ))}
            </select>
          </div>

          {/* Filter 3: Sesi Ujian Spesifik */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
              Pilih Sesi Ujian Terbuka:
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              disabled={filteredSessions.length === 0}
              className="w-full text-xs font-bold rounded-xl border-indigo-300 focus:border-indigo-500 focus:ring-indigo-500 py-2 bg-indigo-50/50 text-indigo-950 disabled:bg-slate-100 disabled:text-slate-400"
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
      {/* 3. JIKA TIDAK ADA SESI / BELUM MEMBUKA SESI (EMPTY STATE) */}
      {/* ======================================================== */}
      {!currentSession ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-800">Belum Ada Sesi Ujian yang Dipilih</h3>
            <p className="text-xs text-slate-500">
              Silakan jadwalkan atau buka sesi ujian terlebih dahulu pada menu Jadwal & Sesi Ujian agar rekapitulasi nilai dan lembar berita acara dapat diakses.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate('/teacher/sessions')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 transition inline-flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              <span>Buka Menu Jadwal & Sesi Ujian</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* ======================================================== */}
          {/* 4. 4 KARTU RINGKASAN REKAPITULASI KELAS (KPI CARDS) */}
          {/* ======================================================== */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 print:hidden">
            {/* Kartu 1: Total Terjadwal */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Peserta</div>
                <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">{totalScheduled} Siswa</div>
                <div className="text-[10px] text-slate-400">Kelas {currentSession.classroom_name || currentSession.classroom}</div>
              </div>
            </div>

            {/* Kartu 2: Hadir Mengerjakan */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Hadir / Selesai</div>
                <div className="text-lg sm:text-xl font-black text-emerald-700 mt-0.5">{presentStudents} Siswa</div>
                <div className="text-[10px] text-slate-400">{absentStudents} siswa belum hadir</div>
              </div>
            </div>

            {/* Kartu 3: Rata-Rata Nilai */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">Rata-Rata Kelas</div>
                <div className="text-lg sm:text-xl font-black text-indigo-950 mt-0.5">{averageScore} Poin</div>
                <div className="text-[10px] text-slate-400">Tertinggi: {highestScore} • Terendah: {lowestScore}</div>
              </div>
            </div>

            {/* Kartu 4: Total Insiden Pelanggaran */}
            <div className={`bg-white rounded-2xl p-4 border shadow-sm flex items-center gap-3.5 ${
              totalViolations > 0 ? 'border-amber-300 bg-amber-50/30' : 'border-slate-200/90'
            }`}>
              <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-amber-800 font-bold uppercase tracking-wider">Sensor Anti-Cheat</div>
                <div className="text-lg sm:text-xl font-black text-amber-900 mt-0.5">{totalViolations} Insiden</div>
                <div className="text-[10px] text-slate-500">Zero-Tolerance Active</div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 5. LEMBAR BERITA ACARA RESMI (KERTAS A4 STYLE) */}
          {/* ======================================================== */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 sm:p-10 max-w-5xl mx-auto space-y-8 text-slate-800">
            {/* KOP SURAT SEKOLAH DINAMIS */}
            <div className="border-b-2 border-slate-900 pb-5 text-center relative">
              {displaySchool.sub_header && (
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {displaySchool.sub_header}
                </div>
              )}
              <h2 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight mt-1 uppercase">
                {displaySchool.name || 'MIS RISALAH'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-1 leading-relaxed">
                {[
                  displaySchool.address,
                  displaySchool.phone ? `Telp: ${displaySchool.phone}` : null,
                  displaySchool.email ? `Email: ${displaySchool.email}` : null
                ].filter(Boolean).join(' • ')}
              </p>
            </div>

            {/* JUDUL DOKUMEN BERITA ACARA */}
            <div className="text-center space-y-1">
              <h3 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-wide underline underline-offset-4 decoration-indigo-600">
                Berita Acara & E-Jurnal Pelaksanaan Asesmen Sekolah
              </h3>
              <p className="text-xs text-slate-500">
                Tahun Ajaran {displaySchool.academic_year || currentSession.classroom_academic_year || '2026/2027'} • Protokol Zero-Tolerance Lockdown Anti-Cheat
              </p>
            </div>

            {/* INFORMASI METADATA ASESMEN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200/80">
              <div className="space-y-2">
                <div className="flex">
                  <span className="w-32 text-slate-500 font-medium">Mata Pelajaran:</span>
                  <span className="font-extrabold text-slate-900">{currentSession.subject_name || currentSession.subjectName}</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-slate-500 font-medium">Kelas / Rombel:</span>
                  <span className="font-extrabold text-slate-900">{currentSession.classroom_name || currentSession.classroom}</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-slate-500 font-medium">Judul Paket Soal:</span>
                  <span className="font-semibold text-indigo-700">{currentSession.title}</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-slate-500 font-medium">Tipe Pengerjaan:</span>
                  <span className="font-medium text-slate-800 flex items-center gap-1.5">
                    {(currentSession.exam_type === 'EXTERNAL_LINK' || currentSession.examType === 'EXTERNAL_LINK') ? (
                      <>
                        <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
                        <span>Formulir Terproteksi (Google Form)</span>
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Soal Mandiri (Pilihan Ganda & Esai)</span>
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex">
                  <span className="w-32 text-slate-500 font-medium">Hari / Tanggal:</span>
                  <span className="font-semibold text-slate-800">
                    {currentSession.start_time 
                      ? new Date(currentSession.start_time).toLocaleDateString('id-ID', { dateStyle: 'full' }) 
                      : (currentSession.date || new Date().toLocaleDateString('id-ID', { dateStyle: 'full' }))}
                  </span>
                </div>
                <div className="flex">
                  <span className="w-32 text-slate-500 font-medium">Waktu Sesi:</span>
                  <span className="font-semibold text-slate-800">
                    {currentSession.startTime || (currentSession.start_time?.includes('T') ? currentSession.start_time.split('T')[1].substring(0, 5) : '08:00')} - {currentSession.endTime || (currentSession.end_time?.includes('T') ? currentSession.end_time.split('T')[1].substring(0, 5) : '09:30')} WIB ({currentSession.duration_minutes || currentSession.durationMinutes || 60} Menit)
                  </span>
                </div>
                <div className="flex">
                  <span className="w-32 text-slate-500 font-medium">Guru Pengawas:</span>
                  <span className="font-bold text-indigo-900">{teacherName}</span>
                </div>
                <div className="flex">
                  <span className="w-32 text-slate-500 font-medium">Status Keamanan:</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Terverifikasi Zero-Tolerance Lockdown
                  </span>
                </div>
              </div>
            </div>

            {/* TABEL 1: REKAPITULASI PRESENSI & NILAI HASIL ASESMEN */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span>1. Rekapitulasi Presensi & Nilai Hasil Asesmen</span>
                  <span className="text-xs font-normal text-slate-500">
                    ({attendanceList.length} siswa terekam)
                  </span>
                </h4>

                {/* Search Bar Siswa (Hidden in Print) */}
                <div className="relative print:hidden sm:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari nama / NISN..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 text-center w-10">No</th>
                      <th className="py-2.5 px-3">NISN</th>
                      <th className="py-2.5 px-3">Nama Lengkap Siswa</th>
                      <th className="py-2.5 px-3 text-center">Waktu Mulai</th>
                      <th className="py-2.5 px-3 text-center">Waktu Selesai</th>
                      <th className="py-2.5 px-3 text-center">Pelanggaran</th>
                      <th className="py-2.5 px-3 text-center">Status Pengerjaan</th>
                      <th className="py-2.5 px-3 text-right">Nilai Akhir</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAttendance.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-8 text-center text-slate-400 text-xs">
                          {searchQuery 
                            ? 'Tidak ada siswa yang sesuai dengan kata kunci pencarian.'
                            : 'Belum ada siswa yang terekam pengerjaannya pada sesi ini.'}
                        </td>
                      </tr>
                    ) : (
                      filteredAttendance.map((s, idx) => {
                        const studentName = s.student_name || s.fullName || 'Siswa';
                        const nisn = s.nisn || '-';
                        const started = s.started_at 
                          ? (typeof s.started_at === 'string' && s.started_at.includes('T') ? new Date(s.started_at).toLocaleTimeString('id-ID') : s.started_at) 
                          : (s.startedAt || '-');
                        const finished = s.finished_at 
                          ? (typeof s.finished_at === 'string' && s.finished_at.includes('T') ? new Date(s.finished_at).toLocaleTimeString('id-ID') : s.finished_at) 
                          : (s.finishedAt || (s.status === 'SUBMITTED' ? 'Selesai' : 'Sedang Ujian'));
                        const violations = s.violation_count !== undefined ? s.violation_count : (s.violationCount || 0);
                        const score = s.total_score !== undefined ? s.total_score : s.score;

                        return (
                          <tr key={s.student_id || s.studentId || idx} className="hover:bg-slate-50 transition">
                            <td className="py-2 px-3 text-center font-medium text-slate-500">{idx + 1}</td>
                            <td className="py-2 px-3 font-mono text-slate-600">{nisn}</td>
                            <td className="py-2 px-3 font-bold text-slate-900">{studentName}</td>
                            <td className="py-2 px-3 text-center text-slate-600">{started}</td>
                            <td className="py-2 px-3 text-center text-slate-600">{finished}</td>
                            <td className="py-2 px-3 text-center font-bold">
                              <span className={violations > 0 ? 'text-red-600 font-extrabold' : 'text-slate-400 font-normal'}>
                                {violations}x
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center">
                              <StatusBadge status={s.status} />
                            </td>
                            <td className="py-2 px-3 text-right font-black text-indigo-700 text-sm">
                              {score !== null && score !== undefined ? (
                                <span>{Number(score).toFixed(0)}</span>
                              ) : (
                                <span className="text-slate-400 font-normal text-xs">Belum Ada</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TABEL 2: LOG CATATAN PELANGGARAN SENSOR ANTI-CHEAT */}
            <div className="space-y-3">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span>2. Catatan Integritas Ujian & Insiden Sensor Anti-Cheat</span>
              </h4>

              {violationList.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-red-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-red-50 text-red-900 font-bold uppercase text-[10px] tracking-wider border-b border-red-200">
                      <tr>
                        <th className="py-2 px-3 text-center w-10">No</th>
                        <th className="py-2 px-3">Nama Siswa</th>
                        <th className="py-2 px-3 text-center">NISN</th>
                        <th className="py-2 px-3 text-center">Jenis Pelanggaran</th>
                        <th className="py-2 px-3">Keterangan Sensor</th>
                        <th className="py-2 px-3 text-center">Waktu Deteksi</th>
                        <th className="py-2 px-3 text-center">Status Buka Kunci</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100 bg-red-50/20">
                      {violationList.map((v, idx) => (
                        <tr key={v.id || idx}>
                          <td className="py-2 px-3 text-center font-bold text-red-700">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{v.student_name}</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-600">{v.nisn}</td>
                          <td className="py-2 px-3 text-center">
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold text-[10px]">
                              {v.violation_type_label || v.violation_type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-700">{v.description}</td>
                          <td className="py-2 px-3 text-center font-mono text-slate-600">
                            {v.detected_at ? new Date(v.detected_at).toLocaleTimeString('id-ID') : '-'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {v.unlocked_at ? (
                              <span className="text-emerald-700 font-bold text-[10px] flex items-center justify-center gap-1">
                                <Check className="w-3 h-3" /> Dibuka [{new Date(v.unlocked_at).toLocaleTimeString('id-ID')}]
                              </span>
                            ) : (
                              <span className="text-red-700 font-bold text-[10px]">Terkunci</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Seluruh peserta ujian menaati tata tertib Zero-Tolerance Lockdown. Tidak ada indikasi kecurangan perpindahan tab atau aplikasi yang terdeteksi.
                  </span>
                </div>
              )}
            </div>

            {/* BAGIAN 3: CATATAN KEJADIAN PENTING PENGAWAS UJIAN */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <span>3. Catatan Kejadian Penting Pengawas Ujian</span>
                </h4>
                {isSaved && (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 animate-pulse">
                    <Check className="w-4 h-4" /> Catatan Tersimpan ke Database!
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ketik catatan pengawas jalannya asesmen, insiden khusus, kendala teknis listrik/jaringan, atau rekomendasi..."
                  className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-800 print:bg-transparent print:border-none print:p-0"
                />
                <div className="flex justify-end print:hidden">
                  <button
                    onClick={handleSaveNotes}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Catatan Berita Acara</span>
                  </button>
                </div>
              </div>
            </div>

            {/* BAGIAN 4: LEMBAR PENGESAHAN & TANDA TANGAN */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
              <div>
                <div className="text-slate-500">Mengetahui,</div>
                <div className="font-extrabold text-slate-900 mt-0.5">
                  Kepala {displaySchool.name || 'Sekolah'}
                </div>
                <div className="h-16 flex items-center justify-center text-slate-300 italic text-[10px]">
                  (Tanda Tangan & Cap Resmi)
                </div>
                <div className="font-bold text-slate-900 underline">
                  {displaySchool.principal_name || 'H. Ahmad Syafi\'i, M.Pd.I'}
                </div>
                <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                  {displaySchool.principal_nip ? `NIP. ${displaySchool.principal_nip}` : '-'}
                </div>
              </div>

              <div>
                <div className="text-slate-500">
                  {displaySchool.city || 'Indramayu'}, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                <div className="font-extrabold text-slate-900 mt-0.5">
                  Guru Pengawas Ujian
                </div>
                <div className="h-16 flex items-center justify-center text-slate-300 italic text-[10px]">
                  (Tanda Tangan)
                </div>
                <div className="font-bold text-slate-900 underline">
                  {teacherName}
                </div>
                <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                  NIP. {teacherNip}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
