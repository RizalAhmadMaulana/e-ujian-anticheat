import React, { useState, useEffect, useMemo } from 'react';
import { useExamStore } from '../../store/useExamStore';
import { formatExternalExamUrl, isValidExamUrl } from '../../utils/urlEmbedFormatter';
import { 
  getPackagesApi, 
  createPackageApi, 
  updatePackageApi, 
  deletePackageApi, 
  uploadExamImageApi,
  importDocxQuestionsApi,
  importExcelQuestionsApi,
  downloadQuestionTemplateExcelApi
} from '../../api/examApi';
import { resolveImageUrl } from '../../utils/imageUrlFormatter';
import { getClassroomsApi } from '../../api/authApi';
import Modal from '../../components/common/Modal';
import MathText from '../../components/common/MathText';
import FormulaToolbar from '../../components/common/FormulaToolbar';
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
  Check,
  FileSpreadsheet,
  FileText,
  Download,
  UploadCloud,
  CheckSquare,
  ListOrdered,
  Sigma,
  Grid,
  GitCompare,
  Search,
  ChevronDown,
  ArrowRight,
  Info
} from 'lucide-react';

export default function ExamPackageList() {
  const { examPackages, addExamPackage, fetchPackages } = useExamStore();

  const [classroomsList, setClassroomsList] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'NATIVE_QUESTIONS' | 'EXTERNAL_LINK'

  // Form State
  const [examType, setExamType] = useState('NATIVE_QUESTIONS'); // 'NATIVE_QUESTIONS' | 'EXTERNAL_LINK'
  const [title, setTitle] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [targetClassroom, setTargetClassroom] = useState('');
  const [platform, setPlatform] = useState('GOOGLE_FORMS'); // 'GOOGLE_FORMS' | 'MICROSOFT_FORMS'
  const [rawExternalUrl, setRawExternalUrl] = useState('');

  // Import Modal State (Word .docx & Excel .xlsx)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importFormat, setImportFormat] = useState('EXCEL'); // 'EXCEL' | 'DOCX'
  const [importTitle, setImportTitle] = useState('');
  const [importSubject, setImportSubject] = useState('');
  const [importTargetPkgId, setImportTargetPkgId] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');

  // Formula Toolbar Active Target: { qIdx, optIdx, field: 'questionText' | 'optionText' }
  const [activeFormulaTarget, setActiveFormulaTarget] = useState(null);

  // Quick Add Question Dropdown Toggle (Khusus Mobile/Desktop)
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

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
      correctOptions: ['A'],
      exactKeys: '',
      matrixRows: [
        { statement: '', correct: true },
        { statement: '', correct: false },
      ],
      matchingPairs: [
        { left: '', right: '' },
        { left: '', right: '' },
      ],
    },
  ]);

  // Akumulasi Poin Real-time
  const totalPoints = useMemo(() => {
    return questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0);
  }, [questions]);

  // Format URL Embed External
  const formattedEmbedUrl = useMemo(() => {
    if (!rawExternalUrl.trim()) return '';
    return formatExternalExamUrl(rawExternalUrl, platform);
  }, [rawExternalUrl, platform]);

  // Filter List Paket Ujian
  const filteredPackages = useMemo(() => {
    return examPackages.filter((pkg) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = 
        !q ||
        (pkg.title || '').toLowerCase().includes(q) ||
        (pkg.subjectName || pkg.subject_name || '').toLowerCase().includes(q) ||
        (pkg.targetClassroom || pkg.target_classroom || '').toLowerCase().includes(q);

      const pkgType = pkg.examType || pkg.exam_type || 'NATIVE_QUESTIONS';
      const matchType = 
        typeFilter === 'ALL' ||
        (typeFilter === 'NATIVE_QUESTIONS' && pkgType === 'NATIVE_QUESTIONS') ||
        (typeFilter === 'EXTERNAL_LINK' && pkgType === 'EXTERNAL_LINK');

      return matchSearch && matchType;
    });
  }, [examPackages, searchQuery, typeFilter]);

  // Tambah Butir Soal Baru berdasarkan Tipe
  const handleAddQuestion = (type = 'MULTIPLE_CHOICE') => {
    let options = [];
    let correctOption = 'A';
    let correctOptions = ['A'];
    let exactKeys = '';
    let matrixRows = [];
    let matchingPairs = [];

    if (type === 'MULTIPLE_CHOICE' || type === 'MULTIPLE_CHOICE_COMPLEX') {
      options = [
        { id: `opt-${Date.now()}-1`, label: 'A', text: '', imageUrl: '' },
        { id: `opt-${Date.now()}-2`, label: 'B', text: '', imageUrl: '' },
        { id: `opt-${Date.now()}-3`, label: 'C', text: '', imageUrl: '' },
        { id: `opt-${Date.now()}-4`, label: 'D', text: '', imageUrl: '' },
      ];
    } else if (type === 'TRUE_FALSE_MATRIX') {
      matrixRows = [
        { statement: '', correct: true },
        { statement: '', correct: false },
      ];
    } else if (type === 'MATCHING_PAIR') {
      matchingPairs = [
        { left: '', right: '' },
        { left: '', right: '' },
      ];
    }

    setQuestions((prev) => [
      ...prev,
      {
        id: `q-${Date.now()}-${prev.length + 1}`,
        questionType: type,
        questionText: '',
        imageUrl: '',
        points: 20,
        options,
        correctOption,
        correctOptions,
        exactKeys,
        matrixRows,
        matchingPairs,
      },
    ]);
    setIsTypeDropdownOpen(false);
  };

  // Helper Sisipkan Rumus KaTeX
  const handleInsertFormula = (latexSyntax) => {
    if (!activeFormulaTarget) return;
    const { qIdx, optIdx, field } = activeFormulaTarget;
    const updated = [...questions];
    if (field === 'questionText') {
      const current = updated[qIdx].questionText || '';
      updated[qIdx].questionText = `${current} $${latexSyntax}$ `;
    } else if (field === 'optionText' && optIdx !== undefined) {
      const current = updated[qIdx].options[optIdx]?.text || '';
      updated[qIdx].options[optIdx].text = `${current} $${latexSyntax}$ `;
    }
    setQuestions(updated);
  };

  // Handler Pilihan Ganda Kompleks (Checkbox)
  const handleToggleComplexOption = (qIdx, label) => {
    const updated = [...questions];
    const current = updated[qIdx].correctOptions || [];
    if (current.includes(label)) {
      if (current.length <= 1) {
        alert('Minimal harus ada 1 opsi jawaban yang benar!');
        return;
      }
      updated[qIdx].correctOptions = current.filter((x) => x !== label);
    } else {
      updated[qIdx].correctOptions = [...current, label];
    }
    setQuestions(updated);
  };

  // Handler Tabel Benar/Salah (Matrix)
  const handleAddMatrixRow = (qIdx) => {
    const updated = [...questions];
    const rows = updated[qIdx].matrixRows || [];
    updated[qIdx].matrixRows = [...rows, { statement: '', correct: true }];
    setQuestions(updated);
  };

  const handleRemoveMatrixRow = (qIdx, rIdx) => {
    const updated = [...questions];
    const rows = [...(updated[qIdx].matrixRows || [])];
    if (rows.length <= 1) {
      alert('Tabel Benar/Salah minimal harus memiliki 1 baris pernyataan.');
      return;
    }
    rows.splice(rIdx, 1);
    updated[qIdx].matrixRows = rows;
    setQuestions(updated);
  };

  const handleMatrixStatementChange = (qIdx, rIdx, val) => {
    const updated = [...questions];
    updated[qIdx].matrixRows[rIdx].statement = val;
    setQuestions(updated);
  };

  const handleMatrixCorrectChange = (qIdx, rIdx, val) => {
    const updated = [...questions];
    updated[qIdx].matrixRows[rIdx].correct = val;
    setQuestions(updated);
  };

  // Handler Menjodohkan (Matching Pair)
  const handleAddMatchingPair = (qIdx) => {
    const updated = [...questions];
    const pairs = updated[qIdx].matchingPairs || [];
    updated[qIdx].matchingPairs = [...pairs, { left: '', right: '' }];
    setQuestions(updated);
  };

  const handleRemoveMatchingPair = (qIdx, pIdx) => {
    const updated = [...questions];
    const pairs = [...(updated[qIdx].matchingPairs || [])];
    if (pairs.length <= 1) {
      alert('Soal menjodohkan minimal harus memiliki 1 pasangan pernyataan.');
      return;
    }
    pairs.splice(pIdx, 1);
    updated[qIdx].matchingPairs = pairs;
    setQuestions(updated);
  };

  const handleMatchingPairChange = (qIdx, pIdx, side, val) => {
    const updated = [...questions];
    updated[qIdx].matchingPairs[pIdx][side] = val;
    setQuestions(updated);
  };

  const handleExactKeysChange = (qIdx, val) => {
    const updated = [...questions];
    updated[qIdx].exactKeys = val;
    setQuestions(updated);
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

  // Manajemen Opsi Jawaban Dinamis
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

    const reindexed = currentOptions.map((opt, i) => ({
      ...opt,
      label: String.fromCharCode(65 + i),
    }));
    updated[qIndex].options = reindexed;

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

  // Unduh Berkas Template Excel
  const handleDownloadExcelTemplate = async () => {
    try {
      const blob = await downloadQuestionTemplateExcelApi();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Template_Import_Soal_E-Ujian.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Gagal mengunduh template Excel: ' + (err.message || 'Error jaringan'));
    }
  };

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
        correctOptions: ['A'],
        exactKeys: '',
        matrixRows: [],
        matchingPairs: [],
      },
    ]);
    setActiveFormulaTarget(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (pkg) => {
    setIsEditing(true);
    setEditingPackageId(pkg.id);
    setTitle(pkg.title || '');
    setSubjectName(pkg.subjectName || pkg.subject_name || '');
    setTargetClassroom(pkg.targetClassroom || pkg.target_classroom || (classroomsList[0]?.name || 'Semua Kelas'));
    setExamType(pkg.examType || pkg.exam_type || 'NATIVE_QUESTIONS');
    setRawExternalUrl(pkg.externalUrl || pkg.external_url || '');

    if (pkg.questions && pkg.questions.length > 0) {
      setQuestions(
        pkg.questions.map((q, idx) => {
          const qType = q.question_type || q.questionType || 'MULTIPLE_CHOICE';
          const extra = q.extra_data || q.extraData || {};
          
          let exactKeys = '';
          if (extra.exact_keys) {
            exactKeys = Array.isArray(extra.exact_keys) ? extra.exact_keys.join(' / ') : String(extra.exact_keys);
          }

          let matrixRows = [];
          if (extra.rows && Array.isArray(extra.rows)) {
            matrixRows = extra.rows.map((r) => ({
              statement: r.statement || '',
              correct: Boolean(r.correct !== undefined ? r.correct : r.is_correct),
            }));
          }

          let matchingPairs = [];
          if (extra.pairs && Array.isArray(extra.pairs)) {
            matchingPairs = extra.pairs.map((p) => ({
              left: p.left || '',
              right: p.right || '',
            }));
          }

          const opts = (q.options || []).map((opt, oIdx) => ({
            id: opt.id || `opt-${idx}-${oIdx}`,
            label: opt.option_label || opt.label || String.fromCharCode(65 + oIdx),
            text: opt.option_text || opt.text || '',
            imageUrl: opt.image_url || opt.imageUrl || '',
            isCorrect: Boolean(opt.is_correct || opt.isCorrect),
          }));

          const correctOption = opts.find((o) => o.isCorrect)?.label || opts[0]?.label || 'A';
          const correctOptions = opts.filter((o) => o.isCorrect).map((o) => o.label);

          return {
            id: q.id || `q-${idx}`,
            questionType: qType,
            questionText: q.text || q.questionText || '',
            imageUrl: q.image_url || q.imageUrl || '',
            points: Number(q.points) || 20,
            options: opts,
            correctOption,
            correctOptions: correctOptions.length > 0 ? correctOptions : ['A'],
            exactKeys,
            matrixRows,
            matchingPairs,
          };
        })
      );
    } else {
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
          correctOptions: ['A'],
          exactKeys: '',
          matrixRows: [],
          matchingPairs: [],
        },
      ]);
    }
    setActiveFormulaTarget(null);
    setIsAddModalOpen(true);
  };

  const handleOpenImportModal = (targetPkgId = null) => {
    setImportTargetPkgId(targetPkgId || '');
    setImportFile(null);
    setImportFormat('EXCEL');
    setImportTitle('');
    setImportSubject('');
    setImportMessage('');
    setIsImportModalOpen(true);
  };

  const handleExecuteImport = async (e) => {
    e.preventDefault();
    if (!importFile) {
      alert('Mohon pilih berkas soal Word (.docx) atau Excel (.xlsx) terlebih dahulu.');
      return;
    }

    setIsImporting(true);
    setImportMessage('');

    try {
      let res;
      if (importFormat === 'DOCX') {
        res = await importDocxQuestionsApi(importFile, importTargetPkgId || null, importTitle, importSubject);
      } else {
        res = await importExcelQuestionsApi(importFile, importTargetPkgId || null, importTitle, importSubject);
      }

      alert(res.message || 'Import soal massal berhasil diproses!');
      setIsImportModalOpen(false);
      await fetchPackages?.();
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.detail || err.message;
      setImportMessage(`Gagal import: ${errMsg}`);
    } finally {
      setIsImporting(false);
    }
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
      const hasEmptyQuestion = questions.some((q) => !q.questionText.trim());
      if (hasEmptyQuestion) {
        alert('Mohon lengkapi seluruh teks pertanyaan pada butir soal.');
        return;
      }

      const questionsPayload = questions.map((q, idx) => {
        const extraData = {};
        let options = [];

        if (q.questionType === 'MULTIPLE_CHOICE') {
          options = (q.options || []).map((opt) => ({
            option_label: opt.label,
            option_text: opt.text,
            image_url: opt.imageUrl || null,
            is_correct: opt.label === q.correctOption,
          }));
        } else if (q.questionType === 'MULTIPLE_CHOICE_COMPLEX') {
          const correctSet = new Set(q.correctOptions || []);
          options = (q.options || []).map((opt) => ({
            option_label: opt.label,
            option_text: opt.text,
            image_url: opt.imageUrl || null,
            is_correct: correctSet.has(opt.label),
          }));
        } else if (q.questionType === 'SHORT_ANSWER') {
          const rawKeys = q.exactKeys || '';
          extraData.exact_keys = rawKeys
            .split('/')
            .map((s) => s.trim())
            .filter(Boolean);
        } else if (q.questionType === 'TRUE_FALSE_MATRIX') {
          extraData.rows = (q.matrixRows || []).map((r) => ({
            statement: r.statement,
            correct: Boolean(r.correct),
          }));
        } else if (q.questionType === 'MATCHING_PAIR') {
          extraData.pairs = (q.matchingPairs || []).map((p) => ({
            left: p.left,
            right: p.right,
          }));
        }

        return {
          question_type: q.questionType,
          text: q.questionText,
          image_url: q.imageUrl || null,
          points: Number(q.points) || 20,
          order: idx + 1,
          options,
          extra_data: extraData,
        };
      });

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

  const typeLabels = {
    MULTIPLE_CHOICE: 'Pilihan Ganda (1 Benar)',
    MULTIPLE_CHOICE_COMPLEX: 'Pilihan Ganda Kompleks (Multi-Centang)',
    SHORT_ANSWER: 'Isian Singkat (Exact Match)',
    TRUE_FALSE_MATRIX: 'Tabel Benar / Salah',
    MATCHING_PAIR: 'Menjodohkan Pasangan',
    ESSAY: 'Uraian / Esai',
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ======================================================== */}
      {/* 1. HEADER HALAMAN BANK SOAL & AKSI (BERSIH & RESPONSIF)  */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                <FolderKanban className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                Bank Soal & Paket Ujian
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl">
              Kelola lembar asesmen mandiri berstandar Kurikulum Merdeka (AKM/ANBK 6 tipe soal), editor rumus matematika KaTeX, fasilitas impor massal Word & Excel, serta integrasi Google Form.
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
            {/* Tombol Utama Tambah Paket Baru */}
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-2xl text-xs sm:text-sm font-black shadow-md shadow-indigo-600/25 transition order-1 sm:order-3"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Tambah Paket Baru</span>
            </button>

            {/* Tombol Impor Soal Massal */}
            <button
              type="button"
              onClick={() => handleOpenImportModal(null)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border-2 border-blue-200 rounded-2xl text-xs sm:text-sm font-bold transition order-2"
              title="Import butir soal dari berkas Word (.docx) atau Excel (.xlsx)"
            >
              <UploadCloud className="w-4 h-4 text-blue-600" />
              <span>Import Soal (.docx / .xlsx)</span>
            </button>

            {/* Tombol Unduh Template Excel */}
            <button
              type="button"
              onClick={handleDownloadExcelTemplate}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-2 border-emerald-200 rounded-2xl text-xs sm:text-sm font-bold transition order-3 sm:order-1"
              title="Unduh format template Excel resmi untuk impor soal"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Template Excel</span>
              <span className="sm:hidden">Unduh Template</span>
            </button>
          </div>
        </div>

        {/* Filter Bar & Search Box */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tab Filter Tipe Paket */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                typeFilter === 'ALL'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Paket ({examPackages.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('NATIVE_QUESTIONS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                typeFilter === 'NATIVE_QUESTIONS'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Soal Mandiri (AKM)
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('EXTERNAL_LINK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-1.5 ${
                typeFilter === 'EXTERNAL_LINK'
                  ? 'bg-white text-purple-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              Google Form / Teams
            </button>
          </div>

          {/* Search Box Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Cari judul atau mapel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 hover:bg-white border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold focus:outline-none transition shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. GRID KARTU PAKET UJIAN                                */}
      {/* ======================================================== */}
      {filteredPackages.length === 0 ? (
        <div className="py-14 sm:py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200 shadow-xs p-6 space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
            <FolderKanban className="w-7 h-7" />
          </div>
          <h3 className="font-black text-slate-800 text-base sm:text-lg">
            {searchQuery ? 'Tidak Ada Paket yang Cocok' : 'Belum Ada Paket Soal'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `Pencarian "${searchQuery}" tidak menemukan paket soal. Coba gunakan kata kunci lain.`
              : 'Mulai dengan membuat paket soal mandiri baru atau import massal dari berkas Word/Excel.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={() => handleOpenImportModal(null)}
              className="px-4 py-2 bg-blue-50 text-blue-800 border border-blue-200 font-bold text-xs rounded-xl hover:bg-blue-100 transition flex items-center gap-1.5"
            >
              <UploadCloud className="w-4 h-4" /> Import Word / Excel
            </button>
            <button
              onClick={handleOpenAdd}
              className="px-5 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Tambah Paket Baru
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {filteredPackages.map((pkg) => {
            const pkgTitle = pkg.title;
            const pkgSubject = pkg.subjectName || pkg.subject_name || '-';
            const pkgExamType = pkg.examType || pkg.exam_type || 'NATIVE_QUESTIONS';
            const pkgClass = pkg.targetClassroom || pkg.target_classroom || '';
            const pkgUrl = pkg.externalUrl || pkg.external_url || '';
            const pkgDate = pkg.createdAt || pkg.created_at;
            const formattedDate = pkgDate ? new Date(pkgDate).toLocaleDateString('id-ID') : '-';
            const questionCount = pkg.questions?.length || 0;

            return (
              <div
                key={pkg.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border-2 border-slate-300 hover:border-indigo-600 shadow-md hover:shadow-2xl hover:shadow-indigo-500/20 hover:ring-4 hover:ring-indigo-500/15 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between space-y-4 group relative"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[11px] font-black px-3 py-1 rounded-xl flex items-center gap-1.5 border-2 shadow-xs transition-colors ${
                        pkgExamType === 'NATIVE_QUESTIONS'
                          ? 'bg-emerald-100 text-emerald-950 border-emerald-400 group-hover:bg-emerald-200 group-hover:border-emerald-500'
                          : 'bg-purple-100 text-purple-950 border-purple-400 group-hover:bg-purple-200 group-hover:border-purple-500'
                      }`}
                    >
                      {pkgExamType === 'NATIVE_QUESTIONS' ? (
                        <>
                          <BookOpen className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Soal Mandiri (AKM Ready)</span>
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-3.5 h-3.5 text-purple-700" />
                          <span>Google Form</span>
                        </>
                      )}
                    </span>
                    {pkgClass && (
                      <span className="text-[11px] font-black px-3 py-1 rounded-xl bg-slate-100 text-slate-800 border-2 border-slate-300 uppercase tracking-wider shadow-xs">
                        {pkgClass}
                      </span>
                    )}
                  </div>

                  {/* Judul & Mapel */}
                  <h3 className="font-black text-slate-900 text-base sm:text-lg leading-snug mb-1 group-hover:text-indigo-600 transition-colors">
                    {pkgTitle}
                  </h3>
                  <div className="text-xs sm:text-sm text-slate-600 font-bold mb-3">
                    Mata Pelajaran: <span className="text-indigo-700 font-black">{pkgSubject}</span>
                  </div>

                  {/* Informasi Konten Soal */}
                  {pkgExamType === 'NATIVE_QUESTIONS' ? (
                    <div className="p-4 rounded-2xl bg-slate-50/90 border-2 border-slate-200 group-hover:border-slate-300 text-xs text-slate-700 space-y-2 mb-2 shadow-xs transition-colors">
                      <div className="flex items-center justify-between font-black">
                        <span className="text-slate-600">Jumlah Butir Soal:</span>
                        <span className="text-emerald-900 font-black bg-emerald-100 border-2 border-emerald-300 px-2.5 py-0.5 rounded-lg text-xs shadow-2xs">
                          {questionCount} Soal
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                        Mendukung Pilgan Kompleks, Isian Singkat, Benar/Salah, Menjodohkan & Rumus KaTeX.
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-purple-50/80 border-2 border-purple-200 group-hover:border-purple-300 text-xs text-purple-950 space-y-2 mb-2 shadow-xs transition-colors">
                      <div className="font-black flex items-center gap-1.5 text-purple-900 text-xs">
                        <ExternalLink className="w-3.5 h-3.5 text-purple-700" />
                        <span>Link Terproteksi (Secure Iframe):</span>
                      </div>
                      <div className="font-mono text-xs text-purple-950 truncate bg-white p-2.5 rounded-xl border-2 border-purple-200 font-bold shadow-2xs">
                        {pkgUrl || '-'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Kartu & Tombol Aksi */}
                <div className="pt-3.5 border-t-2 border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-400">
                    Dibuat: {formattedDate}
                  </span>

                  <div className="flex items-center gap-2">
                    {pkgExamType === 'NATIVE_QUESTIONS' && (
                      <button
                        onClick={() => handleOpenImportModal(pkg.id)}
                        className="px-3 py-1.5 text-xs font-black text-blue-800 bg-blue-50 hover:bg-blue-100 border-2 border-blue-200 hover:border-blue-300 rounded-xl transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
                        title="Import butir soal tambahan ke paket ini"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                        <span>+ Import</span>
                      </button>
                    )}
                    {pkgExamType === 'EXTERNAL_LINK' && (
                      <button
                        onClick={() => handleOpenPreview(pkgUrl)}
                        className="px-3 py-1.5 text-xs font-black text-purple-800 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 hover:border-purple-300 rounded-xl transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5 text-purple-600" />
                        <span>Preview</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenEdit(pkg)}
                      className="px-3 py-1.5 text-xs font-black text-amber-800 bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 hover:border-amber-300 rounded-xl transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
                      title="Edit Data Paket Soal"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDeletePackage(pkg.id, pkgTitle)}
                      className="p-1.5 text-rose-600 bg-rose-50 hover:bg-rose-100 border-2 border-rose-200 hover:border-rose-300 rounded-xl transition-all shadow-xs active:scale-95"
                      title="Hapus Paket Soal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MODAL IMPORT SOAL MASSAL (WORD .DOCX & EXCEL .XLSX)   */}
      {/* ======================================================== */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Butir Soal Massal (Word & Excel)"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleExecuteImport} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs leading-relaxed flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              Fitur ini mengekstrak nomor soal, narasi soal, rumus matematika KaTeX ($...$), pilihan jawaban A-E, dan penanda kunci jawaban secara otomatis ke dalam paket ujian.
            </div>
          </div>

          {/* Pemilihan Format Berkas */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Pilih Format Berkas:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setImportFormat('EXCEL')}
                className={`p-3.5 rounded-2xl border-2 text-left flex items-center gap-3 transition ${
                  importFormat === 'EXCEL'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <FileSpreadsheet className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Microsoft Excel (.xlsx)</div>
                  <div className="text-[10px] text-slate-500 font-normal">Format kolom terstruktur</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setImportFormat('DOCX')}
                className={`p-3.5 rounded-2xl border-2 text-left flex items-center gap-3 transition ${
                  importFormat === 'DOCX'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <FileText className="w-6 h-6 text-blue-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold">Microsoft Word (.docx)</div>
                  <div className="text-[10px] text-slate-500 font-normal">Format nomor standar</div>
                </div>
              </button>
            </div>
          </div>

          {/* Target Paket Ujian */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Target Penyimpanan:
            </label>
            <select
              value={importTargetPkgId}
              onChange={(e) => setImportTargetPkgId(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
            >
              <option value="">+ Buat Paket Ujian Baru dari Berkas Ini</option>
              {examPackages
                .filter((p) => (p.examType || p.exam_type) === 'NATIVE_QUESTIONS')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    Tambahkan ke: {p.title} ({p.subjectName || p.subject_name})
                  </option>
                ))}
            </select>
          </div>

          {!importTargetPkgId && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Judul Paket Baru:
                </label>
                <input
                  type="text"
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                  placeholder="Contoh: Asesmen Sumatif IPA"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mata Pelajaran:
                </label>
                <input
                  type="text"
                  value={importSubject}
                  onChange={(e) => setImportSubject(e.target.value)}
                  placeholder="Contoh: Ilmu Pengetahuan Alam"
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>
          )}

          {/* Upload Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Pilih Berkas {importFormat === 'DOCX' ? 'Word (.docx)' : 'Excel (.xlsx)'}:
            </label>
            <input
              type="file"
              required
              accept={importFormat === 'DOCX' ? '.docx' : '.xlsx,.xlsm'}
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer border border-slate-300 rounded-2xl p-1.5 bg-white"
            />
          </div>

          {importFormat === 'EXCEL' && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-600 font-medium">Belum memiliki format template Excel?</span>
              <button
                type="button"
                onClick={handleDownloadExcelTemplate}
                className="text-emerald-700 hover:text-emerald-800 font-bold underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Unduh Template
              </button>
            </div>
          )}

          {importMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
              {importMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isImporting}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
            >
              {isImporting ? (
                <span>Mengekstrak Soal...</span>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Mulai Import Soal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 4. MODAL BUAT / EDIT PAKET UJIAN BARU (REDESAIN TOTAL)   */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={isEditing ? 'Edit Data Paket Ujian' : 'Buat Paket Ujian Baru (Hybrid Mode)'}
        maxWidth="max-w-5xl"
      >
        <form onSubmit={handleSavePackage} className="space-y-6">
          {/* SECTION A: SUMBER SOAL & IDENTITAS PAKET */}
          <div className="bg-slate-50/90 rounded-3xl p-4 sm:p-5 border-2 border-slate-200 space-y-4">
            {/* Pilihan Sumber Soal */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                1. Pilih Sumber Soal Ujian:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setExamType('NATIVE_QUESTIONS')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition flex items-start gap-3 ${
                    examType === 'NATIVE_QUESTIONS'
                      ? 'border-indigo-600 bg-white text-indigo-950 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      examType === 'NATIVE_QUESTIONS'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-xs sm:text-sm">Soal Mandiri (Standar AKM)</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-medium leading-relaxed">
                      6 ragam soal (Pilgan, Kompleks, Isian, Benar/Salah, Menjodohkan, Esai) & rumus KaTeX
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExamType('EXTERNAL_LINK')}
                  className={`p-3.5 rounded-2xl border-2 text-left transition flex items-start gap-3 ${
                    examType === 'EXTERNAL_LINK'
                      ? 'border-purple-600 bg-white text-purple-950 shadow-md ring-2 ring-purple-500/20'
                      : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      examType === 'EXTERNAL_LINK'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <ExternalLink className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-xs sm:text-sm">Google Form / MS Teams</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-medium leading-relaxed">
                      Sematkan tautan form eksternal dalam bingkai terproteksi anti-curang
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Input Identitas Paket */}
            <div>
              <label className="block text-xs font-black uppercase text-slate-700 tracking-wider mb-2">
                2. Informasi Paket Asesmen:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Judul Paket Ujian *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Asesmen Sumatif Tengah Semester"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Mata Pelajaran *
                  </label>
                  <input
                    type="text"
                    required
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="Contoh: Ilmu Pengetahuan Alam"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Kelas Peserta *
                  </label>
                  <select
                    value={targetClassroom}
                    onChange={(e) => setTargetClassroom(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                  >
                    {classroomsList.length > 0 ? (
                      classroomsList.map((c) => (
                        <option key={c.id} value={c.name}>
                          Kelas {c.name}
                        </option>
                      ))
                    ) : (
                      <option value="Semua Kelas">Semua Kelas</option>
                    )}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION B1: FORMULIR LINK GOOGLE FORM / TEAMS */}
          {examType === 'EXTERNAL_LINK' && (
            <div className="p-5 rounded-3xl bg-purple-50/70 border-2 border-purple-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-purple-900 tracking-wider">
                  Pengaturan Formulir Online
                </span>
                <span className="text-[11px] font-bold text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-lg border border-purple-300">
                  Secure Iframe Protected
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tempelkan URL Google Form atau Microsoft Forms:
                </label>
                <input
                  type="url"
                  required
                  value={rawExternalUrl}
                  onChange={(e) => setRawExternalUrl(e.target.value)}
                  placeholder="https://docs.google.com/forms/d/e/.../viewform"
                  className="w-full px-3.5 py-2.5 border border-purple-300 rounded-xl text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white shadow-2xs"
                />
              </div>

              {rawExternalUrl && (
                <div className="p-3.5 rounded-2xl bg-white border border-purple-200 text-xs space-y-2.5 shadow-xs">
                  <div className="text-[11px] text-slate-500 font-bold">
                    Hasil Konversi Sematan Otomatis (Embedded Mode):
                  </div>
                  <div className="font-mono text-purple-900 text-xs truncate bg-purple-50 p-2.5 rounded-xl border border-purple-200 font-bold">
                    {formattedEmbedUrl}
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(formattedEmbedUrl)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Eye className="w-3.5 h-3.5" /> Uji Tampilan Formulir
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION B2: BUILDER BUTIR SOAL MANDIRI */}
          {examType === 'NATIVE_QUESTIONS' && (
            <div className="space-y-4">
              {/* Header Bar Pertanyaan & Toolbar Tambah Soal Responsif */}
              <div className="bg-white rounded-2xl p-4 border-2 border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Daftar Butir Soal ({questions.length} Butir)
                    </span>
                    <div
                      className={`px-3 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 shadow-2xs ${
                        totalPoints === 100
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Total Nilai: {totalPoints} Poin</span>
                      {totalPoints === 100 && (
                        <span className="text-[10px] text-emerald-600 font-bold ml-0.5">✓ 100 Standar</span>
                      )}
                    </div>
                  </div>

                  {/* Dropdown Tambah Soal Cepat (Sangat Rapi & Anti-Penuh di Mobile) */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsTypeDropdownOpen((prev) => !prev)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/20 transition"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Tambah Butir Soal</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {isTypeDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border-2 border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
                        <div className="px-2 py-1 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                          Pilih Ragam Format Soal:
                        </div>
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => handleAddQuestion('MULTIPLE_CHOICE')}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition flex items-center gap-2"
                          >
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            <span>1. Pilihan Ganda (1 Benar)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddQuestion('MULTIPLE_CHOICE_COMPLEX')}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition flex items-center gap-2"
                          >
                            <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                            <span>2. Pilgan Kompleks (Multi-Centang)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddQuestion('SHORT_ANSWER')}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-700 transition flex items-center gap-2"
                          >
                            <ListOrdered className="w-3.5 h-3.5 text-teal-500" />
                            <span>3. Isian Singkat (Exact Match)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddQuestion('TRUE_FALSE_MATRIX')}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition flex items-center gap-2"
                          >
                            <Grid className="w-3.5 h-3.5 text-amber-500" />
                            <span>4. Tabel Benar / Salah</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddQuestion('MATCHING_PAIR')}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-700 transition flex items-center gap-2"
                          >
                            <GitCompare className="w-3.5 h-3.5 text-purple-500" />
                            <span>5. Menjodohkan Pasangan</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddQuestion('ESSAY')}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition flex items-center gap-2"
                          >
                            <Plus className="w-3.5 h-3.5 text-slate-500" />
                            <span>6. Uraian / Esai Terstruktur</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Add Pills Bar (Scrollable di Mobile) */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1 hidden sm:inline">
                    Pintasan Tambah:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('MULTIPLE_CHOICE')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg font-bold text-[11px] text-slate-600 transition shrink-0"
                  >
                    + Pilgan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('MULTIPLE_CHOICE_COMPLEX')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg font-bold text-[11px] text-slate-600 transition shrink-0"
                  >
                    + Kompleks
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('SHORT_ANSWER')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 rounded-lg font-bold text-[11px] text-slate-600 transition shrink-0"
                  >
                    + Isian Singkat
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('TRUE_FALSE_MATRIX')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 rounded-lg font-bold text-[11px] text-slate-600 transition shrink-0"
                  >
                    + Benar/Salah
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('MATCHING_PAIR')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 rounded-lg font-bold text-[11px] text-slate-600 transition shrink-0"
                  >
                    + Menjodohkan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('ESSAY')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-[11px] text-slate-600 transition shrink-0"
                  >
                    + Esai
                  </button>
                </div>
              </div>

              {/* Loop Kartu Butir Soal */}
              <div className="space-y-4">
                {questions.map((q, idx) => {
                  return (
                    <div
                      key={q.id}
                      className="p-4 sm:p-5 rounded-3xl border-2 border-slate-200 bg-white hover:border-indigo-300 shadow-xs transition space-y-4"
                    >
                      {/* Bar Atas Kartu Soal */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-black text-slate-800">
                            {typeLabels[q.questionType] || q.questionType}
                          </span>
                        </div>

                        {/* Kontrol Kanan Kartu Soal */}
                        <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
                          {/* Tombol KaTeX */}
                          <button
                            type="button"
                            onClick={() => {
                              if (activeFormulaTarget?.qIdx === idx && activeFormulaTarget?.field === 'questionText') {
                                setActiveFormulaTarget(null);
                              } else {
                                setActiveFormulaTarget({ qIdx: idx, field: 'questionText' });
                              }
                            }}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition flex items-center gap-1 border ${
                              activeFormulaTarget?.qIdx === idx && activeFormulaTarget?.field === 'questionText'
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600'
                            }`}
                          >
                            <Sigma className="w-3.5 h-3.5" />
                            <span>Rumus KaTeX</span>
                          </button>

                          {/* Input Poin */}
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                            <span className="text-slate-500 font-bold">Poin:</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={q.points}
                              onChange={(e) => handlePointsChange(idx, e.target.value)}
                              className="w-12 px-1 py-0.5 border border-slate-300 rounded-lg text-center font-black text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Duplikat */}
                            <button
                              type="button"
                              onClick={() => handleDuplicateQuestion(idx)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition"
                              title="Duplikat Soal"
                            >
                              <Copy className="w-4 h-4" />
                            </button>

                            {/* Hapus */}
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(idx)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                              title="Hapus Soal"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Formula Toolbar Inline */}
                      {activeFormulaTarget?.qIdx === idx && (
                        <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200 shadow-inner">
                          <FormulaToolbar onInsertFormula={handleInsertFormula} />
                        </div>
                      )}

                      {/* Textarea Pertanyaan & Gambar */}
                      <div className="space-y-2">
                        <div className="relative">
                          <textarea
                            rows={3}
                            required
                            value={q.questionText}
                            onChange={(e) => handleQuestionTextChange(idx, e.target.value)}
                            placeholder="Tuliskan teks pertanyaan soal di sini... (Mendukung rumus KaTeX diapit tanda $...$)"
                            className="w-full px-3.5 py-2.5 pr-11 border border-slate-300 rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white leading-relaxed placeholder:text-slate-400"
                          />

                          <label
                            className="absolute right-3 top-3 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl cursor-pointer transition"
                            title="Sisipkan Gambar pada Soal"
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

                        {/* KaTeX Live Math Preview */}
                        {q.questionText && q.questionText.includes('$') && (
                          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-800">
                            <span className="text-[10px] font-bold text-indigo-600 block mb-1">
                              Pratinjau Tipografi Rumus (KaTeX):
                            </span>
                            <MathText text={q.questionText} />
                          </div>
                        )}

                        {/* Pratinjau Gambar Soal */}
                        {q.imageUrl && (
                          <div className="relative inline-block border border-indigo-100 rounded-2xl p-2 bg-indigo-50/30">
                            <img
                              src={resolveImageUrl(q.imageUrl)}
                              alt="Gambar Soal"
                              className="max-h-48 rounded-xl object-contain border border-slate-200 bg-white shadow-xs"
                            />
                            <div className="flex items-center justify-between gap-2 pt-1.5 px-1">
                              <span className="text-[10px] text-slate-500 font-mono">Gambar Terlampir</span>
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

                      {/* SUB-FORM 1: PILIHAN GANDA BIASA (1 Benar) */}
                      {q.questionType === 'MULTIPLE_CHOICE' && (
                        <div className="space-y-2.5 pt-1">
                          <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between flex-wrap gap-1">
                            <span>Pilihan Jawaban (Klik lingkaran untuk memilih 1 kunci jawaban benar):</span>
                            <span className="text-emerald-700 font-black">Kunci: Opsi {q.correctOption}</span>
                          </div>

                          <div className="space-y-2">
                            {q.options.map((opt, optIdx) => {
                              const isCorrect = q.correctOption === opt.label;
                              return (
                                <div
                                  key={opt.id || opt.label}
                                  className="p-2.5 rounded-2xl bg-slate-50/70 border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-2 group hover:border-slate-300 transition"
                                >
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleCorrectOptionChange(idx, opt.label)}
                                      className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition shrink-0 ${
                                        isCorrect
                                          ? 'border-emerald-500 bg-emerald-500 text-white shadow-xs font-black'
                                          : 'border-slate-300 hover:border-indigo-400 bg-white text-slate-600'
                                      }`}
                                      title={isCorrect ? 'Kunci Jawaban Benar' : 'Klik untuk jadikan Kunci Jawaban'}
                                    >
                                      {isCorrect ? <Check className="w-4 h-4 stroke-[3]" /> : opt.label}
                                    </button>
                                    <span className="sm:hidden font-black text-xs text-slate-700">
                                      Pilihan {opt.label}
                                    </span>
                                  </div>

                                  <div className="flex-1 w-full relative flex items-center">
                                    <input
                                      type="text"
                                      required
                                      value={opt.text}
                                      onChange={(e) => handleOptionTextChange(idx, optIdx, e.target.value)}
                                      placeholder={`Teks pilihan ${opt.label}... (Mendukung rumus $...$)`}
                                      className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                                    />
                                    <label
                                      className="absolute right-2 text-slate-400 hover:text-indigo-600 cursor-pointer p-1"
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
                                      <ImageIcon className="w-3.5 h-3.5" />
                                    </label>
                                  </div>

                                  <div className="flex items-center justify-end gap-1 shrink-0">
                                    {opt.imageUrl && (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveOptionImage(idx, optIdx)}
                                        className="text-[10px] text-red-600 hover:underline px-2"
                                      >
                                        Hapus Gbr
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOption(idx, optIdx)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                                      title="Hapus Opsi ini"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddOption(idx)}
                            className="mt-1 px-4 py-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-dashed border-indigo-300 transition flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambahkan Opsi Pilihan ({String.fromCharCode(65 + q.options.length)})
                          </button>
                        </div>
                      )}

                      {/* SUB-FORM 2: PILIHAN GANDA KOMPLEKS (Multi-Centang) */}
                      {q.questionType === 'MULTIPLE_CHOICE_COMPLEX' && (
                        <div className="space-y-2.5 pt-1">
                          <div className="text-[11px] font-bold text-slate-500 flex items-center justify-between flex-wrap gap-1">
                            <span>Pilihan Jawaban (Centang kotak hijau untuk seluruh kunci jawaban yang benar):</span>
                            <span className="text-blue-700 font-black">
                              Kunci: {q.correctOptions?.join(', ') || '-'}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {q.options.map((opt, optIdx) => {
                              const isChecked = q.correctOptions?.includes(opt.label);
                              return (
                                <div
                                  key={opt.id || opt.label}
                                  className="p-2.5 rounded-2xl bg-slate-50/70 border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-2 group hover:border-slate-300 transition"
                                >
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleComplexOption(idx, opt.label)}
                                      className={`w-7 h-7 rounded-xl border-2 flex items-center justify-center transition shrink-0 ${
                                        isChecked
                                          ? 'border-blue-600 bg-blue-600 text-white shadow-xs font-black'
                                          : 'border-slate-300 hover:border-blue-400 bg-white text-slate-600'
                                      }`}
                                      title={isChecked ? 'Hapus dari Kunci Jawaban' : 'Jadikan Kunci Jawaban'}
                                    >
                                      {isChecked ? <Check className="w-4 h-4 stroke-[3]" /> : opt.label}
                                    </button>
                                    <span className="sm:hidden font-black text-xs text-slate-700">
                                      Pilihan {opt.label}
                                    </span>
                                  </div>

                                  <div className="flex-1 w-full relative flex items-center">
                                    <input
                                      type="text"
                                      required
                                      value={opt.text}
                                      onChange={(e) => handleOptionTextChange(idx, optIdx, e.target.value)}
                                      placeholder={`Teks pilihan ${opt.label}...`}
                                      className="w-full pl-3 pr-10 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                                    />
                                    <label
                                      className="absolute right-2 text-slate-400 hover:text-blue-600 cursor-pointer p-1"
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
                                      <ImageIcon className="w-3.5 h-3.5" />
                                    </label>
                                  </div>

                                  <div className="flex items-center justify-end gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOption(idx, optIdx)}
                                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                                      title="Hapus Opsi ini"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddOption(idx)}
                            className="mt-1 px-4 py-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-xl border border-dashed border-blue-300 transition flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambahkan Opsi Pilihan ({String.fromCharCode(65 + q.options.length)})
                          </button>
                        </div>
                      )}

                      {/* SUB-FORM 3: ISIAN SINGKAT (Exact Match) */}
                      {q.questionType === 'SHORT_ANSWER' && (
                        <div className="space-y-2 pt-1 bg-teal-50/50 p-4 rounded-2xl border border-teal-200">
                          <label className="block text-xs font-bold text-teal-900">
                            Kunci Jawaban Tepat (Toleransi Kata Kunci):
                          </label>
                          <input
                            type="text"
                            required
                            value={q.exactKeys || ''}
                            onChange={(e) => handleExactKeysChange(idx, e.target.value)}
                            placeholder="Contoh: Fotosintesis / fotosintesa / anabolisme"
                            className="w-full px-3.5 py-2.5 border border-teal-300 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold"
                          />
                          <p className="text-[11px] text-teal-800 font-medium">
                            Gunakan garis miring (<strong>/</strong>) untuk memberikan beberapa variasi jawaban benar alternatif. Sistem otomatis mengabaikan huruf besar/kecil (case-insensitive) dan spasi berlebih.
                          </p>
                        </div>
                      )}

                      {/* SUB-FORM 4: TABEL BENAR / SALAH (Matrix) */}
                      {q.questionType === 'TRUE_FALSE_MATRIX' && (
                        <div className="space-y-3 pt-1">
                          <div className="text-[11px] font-bold text-slate-500">
                            Daftar Pernyataan & Kunci Kebenaran:
                          </div>

                          <div className="space-y-2">
                            {(q.matrixRows || []).map((row, rIdx) => (
                              <div
                                key={rIdx}
                                className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3"
                              >
                                <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shrink-0">
                                  {rIdx + 1}
                                </span>

                                <input
                                  type="text"
                                  required
                                  value={row.statement}
                                  onChange={(e) => handleMatrixStatementChange(idx, rIdx, e.target.value)}
                                  placeholder={`Pernyataan ${rIdx + 1}...`}
                                  className="flex-1 w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                                />

                                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                  <div className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-xs font-bold">
                                    <label className="flex items-center gap-1 cursor-pointer text-emerald-700">
                                      <input
                                        type="radio"
                                        name={`matrix-${q.id}-${rIdx}`}
                                        checked={row.correct === true}
                                        onChange={() => handleMatrixCorrectChange(idx, rIdx, true)}
                                        className="text-emerald-600 focus:ring-0"
                                      />
                                      Benar
                                    </label>
                                    <span className="text-slate-300">|</span>
                                    <label className="flex items-center gap-1 cursor-pointer text-rose-700">
                                      <input
                                        type="radio"
                                        name={`matrix-${q.id}-${rIdx}`}
                                        checked={row.correct === false}
                                        onChange={() => handleMatrixCorrectChange(idx, rIdx, false)}
                                        className="text-rose-600 focus:ring-0"
                                      />
                                      Salah
                                    </label>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMatrixRow(idx, rIdx)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddMatrixRow(idx)}
                            className="px-4 py-1.5 text-xs font-bold text-amber-800 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 rounded-xl border border-dashed border-amber-300 transition flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambah Baris Pernyataan
                          </button>
                        </div>
                      )}

                      {/* SUB-FORM 5: MENJODOHKAN (Matching Pair) */}
                      {q.questionType === 'MATCHING_PAIR' && (
                        <div className="space-y-3 pt-1">
                          <div className="text-[11px] font-bold text-slate-500">
                            Pasangan Premis Kiri & Jawaban Kanan:
                          </div>

                          <div className="space-y-2">
                            {(q.matchingPairs || []).map((pair, pIdx) => (
                              <div
                                key={pIdx}
                                className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-2.5"
                              >
                                <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center shrink-0">
                                  {pIdx + 1}
                                </span>

                                <div className="flex-1 w-full">
                                  <input
                                    type="text"
                                    required
                                    value={pair.left}
                                    onChange={(e) => handleMatchingPairChange(idx, pIdx, 'left', e.target.value)}
                                    placeholder={`Pernyataan Kiri ${pIdx + 1}...`}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                </div>

                                <ArrowRight className="w-4 h-4 text-purple-500 hidden sm:block shrink-0" />

                                <div className="flex-1 w-full">
                                  <input
                                    type="text"
                                    required
                                    value={pair.right}
                                    onChange={(e) => handleMatchingPairChange(idx, pIdx, 'right', e.target.value)}
                                    placeholder={`Pasangan Kanan ${pIdx + 1}...`}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveMatchingPair(idx, pIdx)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl self-end sm:self-auto transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddMatchingPair(idx)}
                            className="px-4 py-1.5 text-xs font-bold text-purple-800 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-xl border border-dashed border-purple-300 transition flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambah Pasangan Menjodohkan
                          </button>
                        </div>
                      )}

                      {/* SUB-FORM 6: ESAI */}
                      {q.questionType === 'ESSAY' && (
                        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                          <span className="font-bold text-slate-800">Format Soal Uraian / Esai:</span>
                          <p>
                            Siswa akan diberikan area pengetikan jawaban terbuka di lembar pengerjaan ujian. Nilai esai dapat dievaluasi secara mandiri oleh guru setelah asesmen selesai.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Add Bar */}
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => handleAddQuestion('MULTIPLE_CHOICE')}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-2xl font-bold text-xs flex items-center gap-2 transition border border-slate-300 shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Butir Soal Nomor {questions.length + 1}</span>
                </button>
              </div>
            </div>
          )}

          {/* SECTION C: STICKY FOOTER ACTIONS (SELALU TERLIHAT DI SEMUA PERANGKAT) */}
          <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-white/95 backdrop-blur-md border-t-2 border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg rounded-b-2xl">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-semibold">Ringkasan Paket:</span>
              <span className="font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                {examType === 'NATIVE_QUESTIONS' ? `${questions.length} Butir Soal` : 'Google Form'}
              </span>
              {examType === 'NATIVE_QUESTIONS' && (
                <span
                  className={`font-black px-2.5 py-1 rounded-lg ${
                    totalPoints === 100
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-indigo-100 text-indigo-800'
                  }`}
                >
                  {totalPoints} Poin
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2.5 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{isEditing ? 'Simpan Perubahan Paket' : 'Simpan Paket Ujian'}</span>
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 5. MODAL PREVIEW IFRAME FORMULIR ONLINE                  */}
      {/* ======================================================== */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title="Pratinjau Tampilan Iframe Formulir Soal"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>Tampilan pratinjau seperti yang akan dilihat siswa di arena ujian:</span>
            <span className="font-mono text-[11px] truncate max-w-sm bg-white px-2 py-1 rounded-lg border border-indigo-200">
              {previewUrl}
            </span>
          </div>

          <div className="w-full h-96 sm:h-[480px] border-2 border-slate-300 rounded-2xl overflow-hidden bg-slate-100 relative shadow-inner">
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
              className="px-5 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
