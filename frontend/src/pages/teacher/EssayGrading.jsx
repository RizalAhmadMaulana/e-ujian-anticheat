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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">
              Koreksi Jawaban Esai & Rubrik Nilai
            </h1>
            <p className="text-xs md:text-sm text-slate-500">
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
              className="w-full text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
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
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingSubmissions ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. STATISTIK RINGKAS CARDS */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 md:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Peserta</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.total}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Butir Soal Esai</div>
            <div className="text-2xl font-bold text-slate-800 mt-1">{stats.totalQuestions} Soal</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200/70 bg-gradient-to-br from-amber-50/40 to-white shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Perlu Dikoreksi</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{stats.pending} Siswa</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-100/80 text-amber-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/40 to-white shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Selesai Dikoreksi</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.completed} Siswa</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-100/80 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Global Alert Messages */}
      {saveSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm flex items-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}
      {saveErrorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-2 shadow-sm animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{saveErrorMsg}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MAIN WORKSPACE: MASTER-DETAIL SPLIT */}
      {/* ======================================================== */}
      {isLoadingSubmissions ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <div className="text-sm font-semibold text-slate-700">Memuat lembar pengerjaan esai siswa...</div>
          <p className="text-xs text-slate-400">Menghubungkan data jawaban dan rubrik penilaian.</p>
        </div>
      ) : !submissionData || submissionData.essay_questions?.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto" />
          <div className="text-base font-bold text-slate-700">Tidak Ada Soal Esai pada Paket Ujian Ini</div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Paket ujian sesi ini hanya berisi butir soal objektif (Pilihan Ganda, Isian Singkat, dsb) yang telah dinilai 100% otomatis oleh sistem.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ======================================================== */}
          {/* SISI KIRI: DAFTAR SISWA (4 COLS) */}
          {/* ======================================================== */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-[750px]">
            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama atau NISN..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs md:text-sm bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex rounded-lg bg-slate-200/70 p-1 text-xs font-semibold">
                <button
                  onClick={() => setFilterStatus('ALL')}
                  className={`flex-1 py-1.5 rounded-md transition ${filterStatus === 'ALL' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  Semua ({submissionData.students.length})
                </button>
                <button
                  onClick={() => setFilterStatus('PENDING')}
                  className={`flex-1 py-1.5 rounded-md transition ${filterStatus === 'PENDING' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  Perlu Koreksi ({stats.pending})
                </button>
                <button
                  onClick={() => setFilterStatus('COMPLETED')}
                  className={`flex-1 py-1.5 rounded-md transition ${filterStatus === 'COMPLETED' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                  Selesai ({stats.completed})
                </button>
              </div>
            </div>

            {/* List Siswa Scrollable */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
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
                      className={`w-full text-left p-3.5 transition flex items-center justify-between gap-3 border-l-4 ${
                        isSelected 
                          ? 'bg-indigo-50/60 border-l-indigo-600 shadow-sm' 
                          : 'border-l-transparent hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs md:text-sm font-bold text-slate-800 truncate">
                          {std.student_name}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>NISN: {std.nisn || '-'}</span>
                          <span>•</span>
                          <span className="font-semibold text-indigo-600">
                            {std.graded_count}/{std.total_essays} Dinilai
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isComplete 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {isComplete ? 'Selesai' : 'Belum Lengkap'}
                        </span>
                        <span className="text-[11px] font-bold text-slate-700 mt-1">
                          Skor: {std.total_score !== null ? parseFloat(std.total_score).toFixed(1) : '0'}
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
          <div className="lg:col-span-8 space-y-5">
            {selectedStudent ? (
              <>
                {/* Header Siswa Terpilih & Navigator */}
                <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                      {selectedStudent.student_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <span>{selectedStudent.student_name}</span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                          {selectedStudent.status === 'SUBMITTED' ? 'Selesai Ujian' : 'Sedang Mengerjakan'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        NISN: {selectedStudent.nisn || '-'} • Total Nilai Akumulasi:{' '}
                        <span className="font-bold text-indigo-700">
                          {selectedStudent.total_score !== null ? parseFloat(selectedStudent.total_score).toFixed(1) : '0.0'} Poin
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Navigasi Siswa Prev / Next */}
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <button
                      onClick={handlePrevStudent}
                      disabled={currentStudentIndex <= 0}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition flex items-center gap-1 text-slate-700"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </button>
                    <span className="text-xs text-slate-400 font-medium">
                      {currentStudentIndex + 1} / {filteredStudents.length}
                    </span>
                    <button
                      onClick={handleNextStudent}
                      disabled={currentStudentIndex >= filteredStudents.length - 1}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition flex items-center gap-1 text-slate-700"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Daftar Soal Esai Siswa */}
                <div className="space-y-5">
                  {submissionData.essay_questions.map((question, qIdx) => {
                    const studentAns = selectedStudent.answers?.[question.id];
                    const rawAnswer = studentAns?.student_answer || '';
                    const isGraded = studentAns?.is_graded;
                    const curInput = gradeInputs[question.id] || { score: '', feedback: '' };
                    const isSaving = savingQuestionId === question.id;

                    return (
                      <div 
                        key={question.id}
                        className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all"
                      >
                        {/* Header Butir Soal */}
                        <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                              {question.order || qIdx + 1}
                            </span>
                            <span className="text-sm font-bold text-slate-800">
                              Soal Esai / Uraian
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                              Bobot Maksimal: {question.max_score} Poin
                            </span>
                            {isGraded && (
                              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Dinilai
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-5 space-y-4">
                          {/* Teks Pertanyaan Soal */}
                          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 text-sm text-slate-800 leading-relaxed font-medium">
                            {question.text}
                          </div>

                          {/* Lembar Jawaban Siswa */}
                          <div className="space-y-1.5">
                            <div className="text-xs font-bold text-slate-600 flex items-center justify-between">
                              <span>Lembar Jawaban Siswa:</span>
                              {!rawAnswer && (
                                <span className="text-amber-600 text-[11px] font-normal italic">
                                  (Tidak ada jawaban diketik oleh siswa)
                                </span>
                              )}
                            </div>
                            <div className={`p-4 rounded-xl border text-sm leading-relaxed whitespace-pre-wrap min-h-[90px] ${
                              rawAnswer 
                                ? 'bg-indigo-50/20 border-indigo-200/70 text-slate-900 font-sans' 
                                : 'bg-slate-50 border-slate-200 text-slate-400 italic'
                            }`}>
                              {rawAnswer || 'Lembar jawaban kosong.'}
                            </div>
                          </div>

                          {/* Form Penilaian & Feedback Guru */}
                          <div className="pt-2 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            {/* Input Skor Angka */}
                            <div className="md:col-span-4 space-y-1.5">
                              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Beri Skor Nilai (0 - {question.max_score}):</span>
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={question.max_score}
                                  step="0.5"
                                  placeholder="0"
                                  value={curInput.score}
                                  onChange={(e) => handleScoreChange(question.id, e.target.value, question.max_score)}
                                  className="w-full px-3.5 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition text-center"
                                />
                                {/* Quick max button */}
                                <button
                                  type="button"
                                  onClick={() => handleScoreChange(question.id, question.max_score, question.max_score)}
                                  className="px-2.5 py-2 text-xs font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-xl border border-slate-200 transition shrink-0"
                                  title="Beri Nilai Maksimal"
                                >
                                  Maks
                                </button>
                              </div>
                            </div>

                            {/* Input Umpan Balik / Komentar Guru */}
                            <div className="md:col-span-8 space-y-1.5">
                              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Catatan / Umpan Balik Guru (Opsional):</span>
                              </label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Contoh: Penjelasan cukup baik, perlu dilengkapi rincian..."
                                  value={curInput.feedback}
                                  onChange={(e) => handleFeedbackChange(question.id, e.target.value)}
                                  className="w-full px-3.5 py-2 text-xs md:text-sm bg-white border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveGrade(question.id, question.max_score)}
                                  disabled={isSaving || curInput.score === ''}
                                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs md:text-sm font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 shrink-0"
                                >
                                  {isSaving ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Save className="w-4 h-4" />
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
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-2">
                <User className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="text-sm font-semibold text-slate-700">Pilih Siswa untuk Mulai Mengoreksi</div>
                <p className="text-xs text-slate-400">Pilih salah satu nama siswa pada daftar di sisi kiri.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

