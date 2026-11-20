import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileCheck, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Save, 
  ChevronRight, 
  ChevronLeft, 
  User, 
  Sparkles, 
  MessageSquare, 
  Award, 
  BookOpen, 
  RefreshCw, 
  ArrowLeft,
  Filter,
  Check,
  CheckCircle,
  Users,
  Edit3,
  X
} from 'lucide-react';
import { 
  getSessionsApi, 
  getPackagesApi, 
  getEssaySubmissionsApi, 
  saveEssayGradeApi 
} from '../../api/examApi';
import { getClassroomsApi } from '../../api/authApi';
import MathText from '../../components/common/MathText';
import { resolveImageUrl, handleImageErrorFallback } from '../../utils/imageUrlFormatter';

export default function EssayGrading() {
  // Master Filter Options
  const [packages, setPackages] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [isLoadingFilters, setIsLoadingFilters] = useState(true);

  // Selected Filter States
  const [selectedPackageId, setSelectedPackageId] = useState('ALL');
  const [selectedClassId, setSelectedClassId] = useState('ALL');
  const [selectedSessionId, setSelectedSessionId] = useState('');

  // Submissions Data for Selected Session
  const [submissionData, setSubmissionData] = useState(null);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [loadErrorMsg, setLoadErrorMsg] = useState('');

  // Table Controls
  const [studentSearch, setStudentSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, PENDING, COMPLETED

  // Selected Student for Grading Sheet (Modal / Detail View)
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Local Form State for Grades: { [questionId]: { score: number|string, feedback: string } }
  const [gradeInputs, setGradeInputs] = useState({});
  const [savingQuestionId, setSavingQuestionId] = useState(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  // -------------------------------------------------------------
  // 1. FETCH MASTER FILTERS (PAKET, KELAS, DAN SESI)
  // -------------------------------------------------------------
  const fetchFilterData = useCallback(async () => {
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

      setSessions(sessList);
      setPackages(pkgList);
      setClassrooms(clsList);

      if (sessList.length > 0 && !selectedSessionId) {
        setSelectedSessionId(sessList[0].id);
      }
    } catch (err) {
      console.error('Gagal mengambil master data filter:', err);
    } finally {
      setIsLoadingFilters(false);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    fetchFilterData();
  }, [fetchFilterData]);

  // Lock scroll background browser saat modal lembar koreksi esai aktif
  useEffect(() => {
    if (selectedStudent) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedStudent]);

  // -------------------------------------------------------------
  // 2. FILTER SESI UJIAN BERJENJANG BERDASARKAN PAKET & KELAS
  // -------------------------------------------------------------
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      // 1. Filter Paket Soal
      if (selectedPackageId !== 'ALL') {
        const sPkgId = s.package?.id || s.package_id || s.packageId;
        if (sPkgId && String(sPkgId) !== String(selectedPackageId)) return false;
      }

      // 2. Filter Kelas
      if (selectedClassId !== 'ALL') {
        if (s.is_all_classrooms || s.allow_all_classes || s.allowAllClasses) return true;
        const multiClassIds = Array.isArray(s.classrooms) ? s.classrooms.map((c) => String(c?.id || c || '')) : [];
        const singleClassId = s.classroom?.id ? String(s.classroom.id) : (s.classroom_id ? String(s.classroom_id) : null);
        const matchClass = multiClassIds.includes(String(selectedClassId)) || singleClassId === String(selectedClassId);
        if (!matchClass) return false;
      }

      return true;
    });
  }, [sessions, selectedPackageId, selectedClassId]);

  // Sinkronisasi Sesi Terpilih ketika dropdown Paket / Kelas berubah
  useEffect(() => {
    if (filteredSessions.length > 0) {
      if (!filteredSessions.some((s) => String(s.id) === String(selectedSessionId))) {
        setSelectedSessionId(filteredSessions[0].id);
      }
    } else {
      setSelectedSessionId('');
    }
  }, [filteredSessions, selectedSessionId]);

  // -------------------------------------------------------------
  // 3. FETCH DATA SUBMISSIONS ESAI SESI TERPILIH
  // -------------------------------------------------------------
  const fetchSubmissions = useCallback(async (sessionId, classId = selectedClassId) => {
    if (!sessionId) {
      setSubmissionData(null);
      return;
    }

    setIsLoadingSubmissions(true);
    setLoadErrorMsg('');
    try {
      const clsParam = (classId && classId !== 'ALL') ? classId : null;
      const res = await getEssaySubmissionsApi(sessionId, clsParam);
      const studentList = res.students || res.submissions || [];
      const questionsList = res.essay_questions || [];

      // Normalisasi jawaban siswa agar kompatibel object dan array
      const normalizedStudents = studentList.map((st) => {
        let answersMap = {};
        if (st.answers && typeof st.answers === 'object' && !Array.isArray(st.answers)) {
          answersMap = { ...st.answers };
        } else if (Array.isArray(st.answers)) {
          st.answers.forEach((ans) => {
            if (ans?.question_id) answersMap[ans.question_id] = ans;
          });
        } else if (Array.isArray(st.answers_list)) {
          st.answers_list.forEach((ans) => {
            if (ans?.question_id) answersMap[ans.question_id] = ans;
          });
        }

        const totalEssays = questionsList.length;
        const gradedCount = questionsList.filter((q) => {
          const a = answersMap[q.id];
          return a && a.score !== null && a.score !== undefined;
        }).length;

        const isFullyGraded = totalEssays > 0 ? (gradedCount >= totalEssays) : true;

        return {
          ...st,
          answers: answersMap,
          total_essays: totalEssays,
          graded_count: gradedCount,
          is_fully_graded: isFullyGraded
        };
      });

      setSubmissionData({
        ...res,
        students: normalizedStudents,
        essay_questions: questionsList
      });

      // Update selectedStudent jika sedang membuka detail
      setSelectedStudent((prev) => {
        if (!prev) return null;
        return normalizedStudents.find((s) => s.student_id === prev.student_id) || null;
      });
    } catch (err) {
      console.error('Gagal memuat jawaban esai siswa:', err);
      setLoadErrorMsg(err.response?.data?.error || 'Gagal memuat lembar jawaban esai sesi ini.');
      setSubmissionData(null);
    } finally {
      setIsLoadingSubmissions(false);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (selectedSessionId) {
      fetchSubmissions(selectedSessionId, selectedClassId);
    } else {
      setSubmissionData(null);
    }
  }, [selectedSessionId, selectedClassId, fetchSubmissions]);

  // -------------------------------------------------------------
  // 4. STATISTIK RINGKAS
  // -------------------------------------------------------------
  const stats = useMemo(() => {
    if (!submissionData?.students) {
      return { total: 0, pending: 0, completed: 0, totalQuestions: 0 };
    }
    const total = submissionData.students.length;
    const completed = submissionData.students.filter((s) => s.is_fully_graded).length;
    const pending = total - completed;
    const totalQuestions = submissionData.essay_questions?.length || 0;
    return { total, pending, completed, totalQuestions };
  }, [submissionData]);

  // -------------------------------------------------------------
  // 5. FILTER TABEL SISWA (PENCARIAN & TAB STATUS)
  // -------------------------------------------------------------
  const filteredStudents = useMemo(() => {
    if (!submissionData?.students) return [];
    return submissionData.students.filter((std) => {
      // Filter Pencarian Teks
      if (studentSearch.trim()) {
        const q = studentSearch.toLowerCase();
        const matchName = std.student_name?.toLowerCase().includes(q);
        const matchNisn = std.nisn?.toLowerCase().includes(q);
        const matchClass = std.classroom?.toLowerCase().includes(q);
        if (!matchName && !matchNisn && !matchClass) return false;
      }

      // Filter Status Tab
      if (filterStatus === 'PENDING') return !std.is_fully_graded;
      if (filterStatus === 'COMPLETED') return std.is_fully_graded;
      return true;
    });
  }, [submissionData, studentSearch, filterStatus]);

  // -------------------------------------------------------------
  // 6. FORM PENILAIAN SISWA TERPILIH (SYNC INPUTS)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!selectedStudent || !submissionData?.essay_questions) {
      setGradeInputs({});
      return;
    }
    const initial = {};
    submissionData.essay_questions.forEach((q) => {
      const ans = selectedStudent.answers?.[q.id];
      initial[q.id] = {
        score: ans?.score !== undefined && ans?.score !== null ? ans.score : '',
        feedback: ans?.feedback || ''
      };
    });
    setGradeInputs(initial);
    setSaveSuccessMsg('');
    setSaveErrorMsg('');
  }, [selectedStudent, submissionData]);

  const handleScoreChange = (questionId, val, maxScore) => {
    const num = val === '' ? '' : Math.min(Math.max(0, parseFloat(val) || 0), maxScore);
    setGradeInputs((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        score: num
      }
    }));
  };

  const handleFeedbackChange = (questionId, text) => {
    setGradeInputs((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        feedback: text
      }
    }));
  };

  // Simpan nilai esai untuk 1 soal ke backend
  const handleSaveGrade = async (questionId, maxScore) => {
    if (!selectedStudent || !selectedSessionId) return;
    const input = gradeInputs[questionId];
    if (input === undefined || input.score === '') {
      setSaveErrorMsg('Harap berikan skor angka sebelum menyimpan.');
      return;
    }

    setSavingQuestionId(questionId);
    setSaveErrorMsg('');
    setSaveSuccessMsg('');
    try {
      const payload = {
        attempt_id: selectedStudent.attempt_id,
        student_id: selectedStudent.student_id,
        question_id: questionId,
        score: parseFloat(input.score) || 0,
        feedback: input.feedback || ''
      };

      const res = await saveEssayGradeApi(selectedSessionId, payload);
      setSaveSuccessMsg(res.message || 'Nilai esai berhasil disimpan.');

      // Refresh data lokal tanpa reload penuh
      await fetchSubmissions(selectedSessionId, selectedClassId);
    } catch (err) {
      console.error('Gagal menyimpan nilai esai:', err);
      setSaveErrorMsg(err.response?.data?.error || 'Gagal menyimpan nilai esai.');
    } finally {
      setSavingQuestionId(null);
    }
  };

  // Navigasi Antar Siswa di Lembar Koreksi
  const currentStudentIndex = filteredStudents.findIndex((s) => s.student_id === selectedStudent?.student_id);

  const handleNextStudent = () => {
    if (currentStudentIndex < filteredStudents.length - 1) {
      setSelectedStudent(filteredStudents[currentStudentIndex + 1]);
    }
  };

  const handlePrevStudent = () => {
    if (currentStudentIndex > 0) {
      setSelectedStudent(filteredStudents[currentStudentIndex - 1]);
    }
  };

  // Helper info sesi aktif
  const currentSessionObj = useMemo(() => {
    return sessions.find((s) => String(s.id) === String(selectedSessionId)) || null;
  }, [sessions, selectedSessionId]);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ======================================================== */}
      {/* 1. HEADER SECTION                                        */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-zinc-200/90 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 text-white flex items-center justify-center shadow-2xs shrink-0">
            <FileCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              Koreksi Jawaban Esai Siswa
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-0.5 leading-relaxed">
              Evaluasi lembar jawaban esai uraian siswa, masukkan skor bobot nilai per butir soal, dan berikan catatan umpan balik.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            fetchFilterData();
            if (selectedSessionId) fetchSubmissions(selectedSessionId, selectedClassId);
          }}
          disabled={isLoadingFilters || isLoadingSubmissions}
          title="Muat Ulang Data"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition shadow-2xs active:scale-[0.98] disabled:opacity-50 self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSubmissions || isLoadingFilters ? 'animate-spin text-zinc-900' : 'text-zinc-500'}`} />
          <span>Segarkan Data</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* 2. FILTER BERJENJANG: PAKET SOAL, KELAS, & SESI UJIAN   */}
      {/* ======================================================== */}
      <div className="bg-white p-5 rounded-xl border border-zinc-200/90 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-1 border-b border-zinc-100 text-xs font-semibold text-zinc-700 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          <span>Filter Paket Soal, Rombel Kelas, & Sesi Ujian</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Dropdown 1: Filter Paket Soal */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
              <span>1. Filter Paket Soal:</span>
            </label>
            <select
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
              disabled={isLoadingFilters}
              className="w-full text-xs font-medium text-zinc-800 bg-zinc-50/70 hover:bg-white border border-zinc-200 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400 transition cursor-pointer"
            >
              <option value="ALL">-- Semua Paket Soal ({packages.length}) --</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.title} ({pkg.subject_name || pkg.subjectName || '-'})
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown 2: Filter Kelas / Rombel */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
              <span>2. Filter Kelas / Rombel:</span>
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              disabled={isLoadingFilters}
              className="w-full text-xs font-medium text-zinc-800 bg-zinc-50/70 hover:bg-white border border-zinc-200 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400 transition cursor-pointer"
            >
              <option value="ALL">-- Seluruh Kelas ({classrooms.length}) --</option>
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown 3: Sesi Ujian Aktif */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
              <span>3. Sesi Ujian Aktif:</span>
              <span className="text-[10px] text-zinc-400 font-normal">({filteredSessions.length} sesi sesuai filter)</span>
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              disabled={isLoadingFilters || filteredSessions.length === 0}
              className="w-full text-xs font-medium text-zinc-800 bg-zinc-50/70 hover:bg-white border border-zinc-200 rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400 transition cursor-pointer disabled:opacity-50"
            >
              {filteredSessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.target_class || s.classroom_display || s.classroom?.name || 'Semua Kelas'})
                </option>
              ))}
              {filteredSessions.length === 0 && (
                <option value="">Tidak ada sesi yang sesuai dengan filter</option>
              )}
            </select>
          </div>
        </div>

        {/* Ringkasan Metadata Sesi Aktif */}
        {currentSessionObj && (
          <div className="pt-2 border-t border-zinc-100 flex flex-wrap items-center justify-between text-xs text-zinc-500 gap-2">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-800">{currentSessionObj.title}</span>
              <span>•</span>
              <span>Mapel: <strong className="text-zinc-700">{currentSessionObj.package?.subject_name || currentSessionObj.subject_name || '-'}</strong></span>
              <span>•</span>
              <span>Kelas: <strong className="text-zinc-700">{currentSessionObj.classroom_display || currentSessionObj.target_class || 'Semua Kelas'}</strong></span>
              <span>•</span>
              <span>Durasi: <strong className="text-zinc-700">{currentSessionObj.duration_minutes} Menit</strong></span>
            </div>
            <div className="text-[11px] font-mono text-zinc-400">
              ID Sesi: {String(currentSessionObj.id).substring(0, 8)}...
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 3. KARTU STATISTIK RINGKAS                               */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Total Peserta</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 mt-1">{stats.total}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-zinc-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Butir Soal Esai</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 mt-1">{stats.totalQuestions} Soal</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200 flex items-center justify-center">
            <BookOpen className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Perlu Dikoreksi</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-700 mt-1">{stats.pending} Siswa</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Selesai Dikoreksi</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 mt-1">{stats.completed} Siswa</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Global Alerts */}
      {loadErrorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium flex items-center gap-2 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{loadErrorMsg}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. TABEL DAFTAR NAMA SISWA PADA KELAS TERPILIH            */}
      {/* ======================================================== */}
      <div className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs overflow-hidden">
        {/* Toolbar Tabel: Search & Filter Tabs */}
        <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/50">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-zinc-200/70 p-1 rounded-lg overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterStatus('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                filterStatus === 'ALL'
                  ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Semua Peserta ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('PENDING')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                filterStatus === 'PENDING'
                  ? 'bg-white text-amber-800 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Perlu Dikoreksi ({stats.pending})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('COMPLETED')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                filterStatus === 'COMPLETED'
                  ? 'bg-white text-emerald-800 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Selesai Dikoreksi ({stats.completed})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama siswa atau NISN..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-zinc-300 rounded-lg text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400 transition"
            />
          </div>
        </div>

        {/* Tabel Data List Siswa */}
        <div className="overflow-x-auto">
          {isLoadingSubmissions ? (
            <div className="py-16 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-zinc-800 animate-spin mx-auto" />
              <div className="text-xs text-zinc-500 font-medium">Memuat daftar siswa dan lembar esai...</div>
            </div>
          ) : !selectedSessionId ? (
            <div className="py-16 text-center space-y-2 text-zinc-400">
              <Filter className="w-8 h-8 mx-auto text-zinc-300" />
              <div className="text-xs font-medium">Silakan pilih sesi ujian pada filter di atas untuk melihat siswa.</div>
            </div>
          ) : !submissionData || submissionData.essay_questions?.length === 0 ? (
            <div className="py-16 text-center space-y-2 text-zinc-400 px-4">
              <BookOpen className="w-8 h-8 mx-auto text-zinc-300" />
              <div className="text-sm font-semibold text-zinc-700">Tidak Ada Soal Esai pada Paket Ujian Sesi Ini</div>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Paket ujian sesi ini hanya berisi butir soal pilihan ganda / objektif yang telah dinilai 100% otomatis oleh sistem.
              </p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-14 text-center space-y-3 px-4">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="text-sm font-semibold text-zinc-700">Tidak Ada Data Siswa yang Cocok</div>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  {studentSearch 
                    ? `Tidak ditemukan siswa dengan kata kunci "${studentSearch}". Coba kata kunci lain.`
                    : filterStatus === 'PENDING'
                      ? 'Seluruh siswa pada sesi ini telah selesai dikoreksi esainya.'
                      : 'Belum ada siswa yang mengerjakan atau terdaftar pada sesi ujian ini.'}
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
                  <th className="py-3 px-3">Kelas / Rombel</th>
                  <th className="py-3 px-3 text-center">Status Ujian</th>
                  <th className="py-3 px-3 text-center">Status Koreksi</th>
                  <th className="py-3 px-4 text-center">Skor Esai Terkumpul</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredStudents.map((std, idx) => {
                  const isComplete = std.is_fully_graded;

                  return (
                    <tr 
                      key={std.student_id || idx}
                      onClick={() => setSelectedStudent(std)}
                      className="hover:bg-zinc-50/90 transition cursor-pointer group"
                    >
                      <td className="py-3.5 px-3 text-center font-mono text-zinc-400">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-zinc-600">
                        {std.nisn || '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold text-[11px] shrink-0 shadow-2xs">
                            {std.student_name ? std.student_name.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900 group-hover:text-blue-600 transition">
                              {std.student_name}
                            </div>
                            <div className="text-[10px] text-zinc-400 font-mono">
                              NISN: {std.nisn || '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-zinc-600 font-medium">
                        {std.classroom || '-'}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {std.status === 'SUBMITTED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                            <span>Selesai Ujian</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock className="w-3 h-3 text-blue-500" />
                            <span>Mengerjakan</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          {isComplete ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Selesai Dinilai</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              <span>Belum Dinilai</span>
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-zinc-500">
                            {std.graded_count} / {std.total_essays} Soal Dinilai
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-baseline gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 text-white font-mono font-bold text-xs shadow-2xs">
                          <span className="text-sm font-black text-emerald-400">
                            {std.essay_score !== undefined ? parseFloat(std.essay_score).toFixed(1) : (std.total_score !== null ? parseFloat(std.total_score).toFixed(1) : '0.0')}
                          </span>
                          <span className="text-[10px] text-zinc-400">Poin</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(std)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition shadow-2xs active:scale-[0.98] cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Koreksi Jawaban</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. MODAL / LEMBAR KOREKSI JAWABAN ESAI SISWA             */}
      {/* ======================================================== */}
      {selectedStudent && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full max-w-5xl my-auto max-h-[92vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Modal Header: Info Siswa & Quick Navigasi */}
            <div className="p-4 sm:p-5 bg-zinc-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold font-mono text-base text-emerald-400 shadow-2xs shrink-0">
                  {selectedStudent.student_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                      {selectedStudent.student_name}
                    </h2>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
                      {selectedStudent.classroom || 'Kelas'}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2 font-mono">
                    <span>NISN: {selectedStudent.nisn || '-'}</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-semibold">
                      {selectedStudent.graded_count} / {selectedStudent.total_essays} Soal Selesai Dinilai
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigator Siswa Prev / Next & Tombol Close */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <div className="flex items-center bg-zinc-800 rounded-lg p-0.5 border border-zinc-700">
                  <button
                    type="button"
                    onClick={handlePrevStudent}
                    disabled={currentStudentIndex <= 0}
                    className="px-2.5 py-1 text-xs font-medium rounded-md hover:bg-zinc-700 disabled:opacity-30 transition flex items-center gap-1 text-zinc-200"
                    title="Siswa Sebelumnya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                  <span className="px-2 text-[11px] font-mono text-zinc-400">
                    {currentStudentIndex + 1} / {filteredStudents.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextStudent}
                    disabled={currentStudentIndex >= filteredStudents.length - 1}
                    className="px-2.5 py-1 text-xs font-medium rounded-md hover:bg-zinc-700 disabled:opacity-30 transition flex items-center gap-1 text-zinc-200"
                    title="Siswa Berikutnya"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedStudent(null)}
                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer"
                  title="Tutup Lembar Koreksi"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Notification Bar */}
            {saveSuccessMsg && (
              <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-fadeIn shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}
            {saveErrorMsg && (
              <div className="px-5 py-2.5 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2 animate-fadeIn shrink-0">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{saveErrorMsg}</span>
              </div>
            )}

            {/* Modal Body: Daftar Butir Soal Esai Siswa */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-zinc-50/50">
              {submissionData?.essay_questions?.map((question, qIdx) => {
                // Ambil jawaban siswa dengan berbagai fallback key yang aman
                const studentAnsObj = selectedStudent.answers?.[question.id] || 
                                     selectedStudent.answers?.[String(question.id).toLowerCase()] ||
                                     selectedStudent.answers?.[String(question.id).toUpperCase()] ||
                                     selectedStudent.answers?.[`q_${question.order_number}`] ||
                                     selectedStudent.answers?.[question.order_number] ||
                                     null;

                const rawAnswer = typeof studentAnsObj === 'object' && studentAnsObj !== null
                  ? (studentAnsObj.student_answer || '')
                  : (typeof studentAnsObj === 'string' ? studentAnsObj : '');

                const isGraded = studentAnsObj && studentAnsObj.score !== null && studentAnsObj.score !== undefined;
                const maxScore = Number(question.points || question.max_score || question.max_points || 10);
                const curInput = gradeInputs[question.id] || { score: '', feedback: '' };
                const isSaving = savingQuestionId === question.id;

                return (
                  <div
                    key={question.id}
                    className="bg-white rounded-xl border border-zinc-200 shadow-2xs overflow-hidden transition-all"
                  >
                    {/* Header Butir Soal */}
                    <div className="bg-zinc-100/80 px-4 py-3 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-md bg-zinc-900 text-white text-xs font-mono font-bold flex items-center justify-center">
                          {question.order_number || question.order || qIdx + 1}
                        </span>
                        <span className="text-xs sm:text-sm font-bold text-zinc-900">
                          Butir Soal Esai / Uraian
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-semibold text-zinc-700 bg-white border border-zinc-200 px-2.5 py-0.5 rounded-md shadow-2xs">
                          Bobot Maksimal: {maxScore} Poin
                        </span>
                        {isGraded ? (
                          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Telah Dinilai ({studentAnsObj.score} Poin)</span>
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Belum Dinilai</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 space-y-4">
                      {/* Teks Pertanyaan Soal */}
                      <div className="bg-zinc-50 p-3.5 rounded-lg border border-zinc-200/90 text-xs sm:text-sm text-zinc-800 leading-relaxed font-medium">
                        <MathText text={question.question_text || question.text || ''} />
                      </div>

                      {/* Gambar Soal (Jika Ada) */}
                      {(question.image_url || question.imageUrl) && (
                        <div className="my-2 rounded-lg overflow-hidden border border-zinc-300 max-w-md bg-white p-2">
                          <img
                            src={resolveImageUrl(question.image_url || question.imageUrl)}
                            alt={`Gambar Soal Nomor ${question.order_number}`}
                            className="max-h-64 object-contain rounded bg-white mx-auto"
                            onError={handleImageErrorFallback}
                          />
                        </div>
                      )}

                      {/* Lembar Jawaban Siswa */}
                      <div className="space-y-1.5">
                        <div className="text-xs font-semibold text-zinc-700 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Jawaban yang Diketik oleh Siswa:</span>
                          </span>
                          {!rawAnswer && (
                            <span className="text-amber-600 text-xs font-medium italic">
                              (Tidak ada jawaban diketik oleh siswa)
                            </span>
                          )}
                        </div>

                        <div className={`p-4 rounded-xl border text-xs sm:text-sm leading-relaxed whitespace-pre-wrap min-h-[90px] font-sans ${
                          rawAnswer 
                            ? 'bg-zinc-50/90 border-zinc-300 text-zinc-900 font-medium' 
                            : 'bg-amber-50/40 border-amber-200 text-zinc-400 italic'
                        }`}>
                          {rawAnswer || 'Lembar jawaban kosong. (Siswa tidak mengetikkan jawaban untuk butir ini)'}
                        </div>
                      </div>

                      {/* Form Penilaian & Feedback Guru */}
                      <div className="pt-3 border-t border-zinc-100 grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-zinc-50/70 p-3.5 rounded-xl border">
                        {/* Input Skor Angka */}
                        <div className="md:col-span-4 space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Input Skor (0 - {maxScore}):</span>
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max={maxScore}
                              step="0.5"
                              placeholder="0"
                              value={curInput.score}
                              onChange={(e) => handleScoreChange(question.id, e.target.value, maxScore)}
                              className="w-full px-3 py-2 text-sm font-mono font-bold text-zinc-900 bg-white border border-zinc-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-400 transition text-center"
                            />
                            {/* Tombol Nilai Cepat */}
                            <button
                              type="button"
                              onClick={() => handleScoreChange(question.id, maxScore, maxScore)}
                              className="px-2.5 py-2 text-xs font-semibold bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-lg transition shrink-0 cursor-pointer"
                              title="Beri Nilai Maksimal"
                            >
                              Maks
                            </button>
                            <button
                              type="button"
                              onClick={() => handleScoreChange(question.id, 0, maxScore)}
                              className="px-2.5 py-2 text-xs font-semibold bg-zinc-200 hover:bg-zinc-300 text-zinc-800 rounded-lg transition shrink-0 cursor-pointer"
                              title="Beri Nilai 0"
                            >
                              0
                            </button>
                          </div>
                        </div>

                        {/* Input Umpan Balik Guru & Tombol Simpan */}
                        <div className="md:col-span-8 space-y-1.5">
                          <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1">
                            <MessageSquare className="w-3.5 h-3.5 text-zinc-500" />
                            <span>Catatan Umpan Balik / Evaluasi (Opsional):</span>
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Contoh: Penjelasan cukup baik, perlu dilengkapi rincian..."
                              value={curInput.feedback}
                              onChange={(e) => handleFeedbackChange(question.id, e.target.value)}
                              className="w-full px-3 py-2 text-xs bg-white border border-zinc-300 rounded-lg outline-none focus:ring-2 focus:ring-zinc-400 transition"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveGrade(question.id, maxScore)}
                              disabled={isSaving || curInput.score === ''}
                              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] text-white text-xs font-semibold rounded-lg transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50 shrink-0 cursor-pointer"
                            >
                              {isSaving ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Save className="w-3.5 h-3.5 text-emerald-400" />
                              )}
                              <span>Simpan</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer: Navigasi dan Selesai */}
            <div className="p-4 bg-white border-t border-zinc-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 rounded-lg border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold transition cursor-pointer"
              >
                ← Kembali ke Daftar Siswa
              </button>

              <div className="flex items-center gap-2">
                {currentStudentIndex < filteredStudents.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNextStudent}
                    className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span>Lanjut ke Siswa Berikutnya</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSelectedStudent(null)}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>Selesai Seluruh Siswa</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
