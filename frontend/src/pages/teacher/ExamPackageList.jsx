import React, { useState, useEffect } from 'react';
import { useExamStore } from '../../store/useExamStore';
import { formatExternalExamUrl, isValidExamUrl } from '../../utils/urlEmbedFormatter';
import { getPackagesApi, createPackageApi, updatePackageApi, deletePackageApi, uploadExamImageApi } from '../../api/examApi';
import { resolveImageUrl } from '../../utils/imageUrlFormatter';
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
  X,
  Image as ImageIcon,
  Copy,
  Check
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

  // Native Question Builder State (Microsoft Forms Style)
  const [questions, setQuestions] = useState([
    {
      id: `q-${Date.now()}-1`,
      questionType: 'MULTIPLE_CHOICE',
      questionText: '',
      imageUrl: '',
      points: 20,
      options: [
        { id: `opt-1`, label: 'A', text: '', imageUrl: '' },
        { id: `opt-2`, label: 'B', text: '', imageUrl: '' },
        { id: `opt-3`, label: 'C', text: '', imageUrl: '' },
        { id: `opt-4`, label: 'D', text: '', imageUrl: '' },
      ],
      correctOption: 'A',
    },
  ]);

  // Total Nilai Seluruh Butir Soal (Dihitung Realtime)
  const totalPoints = questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);

  // Formatted Embed URL
  const formattedEmbedUrl = formatExternalExamUrl(rawExternalUrl);

  const handleAddQuestion = (type = 'MULTIPLE_CHOICE') => {
    setQuestions([
      ...questions,
      {
        id: `q-${Date.now()}-${questions.length + 1}`,
        questionType: type,
        questionText: '',
        imageUrl: '',
        points: 20,
        options: type === 'MULTIPLE_CHOICE' ? [
          { id: `opt-${Date.now()}-1`, label: 'A', text: '', imageUrl: '' },
          { id: `opt-${Date.now()}-2`, label: 'B', text: '', imageUrl: '' },
          { id: `opt-${Date.now()}-3`, label: 'C', text: '', imageUrl: '' },
          { id: `opt-${Date.now()}-4`, label: 'D', text: '', imageUrl: '' },
        ] : [],
        correctOption: type === 'MULTIPLE_CHOICE' ? 'A' : null,
      },
    ]);
  };

  const handleDuplicateQuestion = (qIndex) => {
    const qToCopy = questions[qIndex];
    const duplicated = {
      ...qToCopy,
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      options: (qToCopy.options || []).map((o, idx) => ({
        ...o,
        id: `opt-${Date.now()}-${idx}`,
      })),
    };
    const updated = [...questions];
    updated.splice(qIndex + 1, 0, duplicated);
    setQuestions(updated);
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
    updated[index].points = Number(points) || 0;
    setQuestions(updated);
  };

  // Upload Gambar Soal
  const handleQuestionImageUpload = async (qIndex, file) => {
    if (!file) return;
    try {
      const res = await uploadExamImageApi(file);
      const updated = [...questions];
      updated[qIndex].imageUrl = res.url;
      setQuestions(updated);
    } catch (err) {
      alert('Gagal mengunggah gambar soal: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRemoveQuestionImage = (qIndex) => {
    const updated = [...questions];
    updated[qIndex].imageUrl = '';
    setQuestions(updated);
  };

  // Manajemen Opsi Jawaban Dinamis (Tambah, Hapus, Upload Gambar)
  const handleAddOption = (qIndex) => {
    const updated = [...questions];
    const currentOptions = updated[qIndex].options || [];
    if (currentOptions.length >= 8) {
      alert('Maksimal 8 opsi pilihan jawaban (A sampai H).');
      return;
    }
    const nextLabel = String.fromCharCode(65 + currentOptions.length);
    updated[qIndex].options = [
      ...currentOptions,
      {
        id: `opt-${Date.now()}-${currentOptions.length + 1}`,
        label: nextLabel,
        text: '',
        imageUrl: '',
      },
    ];
    setQuestions(updated);
  };

  const handleRemoveOption = (qIndex, optIndex) => {
    const updated = [...questions];
    const currentOptions = [...(updated[qIndex].options || [])];
    if (currentOptions.length <= 2) {
      alert('Pilihan ganda minimal harus memiliki 2 opsi jawaban.');
      return;
    }
    const removedLabel = currentOptions[optIndex].label;
    currentOptions.splice(optIndex, 1);

    // Re-index label A, B, C, D...
    const reindexed = currentOptions.map((opt, i) => ({
      ...opt,
      label: String.fromCharCode(65 + i),
    }));
    updated[qIndex].options = reindexed;

    // Sesuaikan kunci jawaban bila opsi yang dihapus merupakan kunci jawaban
    if (updated[qIndex].correctOption === removedLabel || !reindexed.some((o) => o.label === updated[qIndex].correctOption)) {
      updated[qIndex].correctOption = reindexed[0]?.label || 'A';
    }
    setQuestions(updated);
  };

  const handleOptionTextChange = (qIndex, optIndex, text) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex].text = text;
    setQuestions(updated);
  };

  const handleOptionImageUpload = async (qIndex, optIndex, file) => {
    if (!file) return;
    try {
      const res = await uploadExamImageApi(file);
      const updated = [...questions];
      updated[qIndex].options[optIndex].imageUrl = res.url;
      setQuestions(updated);
    } catch (err) {
      alert('Gagal mengunggah gambar opsi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleRemoveOptionImage = (qIndex, optIndex) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex].imageUrl = '';
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
    setQuestions([
      {
        id: `q-${Date.now()}-1`,
        questionType: 'MULTIPLE_CHOICE',
        questionText: '',
        imageUrl: '',
        points: 20,
        options: [
          { id: `opt-1`, label: 'A', text: '', imageUrl: '' },
          { id: `opt-2`, label: 'B', text: '', imageUrl: '' },
          { id: `opt-3`, label: 'C', text: '', imageUrl: '' },
          { id: `opt-4`, label: 'D', text: '', imageUrl: '' },
        ],
        correctOption: 'A',
      },
    ]);
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
          imageUrl: q.image_url || q.imageUrl || '',
          points: q.points || 20,
          options: (q.options || []).map((opt, oIdx) => ({
            id: opt.id || `opt-${idx}-${oIdx}`,
            label: opt.option_label || opt.label || String.fromCharCode(65 + oIdx),
            text: opt.option_text || opt.text || '',
            imageUrl: opt.image_url || opt.imageUrl || '',
          })),
          correctOption:
            (q.options || []).find((o) => o.is_correct || o.isCorrect)?.option_label ||
            (q.options?.[0]?.option_label || 'A'),
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
        image_url: q.imageUrl || null,
        points: Number(q.points) || 0,
        order_number: idx + 1,
        options: q.questionType === 'MULTIPLE_CHOICE' ? q.options.map((opt) => ({
          option_label: opt.label,
          option_text: opt.text,
          image_url: opt.imageUrl || null,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
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
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/25 transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Paket Soal Baru</span>
        </button>
      </div>

      {/* Grid Kartu Paket Ujian */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {examPackages.length === 0 ? (
          <div className="col-span-full py-12 sm:py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
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
              className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-slate-300 hover:border-indigo-500 shadow-md hover:shadow-xl transition-all duration-200 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`text-xs font-black px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-sm border-2 ${
                      pkgExamType === 'NATIVE_QUESTIONS'
                        ? 'bg-emerald-100 text-emerald-950 border-emerald-400'
                        : 'bg-purple-100 text-purple-950 border-purple-400'
                    }`}
                  >
                    {pkgExamType === 'NATIVE_QUESTIONS' ? (
                      <>
                        <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Soal Mandiri</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-3.5 h-3.5 text-purple-700" />
                        <span>Google Form</span>
                      </>
                    )}
                  </span>
                  {pkgClass && (
                    <span className="text-xs font-black px-3 py-1 rounded-lg bg-slate-100 text-slate-800 border-2 border-slate-300 uppercase tracking-wider shadow-sm">
                      {pkgClass}
                    </span>
                  )}
                </div>

                <h3 className="font-black text-slate-900 text-base sm:text-lg mb-1 leading-snug tracking-tight">
                  {pkgTitle}
                </h3>
                <div className="text-xs sm:text-sm text-slate-600 font-semibold mb-3">
                  Mata Pelajaran: <strong className="text-indigo-700 font-black">{pkgSubject}</strong>
                </div>

                {pkgExamType === 'NATIVE_QUESTIONS' ? (
                  <div className="p-3.5 rounded-xl bg-slate-50/90 border-2 border-slate-200 text-xs text-slate-700 space-y-1.5 mb-2 shadow-sm">
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-slate-600">Jumlah Butir Soal:</span>
                      <span className="text-emerald-800 font-black bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-md">
                        {pkg.questions?.length || 0} Soal
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      Otomatisasi kalkulasi nilai pilihan ganda & penilaian esai.
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-purple-50/80 border-2 border-purple-200 text-xs text-purple-950 space-y-2 mb-2 shadow-sm">
                    <div className="font-bold flex items-center gap-1.5 text-purple-900">
                      <ExternalLink className="w-3.5 h-3.5 text-purple-700" />
                      <span>Link Terproteksi (Secure Iframe):</span>
                    </div>
                    <div className="font-mono text-xs text-purple-950 truncate bg-white p-2.5 rounded-lg border-2 border-purple-200 font-bold shadow-inner">
                      {pkgUrl}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3.5 border-t-2 border-slate-100 flex-wrap gap-2">
                <span className="text-xs font-semibold text-slate-400">
                  Dibuat: {formattedDate}
                </span>
                <div className="flex items-center gap-2">
                  {pkgExamType === 'EXTERNAL_LINK' && (
                    <button
                      onClick={() => handleOpenPreview(pkgUrl)}
                      className="px-3 py-1.5 text-xs font-black text-purple-800 bg-purple-50 hover:bg-purple-100 border-2 border-purple-300 rounded-xl transition flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5 text-purple-700" /> Preview
                    </button>
                  )}
                  <button
                    onClick={() => handleOpenEdit(pkg)}
                    className="px-3 py-1.5 text-xs font-black text-amber-800 bg-amber-50 hover:bg-amber-100 border-2 border-amber-300 rounded-xl transition flex items-center gap-1.5 shadow-sm active:scale-95"
                    title="Edit Paket Soal"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeletePackage(pkg.id, pkgTitle)}
                    className="p-2 text-xs font-black text-rose-700 bg-rose-50 hover:bg-rose-100 border-2 border-rose-300 rounded-xl transition flex items-center gap-1.5 shadow-sm active:scale-95"
                    title="Hapus Paket Soal"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
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
        maxWidth="max-w-4xl"
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
          {/* KONDISIONAL 2: MODE SOAL MANDIRI (MICROSOFT FORMS STYLE) */}
          {/* ======================================================== */}
          {examType === 'NATIVE_QUESTIONS' && (
            <div className="space-y-4">
              {/* Header Pertanyaan & Total Akumulasi Poin */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Daftar Pertanyaan ({questions.length} Butir)
                  </span>
                  <div className={`px-3 py-1 rounded-full text-xs font-black border flex items-center gap-1.5 shadow-2xs ${
                    totalPoints === 100
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  }`}>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Total Nilai: {totalPoints} Poin</span>
                    {totalPoints === 100 && (
                      <span className="text-[10px] text-emerald-600 font-bold ml-0.5">✓ 100 Standar</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('MULTIPLE_CHOICE')}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Pilihan Ganda
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('ESSAY')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <Plus className="w-3.5 h-3.5" /> + Esai
                  </button>
                </div>
              </div>

              {/* Loop Kartu Soal (Gaya Microsoft Forms) */}
              <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
                {questions.map((q, idx) => (
                  <div
                    key={q.id}
                    className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 bg-white hover:border-indigo-300 shadow-xs transition space-y-3.5 relative group"
                  >
                    {/* Header Bar Kartu Soal */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-black text-slate-800">
                          {q.questionType === 'MULTIPLE_CHOICE' ? 'Pilihan Ganda' : 'Esai'}
                        </span>
                        {q.questionType === 'MULTIPLE_CHOICE' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                            {q.options.length} Opsi
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Input Poin Tiap Nomor */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                          <span className="text-slate-500 font-bold">Poin:</span>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={q.points}
                            onChange={(e) => handlePointsChange(idx, e.target.value)}
                            className="w-12 px-1 py-0.5 border border-slate-300 rounded-md text-center font-black text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                          />
                        </div>

                        {/* Duplikat Soal */}
                        <button
                          type="button"
                          onClick={() => handleDuplicateQuestion(idx)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Duplikat Butir Soal ini"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {/* Hapus Soal */}
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(idx)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Hapus Butir Soal ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Area Teks Pertanyaan & Tombol Sisipkan Gambar (Ala Microsoft Forms) */}
                    <div className="space-y-2">
                      <div className="relative">
                        <textarea
                          rows={2}
                          required
                          value={q.questionText}
                          onChange={(e) => handleQuestionTextChange(idx, e.target.value)}
                          placeholder="Tuliskan teks pertanyaan soal di sini..."
                          className="w-full px-3.5 py-2.5 pr-11 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white leading-relaxed placeholder:text-slate-400"
                        />

                        {/* Tombol Sisipkan Gambar Soal (Microsoft Forms Icon) */}
                        <label
                          className="absolute right-2.5 top-2.5 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition"
                          title="Sisipkan Gambar pada Soal ini"
                        >
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleQuestionImageUpload(idx, e.target.files[0]);
                              }
                            }}
                          />
                          <ImageIcon className="w-4 h-4" />
                        </label>
                      </div>

                      {/* Pratinjau Gambar Soal (Jika Ada) */}
                      {q.imageUrl && (
                        <div className="relative inline-block border-2 border-indigo-100 rounded-2xl p-2 bg-indigo-50/30 group">
                          <img
                            src={resolveImageUrl(q.imageUrl)}
                            alt="Pratinjau Gambar Soal"
                            className="max-h-48 rounded-xl object-contain border border-slate-200 bg-white shadow-2xs"
                          />
                          <div className="flex items-center justify-between gap-2 pt-1.5 px-1">
                            <span className="text-[10px] text-slate-500 font-mono">Gambar Soal Terlampir</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestionImage(idx)}
                              className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" /> Hapus Gambar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Area Pilihan Jawaban (Dinamis: Tambah/Hapus Opsi & Gambar per Opsi) */}
                    {q.questionType === 'MULTIPLE_CHOICE' && (
                      <div className="space-y-2 pt-1">
                        <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
                          <span>Pilihan Jawaban (Klik lingkaran untuk memilih kunci jawaban):</span>
                          <span className="text-slate-400 font-normal">Kunci: Opsi {q.correctOption}</span>
                        </div>

                        <div className="space-y-2">
                          {q.options.map((opt, optIdx) => {
                            const isCorrect = q.correctOption === opt.label;
                            return (
                              <div key={opt.id || opt.label} className="space-y-1.5">
                                <div className="flex items-center gap-2 group">
                                  {/* Radio Kunci Jawaban (Checkmark Hijau ala MS Forms) */}
                                  <button
                                    type="button"
                                    onClick={() => handleCorrectOptionChange(idx, opt.label)}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition shrink-0 ${
                                      isCorrect
                                        ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs'
                                        : 'border-slate-300 hover:border-indigo-400 bg-white'
                                    }`}
                                    title={isCorrect ? 'Kunci Jawaban Benar' : 'Klik untuk jadikan Kunci Jawaban'}
                                  >
                                    {isCorrect && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                  </button>

                                  {/* Label Opsi */}
                                  <span className="w-5 font-black text-xs text-slate-700">{opt.label}.</span>

                                  {/* Input Teks Opsi */}
                                  <div className="flex-1 relative flex items-center">
                                    <input
                                      type="text"
                                      required
                                      value={opt.text}
                                      onChange={(e) => handleOptionTextChange(idx, optIdx, e.target.value)}
                                      placeholder={`Pilihan jawaban ${opt.label}`}
                                      className="w-full px-3 py-2 pr-9 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />

                                    {/* Tombol Sisipkan Gambar Opsi (MS Forms Style) */}
                                    <label
                                      className="absolute right-2 p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg cursor-pointer transition"
                                      title="Sisipkan Gambar pada Opsi ini"
                                    >
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                          if (e.target.files?.[0]) {
                                            handleOptionImageUpload(idx, optIdx, e.target.files[0]);
                                          }
                                        }}
                                      />
                                      <ImageIcon className="w-4 h-4" />
                                    </label>
                                  </div>

                                  {/* Tombol Hapus Opsi (MS Forms Trash) */}
                                  <button
                                    type="button"
                                    disabled={q.options.length <= 2}
                                    onClick={() => handleRemoveOption(idx, optIdx)}
                                    className={`p-1.5 rounded-lg transition shrink-0 ${
                                      q.options.length <= 2
                                        ? 'text-slate-300 cursor-not-allowed'
                                        : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                    }`}
                                    title={q.options.length <= 2 ? 'Minimal 2 opsi' : 'Hapus Opsi ini'}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>

                                {/* Pratinjau Gambar Opsi jika ada */}
                                {opt.imageUrl && (
                                  <div className="ml-8 inline-flex items-center gap-2 p-1.5 rounded-xl border border-slate-200 bg-slate-50 shadow-2xs">
                                    <img
                                      src={resolveImageUrl(opt.imageUrl)}
                                      alt={`Gambar Opsi ${opt.label}`}
                                      className="h-16 w-16 object-contain rounded-lg border border-slate-200 bg-white"
                                    />
                                    <div className="pr-2">
                                      <div className="text-[10px] text-slate-500 font-mono">Gambar Opsi {opt.label}</div>
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveOptionImage(idx, optIdx)}
                                        className="text-[11px] font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 mt-0.5"
                                      >
                                        <X className="w-3 h-3" /> Hapus Gambar
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Tombol Tambahkan Opsi (MS Forms Style) */}
                        <div className="pt-1.5 ml-8">
                          <button
                            type="button"
                            onClick={() => handleAddOption(idx)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-xs font-bold transition hover:border-indigo-400 shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambahkan Opsi
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Bar Bawah Ringkasan Total Poin & Sisipkan Pertanyaan Baru */}
              <div className="p-3.5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-600 font-medium">
                  Total keseluruhan: <span className="font-black text-slate-900">{questions.length} Butir Soal</span> • Akumulasi: <span className="font-black text-indigo-600">{totalPoints} Poin</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('MULTIPLE_CHOICE')}
                    className="px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Sisipkan Pilihan Ganda
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('ESSAY')}
                    className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" /> Sisipkan Esai
                  </button>
                </div>
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
