import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FileCheck, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Save, 
  ChevronRight, 
  User, 
  Sparkles, 
  MessageSquare, 
  Award, 
  BookOpen, 
  RefreshCw,
  ArrowLeft,
  ChevronLeft
} from 'lucide-react';
import { getSessionsApi, getEssaySubmissionsApi, saveEssayGradeApi } from '../../api/examApi';

export default function EssayGrading() {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  
  const [submissionData, setSubmissionData] = useState(null);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, PENDING, COMPLETED

  // Local form state for grades: { [questionId]: { score: number|string, feedback: string } }
  const [gradeInputs, setGradeInputs] = useState({});
  const [savingQuestionId, setSavingQuestionId] = useState(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');

  // 1. Fetch Daftar Sesi Ujian
  const fetchSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const data = await getSessionsApi();
      const list = Array.isArray(data) ? data : (data.results || []);
      setSessions(list);
      if (list.length > 0 && !selectedSessionId) {
        setSelectedSessionId(list[0].id);
      }
    } catch (err) {
      console.error('Gagal mengambil sesi ujian:', err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // 2. Fetch Data Lembar Jawaban Esai untuk Sesi Terpilih
  const fetchSubmissions = useCallback(async (sessionId) => {
    if (!sessionId) return;
    setIsLoadingSubmissions(true);
    setSaveErrorMsg('');
    try {
      const res = await getEssaySubmissionsApi(sessionId);
      setSubmissionData(res);
      // Auto select first student if available and not selected yet
      if (res.students && res.students.length > 0) {
        setSelectedStudentId(res.students[0].student_id);
      } else {
        setSelectedStudentId(null);
      }
    } catch (err) {
      console.error('Gagal memuat jawaban esai siswa:', err);
      setSaveErrorMsg(err.response?.data?.error || 'Gagal memuat berkas jawaban esai sesi ini.');
      setSubmissionData(null);
    } finally {
      setIsLoadingSubmissions(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSessionId) {
      fetchSubmissions(selectedSessionId);
    }
  }, [selectedSessionId, fetchSubmissions]);

  // Get selected student object
  const selectedStudent = useMemo(() => {
    if (!submissionData?.students || !selectedStudentId) return null;
    return submissionData.students.find(s => s.student_id === selectedStudentId) || null;
  }, [submissionData, selectedStudentId]);

  // Sync grade inputs when selected student changes
  useEffect(() => {
    if (!selectedStudent || !submissionData?.essay_questions) {
      setGradeInputs({});
      return;
    }
    const initial = {};
    submissionData.essay_questions.forEach(q => {
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

  // Handler input perubahan nilai dan feedback
  const handleScoreChange = (questionId, val, maxScore) => {
    const num = val === '' ? '' : Math.min(Math.max(0, parseFloat(val) || 0), maxScore);
    setGradeInputs(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        score: num
      }
    }));
  };

  const handleFeedbackChange = (questionId, text) => {
    setGradeInputs(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        feedback: text
      }
    }));
  };

  // Simpan nilai esai untuk 1 soal
  const handleSaveGrade = async (questionId, maxScore) => {
    if (!selectedStudent) return;
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
        question_id: questionId,
        score: parseFloat(input.score) || 0,
        feedback: input.feedback || ''
      };

      const res = await saveEssayGradeApi(selectedSessionId, payload);
      setSaveSuccessMsg(`Nilai soal berhasil disimpan! Total skor siswa kini: ${res.total_score}`);

      // Update state lokal submissionData tanpa fetch ulang
      setSubmissionData(prev => {
        if (!prev) return prev;
        const updatedStudents = prev.students.map(std => {
          if (std.attempt_id === selectedStudent.attempt_id) {
            const newAnswers = {
              ...std.answers,
              [questionId]: {
                ...(std.answers?.[questionId] || {}),
                score: parseFloat(input.score) || 0,
                feedback: input.feedback || '',
                is_graded: true
              }
            };
            const gradedCount = Object.values(newAnswers).filter(a => a.is_graded).length;
            const totalEssays = prev.essay_questions.length;
            return {
              ...std,
              total_score: res.total_score,
              graded_count: gradedCount,
              is_fully_graded: gradedCount >= totalEssays,
              answers: newAnswers
            };
          }
          return std;
        });
        return { ...prev, students: updatedStudents };
      });

      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      console.error('Gagal menyimpan nilai esai:', err);
      setSaveErrorMsg(err.response?.data?.error || 'Gagal menyimpan nilai esai siswa.');
    } finally {
      setSavingQuestionId(null);
    }
  };

  // Filter students based on search and status
  const filteredStudents = useMemo(() => {
    if (!submissionData?.students) return [];
    return submissionData.students.filter(std => {
      const matchSearch = std.student_name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                          (std.nisn && std.nisn.includes(studentSearch));
      if (!matchSearch) return false;

      if (filterStatus === 'PENDING') return !std.is_fully_graded;
      if (filterStatus === 'COMPLETED') return std.is_fully_graded;
      return true;
    });
  }, [submissionData, studentSearch, filterStatus]);

  // Statistik Ringkas
  const stats = useMemo(() => {
    if (!submissionData?.students) {
      return { total: 0, pending: 0, completed: 0, totalQuestions: 0 };
    }
    const total = submissionData.students.length;
    const completed = submissionData.students.filter(s => s.is_fully_graded).length;
    const pending = total - completed;
    const totalQuestions = submissionData.essay_questions?.length || 0;
    return { total, pending, completed, totalQuestions };
  }, [submissionData]);

  // Index navigation
  const currentStudentIndex = filteredStudents.findIndex(s => s.student_id === selectedStudentId);

  const handleNextStudent = () => {
    if (currentStudentIndex < filteredStudents.length - 1) {
      setSelectedStudentId(filteredStudents[currentStudentIndex + 1].student_id);
    }
  };

  const handlePrevStudent = () => {
    if (currentStudentIndex > 0) {
      setSelectedStudentId(filteredStudents[currentStudentIndex - 1].student_id);
    }
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* ======================================================== */}
      {/* 1. HEADER SECTION */}
      {/* ======================================================== */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-zinc-200/90 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-800 shadow-2xs shrink-0">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              Koreksi Jawaban Esai & Rubrik Nilai
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 mt-0.5 leading-relaxed">
              Evaluasi lembar esai uraian siswa, masukkan skor bobot manual, dan berikan catatan umpan balik.
            </p>
          </div>
        </div>

        {/* Sesi Ujian Selector */}
        <div className="flex items-center gap-2">
          <div className="relative min-w-[240px] md:min-w-[280px]">
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              disabled={isLoadingSessions}
              className="w-full text-xs sm:text-sm font-medium text-zinc-800 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 outline-none focus:border-zinc-400 transition cursor-pointer"
            >
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.target_class || 'Semua Kelas'})
                </option>
              ))}
              {sessions.length === 0 && !isLoadingSessions && (
                <option value="">Belum ada sesi ujian</option>
              )}
            </select>
          </div>

          <button
            onClick={() => fetchSubmissions(selectedSessionId)}
            disabled={isLoadingSubmissions || !selectedSessionId}
            title="Muat Ulang Data"
            className="p-2 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 transition shadow-2xs hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSubmissions ? 'animate-spin text-zinc-900' : ''}`} />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. STATISTIK RINGKAS CARDS */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4">
        <div className="bg-white p-4 rounded-xl border border-zinc-200/90 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Total Peserta</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-zinc-900 mt-1">{stats.total}</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200 flex items-center justify-center">
            <User className="w-4 h-4" />
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

        <div className="bg-white p-4 rounded-xl border border-amber-200/70 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">Perlu Dikoreksi</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-700 mt-1">{stats.pending} Siswa</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/70 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Selesai Dikoreksi</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 mt-1">{stats.completed} Siswa</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Global Alert Messages */}
      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2 shadow-2xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}
      {saveErrorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium flex items-center gap-2 shadow-2xs animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveErrorMsg}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MAIN WORKSPACE: MASTER-DETAIL SPLIT */}
      {/* ======================================================== */}
      {isLoadingSubmissions ? (
        <div className="bg-white p-12 rounded-xl border border-zinc-200 text-center space-y-2.5">
          <RefreshCw className="w-6 h-6 text-zinc-800 animate-spin mx-auto" />
          <div className="text-xs font-semibold text-zinc-800">Memuat lembar pengerjaan esai siswa...</div>
          <p className="text-[11px] text-zinc-400">Menghubungkan data jawaban dan rubrik penilaian.</p>
        </div>
      ) : !submissionData || submissionData.essay_questions?.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-zinc-200 text-center space-y-2">
          <BookOpen className="w-8 h-8 text-zinc-300 mx-auto" />
          <div className="text-sm font-semibold text-zinc-800">Tidak Ada Soal Esai pada Paket Ujian Ini</div>
          <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
            Paket ujian sesi ini hanya berisi butir soal objektif (Pilihan Ganda, Isian Singkat, dsb) yang telah dinilai 100% otomatis oleh sistem.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* ======================================================== */}
          {/* SISI KIRI: DAFTAR SISWA (4 COLS) */}
          {/* ======================================================== */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-zinc-200/90 shadow-2xs overflow-hidden flex flex-col h-[720px]">
            {/* Filter & Search Bar */}
            <div className="p-3.5 border-b border-zinc-100 space-y-2.5 bg-zinc-50/50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama atau NISN..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg outline-none focus:border-zinc-400 transition"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex rounded-md bg-zinc-100 p-0.5 text-xs font-medium border border-zinc-200/60">
                <button
                  onClick={() => setFilterStatus('ALL')}
                  className={`flex-1 py-1 rounded transition text-xs ${filterStatus === 'ALL' ? 'bg-white text-zinc-900 shadow-2xs font-semibold' : 'text-zinc-600 hover:text-zinc-900'}`}
                >
                  Semua ({submissionData.students.length})
                </button>
                <button
                  onClick={() => setFilterStatus('PENDING')}
                  className={`flex-1 py-1 rounded transition text-xs ${filterStatus === 'PENDING' ? 'bg-white text-amber-800 shadow-2xs font-semibold' : 'text-zinc-600 hover:text-zinc-900'}`}
                >
                  Perlu ({stats.pending})
                </button>
                <button
                  onClick={() => setFilterStatus('COMPLETED')}
                  className={`flex-1 py-1 rounded transition text-xs ${filterStatus === 'COMPLETED' ? 'bg-white text-emerald-800 shadow-2xs font-semibold' : 'text-zinc-600 hover:text-zinc-900'}`}
                >
                  Selesai ({stats.completed})
                </button>
              </div>
            </div>

            {/* List Siswa Scrollable */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-400">
                  Tidak ada data siswa yang cocok dengan filter.
                </div>
              ) : (
                filteredStudents.map((std) => {
                  const isSelected = std.student_id === selectedStudentId;
                  const isComplete = std.is_fully_graded;

                  return (
                    <button
                      key={std.student_id}
                      onClick={() => setSelectedStudentId(std.student_id)}
                      className={`w-full text-left p-3 transition flex items-center justify-between gap-2.5 border-l-2 ${
                        isSelected 
                          ? 'bg-zinc-100/80 border-l-zinc-900 text-zinc-900 shadow-2xs' 
                          : 'border-l-transparent hover:bg-zinc-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-semibold text-zinc-900 truncate">
                          {std.student_name}
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1.5 font-mono">
                          <span>{std.nisn || '-'}</span>
                          <span>•</span>
                          <span className="font-sans font-medium text-zinc-700">
                            {std.graded_count}/{std.total_essays} Dinilai
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <span className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${
                          isComplete 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isComplete ? 'Selesai' : 'Belum'}
                        </span>
                        <span className="text-[11px] font-mono font-semibold text-zinc-800 mt-1">
                          {std.total_score !== null ? parseFloat(std.total_score).toFixed(1) : '0'} Poin
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* SISI KANAN: DETAIL LEMBAR JAWABAN & FORM KOREKSI (8 COLS) */}
          {/* ======================================================== */}
          <div className="lg:col-span-8 space-y-4">
            {selectedStudent ? (
              <>
                {/* Header Siswa Terpilih & Navigator */}
                <div className="bg-white p-4 rounded-xl border border-zinc-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-mono font-bold text-sm shadow-2xs">
                      {selectedStudent.student_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm sm:text-base font-semibold text-zinc-900 flex items-center gap-2">
                        <span>{selectedStudent.student_name}</span>
                        <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                          {selectedStudent.status === 'SUBMITTED' ? 'Selesai Ujian' : 'Sedang Mengerjakan'}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        NISN: <span className="font-mono text-zinc-700">{selectedStudent.nisn || '-'}</span> • Total Nilai Akumulasi:{' '}
                        <span className="font-mono font-semibold text-zinc-900">
                          {selectedStudent.total_score !== null ? parseFloat(selectedStudent.total_score).toFixed(1) : '0.0'} Poin
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Navigasi Siswa Prev / Next */}
                  <div className="flex items-center gap-1.5 self-end md:self-auto">
                    <button
                      onClick={handlePrevStudent}
                      disabled={currentStudentIndex <= 0}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 transition flex items-center gap-1 text-zinc-700 shadow-2xs"
                    >
                      <ChevronLeft className="w-3 h-3" /> Prev
                    </button>
                    <span className="text-xs font-mono text-zinc-400">
                      {currentStudentIndex + 1} / {filteredStudents.length}
                    </span>
                    <button
                      onClick={handleNextStudent}
                      disabled={currentStudentIndex >= filteredStudents.length - 1}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 transition flex items-center gap-1 text-zinc-700 shadow-2xs"
                    >
                      Next <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Daftar Soal Esai Siswa */}
                <div className="space-y-4">
                  {submissionData.essay_questions.map((question, qIdx) => {
                    const studentAns = selectedStudent.answers?.[question.id];
                    const rawAnswer = studentAns?.student_answer || '';
                    const isGraded = studentAns?.is_graded;
                    const curInput = gradeInputs[question.id] || { score: '', feedback: '' };
                    const isSaving = savingQuestionId === question.id;

                    return (
                      <div 
                        key={question.id}
                        className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs overflow-hidden transition-all"
                      >
                        {/* Header Butir Soal */}
                        <div className="bg-zinc-50 px-4 py-2.5 border-b border-zinc-200/80 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-zinc-900 text-white text-xs font-mono font-semibold flex items-center justify-center">
                              {question.order || qIdx + 1}
                            </span>
                            <span className="text-xs font-semibold text-zinc-900">
                              Soal Esai / Uraian
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-mono font-medium text-zinc-700 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded">
                              Bobot Maks: {question.max_score} Poin
                            </span>
                            {isGraded && (
                              <span className="text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Sudah Dinilai
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-4 space-y-3.5">
                          {/* Teks Pertanyaan Soal */}
                          <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 text-xs sm:text-sm text-zinc-800 leading-relaxed font-medium">
                            {question.text}
                          </div>

                          {/* Lembar Jawaban Siswa */}
                          <div className="space-y-1">
                            <div className="text-[11px] font-semibold text-zinc-500 flex items-center justify-between">
                              <span>Lembar Jawaban Siswa:</span>
                              {!rawAnswer && (
                                <span className="text-amber-600 text-[10px] italic">
                                  (Tidak ada jawaban diketik oleh siswa)
                                </span>
                              )}
                            </div>
                            <div className={`p-3 rounded-lg border text-xs sm:text-sm leading-relaxed whitespace-pre-wrap min-h-[80px] ${
                              rawAnswer 
                                ? 'bg-zinc-50/70 border-zinc-200 text-zinc-900' 
                                : 'bg-zinc-50 border-zinc-200 text-zinc-400 italic'
                            }`}>
                              {rawAnswer || 'Lembar jawaban kosong.'}
                            </div>
                          </div>

                          {/* Form Penilaian & Feedback Guru */}
                          <div className="pt-2 border-t border-zinc-100 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            {/* Input Skor Angka */}
                            <div className="md:col-span-4 space-y-1">
                              <label className="text-[11px] font-semibold text-zinc-700 flex items-center gap-1">
                                <Award className="w-3 h-3 text-zinc-500" />
                                <span>Skor (0 - {question.max_score}):</span>
                              </label>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  max={question.max_score}
                                  step="0.5"
                                  placeholder="0"
                                  value={curInput.score}
                                  onChange={(e) => handleScoreChange(question.id, e.target.value, question.max_score)}
                                  className="w-full px-2.5 py-1.5 text-xs font-mono font-semibold text-zinc-900 bg-white border border-zinc-200 rounded-lg outline-none focus:border-zinc-400 transition text-center"
                                />
                                {/* Quick max button */}
                                <button
                                  type="button"
                                  onClick={() => handleScoreChange(question.id, question.max_score, question.max_score)}
                                  className="px-2 py-1.5 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg border border-zinc-200 transition shrink-0"
                                  title="Beri Nilai Maksimal"
                                >
                                  Maks
                                </button>
                              </div>
                            </div>

                            {/* Input Umpan Balik / Komentar Guru */}
                            <div className="md:col-span-8 space-y-1">
                              <label className="text-[11px] font-semibold text-zinc-700 flex items-center gap-1">
                                <MessageSquare className="w-3 h-3 text-zinc-500" />
                                <span>Catatan Umpan Balik (Opsional):</span>
                              </label>
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  placeholder="Contoh: Penjelasan cukup baik, perlu dilengkapi rincian..."
                                  value={curInput.feedback}
                                  onChange={(e) => handleFeedbackChange(question.id, e.target.value)}
                                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded-lg outline-none focus:border-zinc-400 transition"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveGrade(question.id, question.max_score)}
                                  disabled={isSaving || curInput.score === ''}
                                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] text-white text-xs font-semibold rounded-lg transition flex items-center gap-1 shadow-xs disabled:opacity-50 shrink-0 hover:-translate-y-0.5"
                                >
                                  {isSaving ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Save className="w-3.5 h-3.5" />
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
              </>
            ) : (
              <div className="bg-white p-12 rounded-xl border border-zinc-200 text-center space-y-2">
                <User className="w-8 h-8 text-zinc-300 mx-auto" />
                <div className="text-xs font-semibold text-zinc-800">Pilih Siswa untuk Mulai Mengoreksi</div>
                <p className="text-[11px] text-zinc-400">Pilih salah satu nama siswa pada daftar di sisi kiri.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

