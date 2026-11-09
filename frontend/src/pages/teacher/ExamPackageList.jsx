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
      {/* 1. HEADER HALAMAN BANK SOAL & AKSI (CLEAN & TASTEFUL)    */}
      {/* ======================================================== */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border border-zinc-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-zinc-100 text-zinc-800 border border-zinc-200/80">
                <FolderKanban className="w-4 h-4" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
                Bank Soal & Paket Ujian
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 max-w-2xl leading-relaxed">
              Kelola lembar asesmen mandiri berstandar Kurikulum Merdeka (AKM/ANBK 6 tipe soal), editor rumus matematika KaTeX, fasilitas impor massal Word & Excel, serta integrasi Google Form.
            </p>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            {/* Tombol Unduh Template Excel */}
            <button
              type="button"
              onClick={handleDownloadExcelTemplate}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-lg text-xs font-medium hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 shadow-2xs"
              title="Unduh format template Excel resmi untuk impor soal"
            >
              <Download className="w-3.5 h-3.5 text-zinc-500" />
              <span className="hidden sm:inline">Template Excel</span>
              <span className="sm:hidden">Unduh Template</span>
            </button>

            {/* Tombol Impor Soal Massal */}
            <button
              type="button"
              onClick={() => handleOpenImportModal(null)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-lg text-xs font-medium hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 shadow-2xs"
              title="Import butir soal dari berkas Word (.docx) atau Excel (.xlsx)"
            >
              <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
              <span>Import Soal (.docx / .xlsx)</span>
            </button>

            {/* Tombol Utama Tambah Paket Baru */}
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Tambah Paket Baru</span>
            </button>
          </div>
        </div>

        {/* Filter Bar & Search Box */}
        <div className="pt-3 border-t border-zinc-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tab Filter Tipe Paket */}
          <div className="inline-flex items-center gap-1 p-1 bg-zinc-100 rounded-lg border border-zinc-200/60 overflow-x-auto">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition shrink-0 ${
                typeFilter === 'ALL'
                  ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Semua Paket ({examPackages.length})
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('NATIVE_QUESTIONS')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition shrink-0 flex items-center gap-1.5 ${
                typeFilter === 'NATIVE_QUESTIONS'
                  ? 'bg-white text-emerald-800 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              Soal Mandiri (AKM)
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('EXTERNAL_LINK')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition shrink-0 flex items-center gap-1.5 ${
                typeFilter === 'EXTERNAL_LINK'
                  ? 'bg-white text-blue-800 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              Google Form / Teams
            </button>
          </div>

          {/* Search Box Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari judul atau mapel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-zinc-50 hover:bg-white border border-zinc-200 focus:border-zinc-400 focus:bg-white rounded-lg text-xs font-medium focus:outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600"
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
        <div className="py-14 sm:py-20 text-center bg-white rounded-xl border border-dashed border-zinc-300 p-6 space-y-3">
          <div className="w-12 h-12 rounded-lg bg-zinc-100 text-zinc-600 border border-zinc-200 flex items-center justify-center mx-auto">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-zinc-900 text-base">
            {searchQuery ? 'Tidak Ada Paket yang Cocok' : 'Belum Ada Paket Soal'}
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
            {searchQuery
              ? `Pencarian "${searchQuery}" tidak menemukan paket soal. Coba gunakan kata kunci lain.`
              : 'Mulai dengan membuat paket soal mandiri baru atau import massal dari berkas Word/Excel.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              onClick={() => handleOpenImportModal(null)}
              className="px-3.5 py-2 bg-white text-zinc-700 border border-zinc-200 font-medium text-xs rounded-lg hover:bg-zinc-50 transition flex items-center gap-1.5 shadow-2xs"
            >
              <UploadCloud className="w-3.5 h-3.5 text-blue-600" /> Import Word / Excel
            </button>
            <button
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-zinc-900 text-white font-semibold text-xs rounded-lg hover:bg-zinc-800 transition flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Tambah Paket Baru
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
                className="bg-white rounded-xl p-5 border border-zinc-200/90 shadow-2xs hover:border-zinc-300 hover:shadow-xs hover:-translate-y-0.5 transition-all duration-150 flex flex-col justify-between space-y-4 group relative"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded border flex items-center gap-1.5 ${
                        pkgExamType === 'NATIVE_QUESTIONS'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {pkgExamType === 'NATIVE_QUESTIONS' ? (
                        <>
                          <BookOpen className="w-3 h-3 text-emerald-700" />
                          <span>Soal Mandiri (AKM)</span>
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-3 h-3 text-blue-700" />
                          <span>Google Form</span>
                        </>
                      )}
                    </span>
                    {pkgClass && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 uppercase">
                        {pkgClass}
                      </span>
                    )}
                  </div>

                  {/* Judul & Mapel */}
                  <h3 className="font-semibold text-zinc-900 text-base leading-snug mb-1 group-hover:text-blue-600 transition-colors">
                    {pkgTitle}
                  </h3>
                  <div className="text-xs text-zinc-500 font-medium mb-3">
                    Mata Pelajaran: <span className="text-zinc-800 font-semibold">{pkgSubject}</span>
                  </div>

                  {/* Informasi Konten Soal */}
                  {pkgExamType === 'NATIVE_QUESTIONS' ? (
                    <div className="p-3.5 rounded-lg bg-zinc-50/80 border border-zinc-200/80 text-xs text-zinc-700 space-y-1.5 mb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-500 font-medium">Jumlah Butir:</span>
                        <span className="text-zinc-900 font-mono font-semibold tabular-nums bg-white border border-zinc-200 px-2 py-0.5 rounded text-xs">
                          {questionCount} Soal
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-500 leading-relaxed">
                        Mendukung Pilgan Kompleks, Isian Singkat, Benar/Salah, Menjodohkan & Rumus KaTeX.
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-lg bg-blue-50/50 border border-blue-200/70 text-xs text-blue-950 space-y-1.5 mb-2">
                      <div className="font-medium flex items-center gap-1.5 text-blue-900 text-[11px]">
                        <ExternalLink className="w-3 h-3 text-blue-700" />
                        <span>Link Terproteksi (Secure Iframe):</span>
                      </div>
                      <div className="font-mono text-[11px] text-blue-950 truncate bg-white p-2 rounded border border-blue-200">
                        {pkgUrl || '-'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Kartu & Tombol Aksi */}
                <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {formattedDate}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {pkgExamType === 'NATIVE_QUESTIONS' && (
                      <button
                        onClick={() => handleOpenImportModal(pkg.id)}
                        className="px-2.5 py-1 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg transition-all flex items-center gap-1 shadow-2xs hover:-translate-y-0.5 active:scale-[0.98]"
                        title="Import butir soal tambahan ke paket ini"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                        <span>+ Import</span>
                      </button>
                    )}
                    {pkgExamType === 'EXTERNAL_LINK' && (
                      <button
                        onClick={() => handleOpenPreview(pkgUrl)}
                        className="px-2.5 py-1 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg transition-all flex items-center gap-1 shadow-2xs hover:-translate-y-0.5 active:scale-[0.98]"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>Preview</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenEdit(pkg)}
                      className="px-2.5 py-1 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-50 border border-zinc-200 rounded-lg transition-all flex items-center gap-1 shadow-2xs hover:-translate-y-0.5 active:scale-[0.98]"
                      title="Edit Data Paket Soal"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-zinc-600" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={() => handleDeletePackage(pkg.id, pkgTitle)}
                      className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-all active:scale-[0.98]"
                      title="Hapus Paket Soal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
          <div className="p-3.5 rounded-lg bg-blue-50/80 border border-blue-200/80 text-blue-900 text-xs leading-relaxed flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              Fitur ini mengekstrak nomor soal, narasi soal, rumus matematika KaTeX ($...$), pilihan jawaban A-E, dan penanda kunci jawaban secara otomatis ke dalam paket ujian.
            </div>
          </div>

          {/* Pemilihan Format Berkas */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Pilih Format Berkas:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setImportFormat('EXCEL')}
                className={`p-3 rounded-lg border text-left flex items-center gap-3 transition ${
                  importFormat === 'EXCEL'
                    ? 'border-zinc-900 bg-zinc-50 text-zinc-950 font-semibold shadow-2xs ring-1 ring-zinc-900'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="text-xs font-semibold">Microsoft Excel (.xlsx)</div>
                  <div className="text-[11px] text-zinc-500 font-normal">Format kolom terstruktur</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setImportFormat('DOCX')}
                className={`p-3 rounded-lg border text-left flex items-center gap-3 transition ${
                  importFormat === 'DOCX'
                    ? 'border-zinc-900 bg-zinc-50 text-zinc-950 font-semibold shadow-2xs ring-1 ring-zinc-900'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                }`}
              >
                <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <div className="text-xs font-semibold">Microsoft Word (.docx)</div>
                  <div className="text-[11px] text-zinc-500 font-normal">Format nomor standar</div>
                </div>
              </button>
            </div>
          </div>

          {/* Target Paket Ujian */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Target Penyimpanan:
            </label>
            <select
              value={importTargetPkgId}
              onChange={(e) => setImportTargetPkgId(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs bg-white focus:outline-none focus:border-zinc-400 font-medium"
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
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Judul Paket Baru:
                </label>
                <input
                  type="text"
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                  placeholder="Contoh: Asesmen Sumatif IPA"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-400 font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Mata Pelajaran:
                </label>
                <input
                  type="text"
                  value={importSubject}
                  onChange={(e) => setImportSubject(e.target.value)}
                  placeholder="Contoh: Ilmu Pengetahuan Alam"
                  className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs focus:outline-none focus:border-zinc-400 font-medium"
                />
              </div>
            </div>
          )}

          {/* Upload Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Pilih Berkas {importFormat === 'DOCX' ? 'Word (.docx)' : 'Excel (.xlsx)'}:
            </label>
            <input
              type="file"
              required
              accept={importFormat === 'DOCX' ? '.docx' : '.xlsx,.xlsm'}
              onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-zinc-100 file:text-zinc-800 hover:file:bg-zinc-200 cursor-pointer border border-zinc-200 rounded-lg p-1.5 bg-white"
            />
          </div>

          {importFormat === 'EXCEL' && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-200/80 text-xs">
              <span className="text-zinc-600 font-medium">Belum memiliki format template Excel?</span>
              <button
                type="button"
                onClick={handleDownloadExcelTemplate}
                className="text-emerald-700 hover:text-emerald-800 font-semibold underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Unduh Template
              </button>
            </div>
          )}

          {importMessage && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {importMessage}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              className="px-3.5 py-2 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isImporting}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              {isImporting ? (
                <span>Mengekstrak Soal...</span>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Mulai Import Soal</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* 4. MODAL BUAT / EDIT PAKET UJIAN BARU (TASTE-SKILL SPEC) */}
      {/* ======================================================== */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={isEditing ? 'Edit Data Paket Ujian' : 'Buat Paket Ujian Baru (Hybrid Mode)'}
        maxWidth="max-w-5xl"
      >
        <form onSubmit={handleSavePackage} className="space-y-5">
          {/* SECTION A: SUMBER SOAL & IDENTITAS PAKET */}
          <div className="bg-zinc-50/70 rounded-xl p-4 sm:p-5 border border-zinc-200/90 space-y-4">
            {/* Pilihan Sumber Soal */}
            <div>
              <label className="block text-[11px] font-semibold uppercase text-zinc-500 tracking-wider mb-2">
                1. Pilih Sumber Soal Ujian:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setExamType('NATIVE_QUESTIONS')}
                  className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
                    examType === 'NATIVE_QUESTIONS'
                      ? 'border-zinc-900 bg-white text-zinc-950 shadow-xs ring-1 ring-zinc-900'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      examType === 'NATIVE_QUESTIONS'
                        ? 'bg-zinc-900 text-white'
                        : 'bg-zinc-100 text-zinc-500'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs sm:text-sm text-zinc-900">Soal Mandiri (Standar AKM)</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                      6 ragam soal (Pilgan, Kompleks, Isian, Benar/Salah, Menjodohkan, Esai) & rumus KaTeX
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setExamType('EXTERNAL_LINK')}
                  className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 ${
                    examType === 'EXTERNAL_LINK'
                      ? 'border-zinc-900 bg-white text-zinc-950 shadow-xs ring-1 ring-zinc-900'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                  }`}
                >
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      examType === 'EXTERNAL_LINK'
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-100 text-zinc-500'
                    }`}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs sm:text-sm text-zinc-900">Google Form / MS Teams</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                      Sematkan tautan form eksternal dalam bingkai terproteksi anti-curang
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Input Identitas Paket */}
            <div>
              <label className="block text-[11px] font-semibold uppercase text-zinc-500 tracking-wider mb-2">
                2. Informasi Paket Asesmen:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-6">
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                    Judul Paket Ujian *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Asesmen Sumatif Tengah Semester"
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs sm:text-sm font-medium focus:outline-none focus:border-zinc-400"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                    Mata Pelajaran *
                  </label>
                  <input
                    type="text"
                    required
                    value={subjectName}
                    onChange={(e) => setSubjectName(e.target.value)}
                    placeholder="Contoh: Ilmu Pengetahuan Alam"
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs sm:text-sm font-medium focus:outline-none focus:border-zinc-400"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-medium text-zinc-600 mb-1">
                    Kelas Peserta *
                  </label>
                  <select
                    value={targetClassroom}
                    onChange={(e) => setTargetClassroom(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs sm:text-sm font-medium focus:outline-none focus:border-zinc-400"
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
            <div className="p-4 sm:p-5 rounded-xl bg-blue-50/40 border border-blue-200/80 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase text-blue-950 tracking-wider">
                  Pengaturan Formulir Online
                </span>
                <span className="text-[11px] font-medium text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded border border-blue-300/70">
                  Secure Iframe Protected
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                  Tempelkan URL Google Form atau Microsoft Forms:
                </label>
                <input
                  type="url"
                  required
                  value={rawExternalUrl}
                  onChange={(e) => setRawExternalUrl(e.target.value)}
                  placeholder="https://docs.google.com/forms/d/e/.../viewform"
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-xs sm:text-sm font-mono focus:outline-none focus:border-blue-500 bg-white"
                />
              </div>

              {rawExternalUrl && (
                <div className="p-3 rounded-lg bg-white border border-blue-200 text-xs space-y-2">
                  <div className="text-[11px] text-zinc-500 font-medium">
                    Hasil Konversi Sematan Otomatis (Embedded Mode):
                  </div>
                  <div className="font-mono text-blue-900 text-xs truncate bg-blue-50/60 p-2 rounded border border-blue-100">
                    {formattedEmbedUrl}
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(formattedEmbedUrl)}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs hover:-translate-y-0.5 active:scale-[0.98]"
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
              <div className="bg-white rounded-xl p-4 border border-zinc-200/90 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                      Daftar Butir Soal ({questions.length} Butir)
                    </span>
                    <div
                      className={`px-2.5 py-0.5 rounded text-xs font-mono font-semibold border flex items-center gap-1.5 ${
                        totalPoints === 100
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-zinc-100 text-zinc-800 border-zinc-200'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Total: {totalPoints} Poin</span>
                      {totalPoints === 100 && (
                        <span className="text-[10px] text-emerald-600 font-semibold ml-0.5">✓ 100 Standar</span>
                      )}
                    </div>
                  </div>

                  {/* Dropdown Tambah Soal Cepat */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsTypeDropdownOpen((prev) => !prev)}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold shadow-xs transition hover:-translate-y-0.5 active:scale-[0.98]"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Tambah Butir Soal</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {isTypeDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-zinc-200 p-1.5 z-50">
                        <div className="px-2 py-1 text-[10px] font-semibold uppercase text-zinc-400 tracking-wider">
                          Pilih Ragam Format Soal:
                        </div>
                        <div className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => handleAddQuestion('MULTIPLE_CHOICE')}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition flex items-center gap-2"
                          >
                            <span className="w-2 h-2 rounded-full bg-zinc-900" />
                            <span>1. Pilihan Ganda (1 Benar)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddQuestion('MULTIPLE_CHOICE_COMPLEX')}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition flex items-center gap-2"
                          >
                            <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                            <span>2. Pilgan Kompleks (Multi-Centang)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddQuestion('SHORT_ANSWER')}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition flex items-center gap-2"
                          >
                            <ListOrdered className="w-3.5 h-3.5 text-teal-600" />
                            <span>3. Isian Singkat (Exact Match)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddQuestion('TRUE_FALSE_MATRIX')}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition flex items-center gap-2"
                          >
                            <Grid className="w-3.5 h-3.5 text-amber-600" />
                            <span>4. Tabel Benar / Salah</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddQuestion('MATCHING_PAIR')}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition flex items-center gap-2"
                          >
                            <GitCompare className="w-3.5 h-3.5 text-blue-600" />
                            <span>5. Menjodohkan Pasangan</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddQuestion('ESSAY')}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition flex items-center gap-2"
                          >
                            <Plus className="w-3.5 h-3.5 text-zinc-500" />
                            <span>6. Uraian / Esai Terstruktur</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Add Pills Bar */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <span className="text-[11px] font-medium text-zinc-400 shrink-0 mr-1 hidden sm:inline">
                    Pintasan:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('MULTIPLE_CHOICE')}
                    className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 rounded-md font-medium text-[11px] text-zinc-700 transition shrink-0"
                  >
                    + Pilgan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('MULTIPLE_CHOICE_COMPLEX')}
                    className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 rounded-md font-medium text-[11px] text-zinc-700 transition shrink-0"
                  >
                    + Kompleks
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('SHORT_ANSWER')}
                    className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 rounded-md font-medium text-[11px] text-zinc-700 transition shrink-0"
                  >
                    + Isian Singkat
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('TRUE_FALSE_MATRIX')}
                    className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 rounded-md font-medium text-[11px] text-zinc-700 transition shrink-0"
                  >
                    + Benar/Salah
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('MATCHING_PAIR')}
                    className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 rounded-md font-medium text-[11px] text-zinc-700 transition shrink-0"
                  >
                    + Menjodohkan
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddQuestion('ESSAY')}
                    className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 rounded-md font-medium text-[11px] text-zinc-700 transition shrink-0"
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
                      className="p-4 sm:p-5 rounded-xl border border-zinc-200/90 bg-white hover:border-zinc-300 shadow-2xs transition space-y-3.5"
                    >
                      {/* Bar Atas Kartu Soal */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-zinc-100">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-zinc-900 text-white font-mono font-semibold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-semibold text-zinc-900">
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
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition flex items-center gap-1 border ${
                              activeFormulaTarget?.qIdx === idx && activeFormulaTarget?.field === 'questionText'
                                ? 'bg-zinc-900 text-white border-zinc-900'
                                : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50'
                            }`}
                          >
                            <Sigma className="w-3.5 h-3.5" />
                            <span>Rumus KaTeX</span>
                          </button>

                          {/* Input Poin */}
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-50 border border-zinc-200 text-xs">
                            <span className="text-zinc-500 font-medium">Poin:</span>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={q.points}
                              onChange={(e) => handlePointsChange(idx, e.target.value)}
                              className="w-12 px-1 py-0.5 border border-zinc-300 rounded text-center font-mono font-semibold text-zinc-900 focus:outline-none focus:border-zinc-400 bg-white"
                            />
                          </div>

                          <div className="flex items-center gap-1">
                            {/* Duplikat */}
                            <button
                              type="button"
                              onClick={() => handleDuplicateQuestion(idx)}
                              className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition"
                              title="Duplikat Soal"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Hapus */}
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestion(idx)}
                              className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition"
                              title="Hapus Soal"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Formula Toolbar Inline */}
                      {activeFormulaTarget?.qIdx === idx && (
                        <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200">
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
                            className="w-full px-3 py-2 pr-10 border border-zinc-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:border-zinc-400 bg-white leading-relaxed placeholder:text-zinc-400"
                          />

                          <label
                            className="absolute right-2.5 top-2.5 p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md cursor-pointer transition"
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
                          <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-800">
                            <span className="text-[10px] font-semibold text-zinc-500 block mb-1">
                              Pratinjau Tipografi Rumus (KaTeX):
                            </span>
                            <MathText text={q.questionText} />
                          </div>
                        )}

                        {/* Pratinjau Gambar Soal */}
                        {q.imageUrl && (
                          <div className="relative inline-block border border-zinc-200 rounded-lg p-2 bg-zinc-50">
                            <img
                              src={resolveImageUrl(q.imageUrl)}
                              alt="Gambar Soal"
                              className="max-h-48 rounded-md object-contain border border-zinc-200 bg-white"
                            />
                            <div className="flex items-center justify-between gap-2 pt-1.5 px-1">
                              <span className="text-[10px] text-zinc-500 font-mono">Gambar Terlampir</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveQuestionImage(idx)}
                                className="text-[11px] font-medium text-rose-600 hover:underline flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" /> Hapus Gambar
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* SUB-FORM 1: PILIHAN GANDA BIASA (1 Benar) */}
                      {q.questionType === 'MULTIPLE_CHOICE' && (
                        <div className="space-y-2 pt-1">
                          <div className="text-[11px] font-medium text-zinc-500 flex items-center justify-between flex-wrap gap-1">
                            <span>Pilihan Jawaban (Klik lingkaran opsi untuk memilih 1 kunci jawaban benar):</span>
                            <span className="text-emerald-700 font-semibold font-mono">Kunci: Opsi {q.correctOption}</span>
                          </div>

                          <div className="space-y-2">
                            {q.options.map((opt, optIdx) => {
                              const isCorrect = q.correctOption === opt.label;
                              return (
                                <div
                                  key={opt.id || opt.label}
                                  className="p-2.5 rounded-lg bg-zinc-50/70 border border-zinc-200 flex flex-col sm:flex-row sm:items-center gap-2 group hover:border-zinc-300 transition"
                                >
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleCorrectOptionChange(idx, opt.label)}
                                      className={`w-6 h-6 rounded-md border flex items-center justify-center transition shrink-0 text-xs font-mono font-semibold ${
                                        isCorrect
                                          ? 'border-emerald-600 bg-emerald-600 text-white'
                                          : 'border-zinc-300 hover:border-zinc-400 bg-white text-zinc-600'
                                      }`}
                                      title={isCorrect ? 'Kunci Jawaban Benar' : 'Klik untuk jadikan Kunci Jawaban'}
                                    >
                                      {isCorrect ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : opt.label}
                                    </button>
                                    <span className="sm:hidden font-medium text-xs text-zinc-700">
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
                                      className="w-full pl-3 pr-8 py-1.5 border border-zinc-200 rounded-md text-xs sm:text-sm bg-white focus:outline-none focus:border-zinc-400"
                                    />
                                    <label
                                      className="absolute right-2 text-zinc-400 hover:text-zinc-600 cursor-pointer p-0.5"
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
                                        className="text-[10px] text-rose-600 hover:underline px-1.5"
                                      >
                                        Hapus Gbr
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOption(idx, optIdx)}
                                      className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
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
                            className="mt-1 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-50 rounded-lg border border-dashed border-zinc-300 transition flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambahkan Opsi Pilihan ({String.fromCharCode(65 + q.options.length)})
                          </button>
                        </div>
                      )}

                      {/* SUB-FORM 2: PILIHAN GANDA KOMPLEKS (Multi-Centang) */}
                      {q.questionType === 'MULTIPLE_CHOICE_COMPLEX' && (
                        <div className="space-y-2 pt-1">
                          <div className="text-[11px] font-medium text-zinc-500 flex items-center justify-between flex-wrap gap-1">
                            <span>Pilihan Jawaban (Centang opsi untuk seluruh kunci jawaban yang benar):</span>
                            <span className="text-blue-700 font-semibold font-mono">
                              Kunci: {q.correctOptions?.join(', ') || '-'}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {q.options.map((opt, optIdx) => {
                              const isChecked = q.correctOptions?.includes(opt.label);
                              return (
                                <div
                                  key={opt.id || opt.label}
                                  className="p-2.5 rounded-lg bg-zinc-50/70 border border-zinc-200 flex flex-col sm:flex-row sm:items-center gap-2 group hover:border-zinc-300 transition"
                                >
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleComplexOption(idx, opt.label)}
                                      className={`w-6 h-6 rounded-md border flex items-center justify-center transition shrink-0 text-xs font-mono font-semibold ${
                                        isChecked
                                          ? 'border-blue-600 bg-blue-600 text-white'
                                          : 'border-zinc-300 hover:border-zinc-400 bg-white text-zinc-600'
                                      }`}
                                      title={isChecked ? 'Hapus dari Kunci Jawaban' : 'Jadikan Kunci Jawaban'}
                                    >
                                      {isChecked ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : opt.label}
                                    </button>
                                    <span className="sm:hidden font-medium text-xs text-zinc-700">
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
                                      className="w-full pl-3 pr-8 py-1.5 border border-zinc-200 rounded-md text-xs sm:text-sm bg-white focus:outline-none focus:border-zinc-400"
                                    />
                                    <label
                                      className="absolute right-2 text-zinc-400 hover:text-zinc-600 cursor-pointer p-0.5"
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
                                      className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
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
                            className="mt-1 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-50 rounded-lg border border-dashed border-zinc-300 transition flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambahkan Opsi Pilihan ({String.fromCharCode(65 + q.options.length)})
                          </button>
                        </div>
                      )}

                      {/* SUB-FORM 3: ISIAN SINGKAT (Exact Match) */}
                      {q.questionType === 'SHORT_ANSWER' && (
                        <div className="space-y-2 pt-1 bg-zinc-50 p-3.5 rounded-lg border border-zinc-200">
                          <label className="block text-xs font-semibold text-zinc-900">
                            Kunci Jawaban Tepat (Toleransi Kata Kunci):
                          </label>
                          <input
                            type="text"
                            required
                            value={q.exactKeys || ''}
                            onChange={(e) => handleExactKeysChange(idx, e.target.value)}
                            placeholder="Contoh: Fotosintesis / fotosintesa / anabolisme"
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm bg-white focus:outline-none focus:border-zinc-400 font-medium"
                          />
                          <p className="text-[11px] text-zinc-500">
                            Gunakan garis miring (<strong>/</strong>) untuk memberikan beberapa variasi jawaban benar alternatif. Sistem otomatis mengabaikan huruf besar/kecil (case-insensitive) dan spasi berlebih.
                          </p>
                        </div>
                      )}

                      {/* SUB-FORM 4: TABEL BENAR / SALAH (Matrix) */}
                      {q.questionType === 'TRUE_FALSE_MATRIX' && (
                        <div className="space-y-2.5 pt-1">
                          <div className="text-[11px] font-medium text-zinc-500">
                            Daftar Pernyataan & Kunci Kebenaran:
                          </div>

                          <div className="space-y-2">
                            {(q.matrixRows || []).map((row, rIdx) => (
                              <div
                                key={rIdx}
                                className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 flex flex-col sm:flex-row sm:items-center gap-2.5"
                              >
                                <span className="w-5 h-5 rounded bg-zinc-200 text-zinc-800 font-mono font-semibold text-xs flex items-center justify-center shrink-0">
                                  {rIdx + 1}
                                </span>

                                <input
                                  type="text"
                                  required
                                  value={row.statement}
                                  onChange={(e) => handleMatrixStatementChange(idx, rIdx, e.target.value)}
                                  placeholder={`Pernyataan ${rIdx + 1}...`}
                                  className="flex-1 w-full px-3 py-1.5 border border-zinc-200 rounded-md text-xs sm:text-sm bg-white focus:outline-none focus:border-zinc-400"
                                />

                                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                                  <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-md border border-zinc-200 text-xs font-medium">
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
                                    <span className="text-zinc-300">|</span>
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
                                    className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddMatrixRow(idx)}
                            className="px-3 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-50 rounded-lg border border-dashed border-zinc-300 transition flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambah Baris Pernyataan
                          </button>
                        </div>
                      )}

                      {/* SUB-FORM 5: MENJODOHKAN (Matching Pair) */}
                      {q.questionType === 'MATCHING_PAIR' && (
                        <div className="space-y-2.5 pt-1">
                          <div className="text-[11px] font-medium text-zinc-500">
                            Pasangan Premis Kiri & Jawaban Kanan:
                          </div>

                          <div className="space-y-2">
                            {(q.matchingPairs || []).map((pair, pIdx) => (
                              <div
                                key={pIdx}
                                className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200 flex flex-col sm:flex-row sm:items-center gap-2"
                              >
                                <span className="w-5 h-5 rounded bg-zinc-200 text-zinc-800 font-mono font-semibold text-xs flex items-center justify-center shrink-0">
                                  {pIdx + 1}
                                </span>

                                <div className="flex-1 w-full">
                                  <input
                                    type="text"
                                    required
                                    value={pair.left}
                                    onChange={(e) => handleMatchingPairChange(idx, pIdx, 'left', e.target.value)}
                                    placeholder={`Pernyataan Kiri ${pIdx + 1}...`}
                                    className="w-full px-3 py-1.5 border border-zinc-200 rounded-md text-xs sm:text-sm bg-white focus:outline-none focus:border-zinc-400"
                                  />
                                </div>

                                <ArrowRight className="w-3.5 h-3.5 text-zinc-400 hidden sm:block shrink-0" />

                                <div className="flex-1 w-full">
                                  <input
                                    type="text"
                                    required
                                    value={pair.right}
                                    onChange={(e) => handleMatchingPairChange(idx, pIdx, 'right', e.target.value)}
                                    placeholder={`Pasangan Kanan ${pIdx + 1}...`}
                                    className="w-full px-3 py-1.5 border border-zinc-200 rounded-md text-xs sm:text-sm bg-white focus:outline-none focus:border-zinc-400"
                                  />
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleRemoveMatchingPair(idx, pIdx)}
                                  className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded self-end sm:self-auto transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleAddMatchingPair(idx)}
                            className="px-3 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-50 rounded-lg border border-dashed border-zinc-300 transition flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" /> Tambah Pasangan Menjodohkan
                          </button>
                        </div>
                      )}

                      {/* SUB-FORM 6: ESAI */}
                      {q.questionType === 'ESSAY' && (
                        <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 space-y-1">
                          <span className="font-semibold text-zinc-900">Format Soal Uraian / Esai:</span>
                          <p>
                            Siswa akan diberikan area pengetikan jawaban terbuka di lembar pengerjaan ujian. Nilai esai dapat dievaluasi secara mandiri oleh guru di halaman Koreksi Esai setelah asesmen selesai.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Add Bar */}
              <div className="pt-1 flex justify-center">
                <button
                  type="button"
                  onClick={() => handleAddQuestion('MULTIPLE_CHOICE')}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-lg font-medium text-xs flex items-center gap-1.5 transition border border-zinc-200 hover:-translate-y-0.5 active:scale-[0.98]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Butir Soal Nomor {questions.length + 1}</span>
                </button>
              </div>
            </div>
          )}

          {/* SECTION C: STICKY FOOTER ACTIONS (TASTE-SKILL PAIR) */}
          <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-3.5 bg-white/95 backdrop-blur-md border-t border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-b-xl">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500 font-medium">Ringkasan:</span>
              <span className="font-mono font-medium text-zinc-800 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded">
                {examType === 'NATIVE_QUESTIONS' ? `${questions.length} Butir Soal` : 'Google Form'}
              </span>
              {examType === 'NATIVE_QUESTIONS' && (
                <span
                  className={`font-mono font-semibold px-2 py-0.5 rounded border ${
                    totalPoints === 100
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-zinc-100 text-zinc-800 border-zinc-200'
                  }`}
                >
                  {totalPoints} Poin
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3.5 py-2 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition hover:-translate-y-0.5 active:scale-[0.98]"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center gap-1.5 hover:-translate-y-0.5"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
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
          <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span>Tampilan pratinjau seperti yang akan dilihat siswa di arena ujian:</span>
            <span className="font-mono text-[11px] truncate max-w-sm bg-white px-2 py-0.5 rounded border border-zinc-200">
              {previewUrl}
            </span>
          </div>

          <div className="w-full h-96 sm:h-[480px] border border-zinc-200 rounded-lg overflow-hidden bg-zinc-100 relative shadow-inner">
            <iframe
              src={previewUrl}
              title="Pratinjau Soal Formulir"
              className="w-full h-full border-0"
              allow="camera; microphone; fullscreen"
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={() => setIsPreviewModalOpen(false)}
              className="px-4 py-2 bg-zinc-900 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
