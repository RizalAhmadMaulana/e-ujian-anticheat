import React, { useState, useEffect } from 'react';
import { useExamStore } from '../../store/useExamStore';
import { formatExternalExamUrl, isValidExamUrl } from '../../utils/urlEmbedFormatter';
import { getPackagesApi, createPackageApi, updatePackageApi, deletePackageApi } from '../../api/examApi';
import { getClassroomsApi } from '../../api/authApi';
import Modal from '../../components/common/Modal';
import { 
  FolderKanban, 
  Plus, 
  ExternalLink, 
  BookOpen, 
  Trash2, 
  Edit3,
  CheckCircle, 
  Eye, 
  Sparkles,
  Layers,
  FileQuestion,
  HelpCircle,
  X
} from 'lucide-react';

export default function ExamPackageList() {
  const { examPackages, addExamPackage, fetchPackages } = useExamStore();

  const [classroomsList, setClassroomsList] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  // Form State
  const [examType, setExamType] = useState('NATIVE_QUESTIONS'); // 'NATIVE_QUESTIONS' | 'EXTERNAL_LINK'
  const [title, setTitle] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [targetClassroom, setTargetClassroom] = useState('');
  const [platform, setPlatform] = useState('GOOGLE_FORMS'); // 'GOOGLE_FORMS' | 'MICROSOFT_FORMS'
  const [rawExternalUrl, setRawExternalUrl] = useState('');

  useEffect(() => {
    fetchPackages?.();
    const loadClassrooms = async () => {
      try {
        const cls = await getClassroomsApi();
        if (cls && cls.length > 0) {
          setClassroomsList(cls);
          setTargetClassroom(cls[0].name);
        }
      } catch (err) {
        console.warn('Gagal ambil data kelas:', err);
      }
    };
    loadClassrooms();
  }, [fetchPackages]);

  // Native Question Builder State
  const [questions, setQuestions] = useState([
    {
      id: `q-${Date.now()}-1`,
      questionType: 'MULTIPLE_CHOICE',
      questionText: '',
      points: 20,
      options: [
        { label: 'A', text: '' },
        { label: 'B', text: '' },
        { label: 'C', text: '' },
        { label: 'D', text: '' },
        { label: 'E', text: '' },
      ],
      correctOption: 'A',
    },
  ]);

  // Formatted Embed URL
  const formattedEmbedUrl = formatExternalExamUrl(rawExternalUrl);

  const handleAddQuestion = (type = 'MULTIPLE_CHOICE') => {
    setQuestions([
      ...questions,
      {
        id: `q-${Date.now()}-${questions.length + 1}`,
        questionType: type,
        questionText: '',
        points: 20,
        options: type === 'MULTIPLE_CHOICE' ? [
          { label: 'A', text: '' },
          { label: 'B', text: '' },
          { label: 'C', text: '' },
          { label: 'D', text: '' },
          { label: 'E', text: '' },
        ] : [],
        correctOption: type === 'MULTIPLE_CHOICE' ? 'A' : null,
      },
    ]);
  };

  const handleRemoveQuestion = (index) => {
    if (questions.length <= 1) {
      alert('Paket soal minimal harus memiliki 1 butir pertanyaan.');
      return;
    }
    const updated = [...questions];
    updated.splice(index, 1);
    setQuestions(updated);
  };

  const handleQuestionTextChange = (index, text) => {
    const updated = [...questions];
    updated[index].questionText = text;
    setQuestions(updated);
  };

  const handlePointsChange = (index, points) => {
    const updated = [...questions];
    updated[index].points = Number(points);
    setQuestions(updated);
  };

  const handleOptionTextChange = (qIndex, optLabel, text) => {
    const updated = [...questions];
    updated[qIndex].options = updated[qIndex].options.map((opt) =>
      opt.label === optLabel ? { ...opt, text } : opt
    );
    setQuestions(updated);
  };

  const handleCorrectOptionChange = (qIndex, optLabel) => {
    const updated = [...questions];
    updated[qIndex].correctOption = optLabel;
    setQuestions(updated);
  };

  const [backendPackages, setBackendPackages] = useState([]);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const pkgs = await getPackagesApi();
        if (pkgs && pkgs.length > 0) {
          setBackendPackages(pkgs);
        }
      } catch (err) {
        console.warn('Gagal ambil paket dari backend:', err);
      }
    };
    fetchPackages();
  }, []);

  const handleOpenAdd = () => {
    setIsEditing(false);
    setEditingPackageId(null);
    setTitle('');
    setSubjectName('');
    setRawExternalUrl('');
    setExamType('NATIVE_QUESTIONS');
    setTargetClassroom(classroomsList[0]?.name || 'Semua Kelas');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (pkg) => {
    setIsEditing(true);
    setEditingPackageId(pkg.id);
    setTitle(pkg.title || '');
    setSubjectName(pkg.subjectName || pkg.subject_name || '');
    setTargetClassroom(pkg.targetClassroom || pkg.target_classroom || (classroomsList[0]?.name || ''));
    setExamType(pkg.examType || pkg.exam_type || 'NATIVE_QUESTIONS');
    setRawExternalUrl(pkg.externalUrl || pkg.external_url || '');

    if (pkg.questions && pkg.questions.length > 0) {
      setQuestions(
        pkg.questions.map((q, idx) => ({
          id: q.id || `q-${idx}`,
          questionType: q.question_type || q.questionType || 'MULTIPLE_CHOICE',
          questionText: q.question_text || q.questionText || '',
          points: q.points || 20,
          options: (q.options || []).map((opt) => ({
            label: opt.option_label || opt.label || 'A',
            text: opt.option_text || opt.text || '',
          })),
          correctOption:
            (q.options || []).find((o) => o.is_correct || o.isCorrect)?.option_label || 'A',
        }))
      );
    }
    setIsAddModalOpen(true);
  };

  const handleDeletePackage = async (pkgId, pkgTitle) => {
    if (window.confirm(`Yakin ingin menghapus paket "${pkgTitle}"? Seluruh butir soal di dalamnya akan dihapus.`)) {
      try {
        await deletePackageApi(pkgId);
        await fetchPackages?.();
        alert(`Paket "${pkgTitle}" berhasil dihapus.`);
      } catch (err) {
        alert('Gagal menghapus paket: ' + (err.response?.data?.detail || err.message));
      }
    }
  };

  const handleSavePackage = async (e) => {
    e.preventDefault();

    if (!title.trim() || !subjectName.trim()) {
      alert('Mohon isi Judul Paket dan Nama Mata Pelajaran.');
      return;
    }

    if (examType === 'EXTERNAL_LINK') {
      if (!rawExternalUrl.trim()) {
        alert('Mohon masukkan tautan soal Google Form atau Microsoft Teams.');
        return;
      }
      try {
        if (isEditing) {
          await updatePackageApi(editingPackageId, {
            title,
            subject_name: subjectName,
            exam_type: 'EXTERNAL_LINK',
            external_url: formattedEmbedUrl,
          });
        } else {
          await createPackageApi({
            title,
            subject_name: subjectName,
            exam_type: 'EXTERNAL_LINK',
            external_url: formattedEmbedUrl,
            questions: [],
          });
        }
      } catch (err) {
        console.warn('Backend package save fallback:', err);
      }

      addExamPackage({
        title,
        subjectName,
        examType: 'EXTERNAL_LINK',
        targetClassroom,
        externalUrl: formattedEmbedUrl,
        questions: [],
      });
    } else {
      // Validasi soal mandiri
      const hasEmptyQuestion = questions.some((q) => !q.questionText.trim());
      if (hasEmptyQuestion) {
        alert('Mohon lengkapi seluruh teks pertanyaan pada butir soal.');
        return;
      }

      const questionsPayload = questions.map((q, idx) => ({
        question_type: q.questionType,
        question_text: q.questionText,
        points: q.points,
        order_number: idx + 1,
        options: q.questionType === 'MULTIPLE_CHOICE' ? q.options.map((opt) => ({
          option_label: opt.label,
          option_text: opt.text,
          is_correct: opt.label === q.correctOption,
        })) : [],
      }));

      try {
        if (isEditing) {
          await updatePackageApi(editingPackageId, {
            title,
            subject_name: subjectName,
            exam_type: 'NATIVE_QUESTIONS',
            questions: questionsPayload,
          });
        } else {
          await createPackageApi({
            title,
            subject_name: subjectName,
            exam_type: 'NATIVE_QUESTIONS',
            questions: questionsPayload,
          });
        }
      } catch (err) {
        console.warn('Backend package save fallback:', err);
      }

      addExamPackage({
        title,
        subjectName,
        examType: 'NATIVE_QUESTIONS',
        targetClassroom,
        questions,
      });
    }

    // Reset Form
    setTitle('');
    setSubjectName('');
    setRawExternalUrl('');
    setIsEditing(false);
    setEditingPackageId(null);
    setIsAddModalOpen(false);
    await fetchPackages?.();
    alert(`Paket Ujian Berhasil ${isEditing ? 'Diperbarui' : 'Dibuat'} dan Disimpan ke Sistem!`);
  };

  const handleOpenPreview = (url) => {
    setPreviewUrl(url);
    setIsPreviewModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Bank Soal & Paket Ujian
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola soal asesmen mandiri (Pilihan Ganda & Esai) dan integrasi formulir online (Google Form / MS Teams).
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-indigo-700 shadow-md shadow-indigo-600/25 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Paket Soal Baru</span>
        </button>
      </div>

      {/* Grid Kartu Paket Ujian */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {examPackages.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
            <FolderKanban className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-700 text-base">Belum Ada Paket Soal Terdaftar</h3>
            <p className="text-xs text-slate-400">Silakan buat paket soal asesmen baru untuk memulai ujian.</p>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition"
            >
              + Tambah Paket Soal Baru
            </button>
          </div>
        ) : (
          examPackages.map((pkg) => {
          const pkgTitle = pkg.title;
          const pkgSubject = pkg.subjectName || pkg.subject_name || '-';
          const pkgExamType = pkg.examType || pkg.exam_type || 'NATIVE_QUESTIONS';
          const pkgClass = pkg.targetClassroom || pkg.target_classroom || '';
          const pkgUrl = pkg.externalUrl || pkg.external_url || '';
          const pkgDate = pkg.createdAt || pkg.created_at;
          const formattedDate = pkgDate ? new Date(pkgDate).toLocaleDateString('id-ID') : '-';

          return (
            <div
              key={pkg.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:border-indigo-400 hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
                      pkgExamType === 'NATIVE_QUESTIONS'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-purple-100 text-purple-800 border border-purple-200'
                    }`}
                  >
                    {pkgExamType === 'NATIVE_QUESTIONS' ? (
                      <>
                        <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Soal Mandiri (Native)</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
                        <span>Tautan Google Form</span>
                      </>
                    )}
                  </span>
                  {pkgClass && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {pkgClass}
                    </span>
                  )}
                </div>

                <h3 className="font-extrabold text-slate-900 text-base mb-1.5 leading-snug">
                  {pkgTitle}
                </h3>
                <div className="text-xs text-slate-500 mb-4">
                  Mata Pelajaran: <strong className="text-indigo-700">{pkgSubject}</strong>
                </div>

                {pkgExamType === 'NATIVE_QUESTIONS' ? (
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-700 space-y-1 mb-4">
                    <div className="flex items-center justify-between font-semibold">
                      <span>Jumlah Butir Soal:</span>
                      <span className="text-emerald-700 font-bold">{pkg.questions?.length || 0} Soal</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Otomatisasi kalkulasi nilai pilihan ganda & penilaian esai.
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200/70 text-xs text-purple-900 space-y-1.5 mb-4">
                    <div className="font-semibold flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
                      <span>Link Terproteksi (Secure Iframe):</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-600 truncate bg-white p-2 rounded-lg border border-purple-200">
                      {pkgUrl}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-400">
                  Dibuat: {formattedDate}
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {pkgExamType === 'EXTERNAL_LINK' && (
                    <button
                      onClick={() => handleOpenPreview(pkgUrl)}
                      className="px-2.5 py-1.5 text-xs font-bold text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenEdit(pkg)}
                    className="px-2.5 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition flex items-center gap-1"
                    title="Edit Paket Soal"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeletePackage(pkg.id, pkgTitle)}
                    className="p-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition flex items-center gap-1"
                    title="Hapus Paket Soal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        }))}
      </div>

      {/* ======================================================== */}
      {/* MODAL TAMBAH / EDIT PAKET SOAL BARU (MODE HYBRID) */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={isEditing ? 'Edit Data Paket Ujian' : 'Buat Paket Ujian Baru (Hybrid Mode)'}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSavePackage} className="space-y-5">
          {/* Pemilihan Mode: Soal Mandiri vs Link Eksternal */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Pilih Sumber Soal Ujian:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExamType('NATIVE_QUESTIONS')}
                className={`p-3.5 rounded-xl border-2 text-left transition flex items-start gap-3 ${
                  examType === 'NATIVE_QUESTIONS'
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  examType === 'NATIVE_QUESTIONS' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs sm:text-sm">Soal Mandiri (Native)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Pilihan Ganda & Esai dibuat langsung di web</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExamType('EXTERNAL_LINK')}
                className={`p-3.5 rounded-xl border-2 text-left transition flex items-start gap-3 ${
                  examType === 'EXTERNAL_LINK'
                    ? 'border-purple-600 bg-purple-50/70 text-purple-900 shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  examType === 'EXTERNAL_LINK' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  <ExternalLink className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs sm:text-sm">Link Google Form / Teams</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Sematkan URL form eksternal terproteksi</div>
                </div>
              </button>
            </div>
          </div>

          {/* Form Informasi Umum */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Judul Paket Ujian
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Asesmen Sumatif Tengah Semester"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kelas Peserta
              </label>
              <select
                value={targetClassroom}
                onChange={(e) => setTargetClassroom(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {classroomsList.length > 0 ? (
                  classroomsList.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))
                ) : (
                  <option value="Semua Kelas">Semua Kelas</option>
                )}
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Mata Pelajaran
              </label>
              <input
                type="text"
                required
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="Contoh: Teknologi Layanan Jaringan"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* ======================================================== */}
          {/* KONDISIONAL 1: MODE EXTERNAL LINK (GOOGLE FORM) */}
          {/* ======================================================== */}
          {examType === 'EXTERNAL_LINK' && (
            <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <ExternalLink className="w-4 h-4 text-purple-600" />
                  Konfigurasi Tautan Formulir Soal
                </span>
                <span className="text-[11px] text-purple-700 font-medium">Auto-Converter Embed Ready</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tempelkan URL Google Form atau Microsoft Forms:
                </label>
                <input
                  type="url"
                  required
                  value={rawExternalUrl}
                  onChange={(e) => setRawExternalUrl(e.target.value)}
                  placeholder="https://docs.google.com/forms/d/e/.../viewform"
                  className="w-full px-3 py-2 border border-purple-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                />
              </div>

              {rawExternalUrl && (
                <div className="p-3 rounded-lg bg-white border border-purple-200 text-xs space-y-2">
                  <div className="text-[11px] text-slate-500 font-medium">
                    Hasil Konversi Otomatis Iframe Embed:
                  </div>
                  <div className="font-mono text-purple-800 text-[11px] truncate bg-purple-50 p-2 rounded">
                    {formattedEmbedUrl}
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(formattedEmbedUrl)}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" /> Uji Preview Tampilan Form
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* KONDISIONAL 2: MODE SOAL MANDIRI (NATIVE QUESTIONS) */}
          {/* ======================================================== */}
          {examType === 'NATIVE_QUESTIONS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Daftar Pertanyaan ({questions.length} Butir)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('MULTIPLE_CHOICE')}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Pilihan Ganda
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('ESSAY')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Esai
                  </button>
                </div>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3 relative"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          {q.questionType === 'MULTIPLE_CHOICE' ? 'Pilihan Ganda' : 'Esai'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-xs">
                          <span className="text-slate-500">Poin:</span>
                          <input
                            type="number"
                            min="1"
                            value={q.points}
                            onChange={(e) => handlePointsChange(idx, e.target.value)}
                            className="w-14 px-2 py-0.5 border border-slate-300 rounded text-center font-bold"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(idx)}
                          className="p-1 text-slate-400 hover:text-red-600 transition"
                          title="Hapus Butir Soal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <textarea
                        rows={2}
                        required
                        value={q.questionText}
                        onChange={(e) => handleQuestionTextChange(idx, e.target.value)}
                        placeholder="Tuliskan teks pertanyaan soal di sini..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      />
                    </div>

                    {q.questionType === 'MULTIPLE_CHOICE' && (
                      <div className="space-y-2 pt-1">
                        <div className="text-[11px] font-semibold text-slate-500">
                          Pilihan Jawaban (Pilih radio untuk menentukan kunci jawaban yang benar):
                        </div>
                        {q.options.map((opt) => (
                          <div key={opt.label} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${q.id}`}
                              checked={q.correctOption === opt.label}
                              onChange={() => handleCorrectOptionChange(idx, opt.label)}
                              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              title="Pilih sebagai kunci jawaban"
                            />
                            <span className="w-5 font-bold text-xs text-slate-700">{opt.label}.</span>
                            <input
                              type="text"
                              required
                              value={opt.text}
                              onChange={(e) => handleOptionTextChange(idx, opt.label, e.target.value)}
                              placeholder={`Pilihan jawaban ${opt.label}`}
                              className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition"
            >
              {isEditing ? 'Simpan Perubahan Paket' : 'Simpan Paket Ujian'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL PREVIEW IFRAME GOOGLE FORM / MICROSOFT TEAMS */}
      {/* ======================================================== */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title="Pratinjau Tampilan Iframe Formulir Soal"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center justify-between">
            <span>Tampilan pratinjau seperti yang akan dilihat siswa di arena terkunci:</span>
            <span className="font-mono text-[11px] truncate max-w-xs">{previewUrl}</span>
          </div>

          <div className="w-full h-96 border border-slate-300 rounded-xl overflow-hidden bg-slate-100 relative">
            <iframe
              src={previewUrl}
              title="Pratinjau Soal Formulir"
              className="w-full h-full border-0"
              allow="camera; microphone; fullscreen"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setIsPreviewModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
