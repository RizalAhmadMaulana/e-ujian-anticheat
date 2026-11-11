import React, { useState, useEffect } from 'react';
import { useExamStore } from '../../store/useExamStore';
import { createSessionApi, updateSessionApi, deleteSessionApi, getSessionsApi } from '../../api/examApi';
import { getClassroomsApi } from '../../api/authApi';
import Modal from '../../components/common/Modal';
import { 
  CalendarClock, 
  ShieldCheck, 
  KeyRound, 
  Lock, 
  Plus, 
  Clock, 
  Shuffle, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  Check,
  Eye,
  ExternalLink,
  BookOpen,
  Edit3,
  Trash2,
  Copy
} from 'lucide-react';

export default function ExamSessionSetup() {
  const { examSessions, examPackages, addExamSession, fetchSessions } = useExamStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [classroomsList, setClassroomsList] = useState([]);

  // Form State
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [classroom, setClassroom] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [endTime, setEndTime] = useState('09:30');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [entryPassword, setEntryPassword] = useState('MASUK' + Math.floor(100 + Math.random() * 900));
  const [exitPassword, setExitPassword] = useState('');
  const [supervisorPin, setSupervisorPin] = useState('PIN-' + Math.floor(1000 + Math.random() * 9000));
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);

  // Copy Feedback State
  const [copiedKey, setCopiedKey] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const fallbackCopyText = (text) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.warn('Fallback copy error:', err);
      return false;
    }
  };

  const handleCopyToken = (token, type, sessionId) => {
    if (!token) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(token).catch(() => {
          fallbackCopyText(token);
        });
      } else {
        fallbackCopyText(token);
      }
    } catch (err) {
      fallbackCopyText(token);
    }

    const key = `${sessionId}-${type}`;
    const label = type === 'entry' 
      ? 'Password Masuk' 
      : type === 'exit' 
        ? 'Password Keluar' 
        : 'PIN Pengawas';
    setCopiedKey(key);
    setToastMessage(`${label} "${token}" berhasil disalin ke keyboard! Tinggal paste (Ctrl+V).`);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
    setTimeout(() => {
      setToastMessage('');
    }, 3200);
  };

  useEffect(() => {
    fetchSessions?.();
    const fetchClassrooms = async () => {
      try {
        const cls = await getClassroomsApi();
        if (cls && cls.length > 0) {
          setClassroomsList(cls);
          setClassroom(cls[0].name);
        }
      } catch (err) {
        console.warn('Gagal ambil daftar kelas:', err);
      }
    };
    fetchClassrooms();
  }, [fetchSessions]);

  useEffect(() => {
    if (examPackages.length > 0 && !selectedPackageId) {
      setSelectedPackageId(examPackages[0].id);
    }
  }, [examPackages, selectedPackageId]);

  const handleGenerateEntryPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = 'MSK-';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setEntryPassword(res);
  };

  const handleGenerateSupervisorPin = () => {
    const chars = '0123456789';
    let res = 'PIN-';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setSupervisorPin(res);
  };

  const handleOpenAddSession = () => {
    setIsEditing(false);
    setEditingSessionId(null);
    if (examPackages.length > 0) {
      setSelectedPackageId(examPackages[0].id);
      setSessionTitle(`Ujian ${examPackages[0].subjectName || examPackages[0].subject_name || 'Mapel'} Kelas ${classroom || 'IX'}`);
    } else {
      setSessionTitle('');
    }
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
    setStartTime('08:00');
    setEndTime('09:30');
    setDurationMinutes(60);
    handleGenerateEntryPassword();
    setExitPassword('');
    handleGenerateSupervisorPin();
    setShuffleQuestions(false);
    setShuffleOptions(false);
    setIsModalOpen(true);
  };

  const handleOpenEditSession = (session) => {
    setIsEditing(true);
    setEditingSessionId(session.id);
    setSelectedPackageId(session.package || session.packageId || (examPackages[0]?.id || ''));
    setClassroom(session.classroom || session.classroom_name || (classroomsList[0]?.name || ''));
    setSessionTitle(session.title || '');
    setDurationMinutes(session.durationMinutes || session.duration_minutes || 60);

    const today = new Date().toISOString().split('T')[0];
    if (session.start_time) {
      const stParts = session.start_time.split('T');
      setStartDate(stParts[0] || today);
      if (stParts[1]) setStartTime(stParts[1].substring(0, 5));
    } else {
      setStartDate(session.date || today);
      setStartTime(session.startTime || '08:00');
    }

    if (session.end_time) {
      const etParts = session.end_time.split('T');
      setEndDate(etParts[0] || today);
      if (etParts[1]) setEndTime(etParts[1].substring(0, 5));
    } else {
      setEndDate(session.date || today);
      setEndTime(session.endTime || '09:30');
    }

    setEntryPassword(session.entryPassword || session.entry_password || '');
    setExitPassword(session.exitPassword || session.exit_password || '');
    setSupervisorPin(session.supervisorPin || session.supervisor_pin || 'PIN-1234');
    setShuffleQuestions(Boolean(session.shuffleQuestions || session.shuffle_questions));
    setShuffleOptions(Boolean(session.shuffleOptions || session.shuffle_options));
    setIsModalOpen(true);
  };

  const handleDeleteSession = async (sessionId, title) => {
    if (!window.confirm(`Yakin ingin menghapus sesi ujian "${title}"? Sesi yang dihapus tidak dapat dipulihkan.`)) {
      return;
    }
    try {
      if (sessionId && sessionId.length > 10) {
        await deleteSessionApi(sessionId);
      }
      await fetchSessions?.();
      alert('Sesi Ujian berhasil dihapus!');
    } catch (err) {
      console.error('Gagal menghapus sesi ujian:', err);
      alert('Gagal menghapus sesi ujian: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleSaveSession = async (e) => {
    e.preventDefault();

    const selectedPkg = examPackages.find((p) => p.id === selectedPackageId) || examPackages[0];

    if (!sessionTitle.trim()) {
      alert('Mohon isi Judul Sesi Ujian.');
      return;
    }

    if (!startDate || !startTime || !endDate || !endTime) {
      alert('Tanggal dan Waktu Mulai serta Berakhir wajib diisi lengkap!');
      return;
    }

    const startDateTime = `${startDate}T${startTime}:00`;
    const endDateTime = `${endDate}T${endTime}:00`;

    if (new Date(endDateTime) <= new Date(startDateTime)) {
      alert('Jadwal Waktu Berakhir harus lebih lambat dari Jadwal Waktu Mulai!');
      return;
    }

    if (!entryPassword.trim()) {
      alert('Password Masuk (Token Masuk) wajib diisi!');
      return;
    }

    try {
      const targetCls = classroomsList.find(c => c.name === classroom) || classroomsList[0];
      const payload = {
        package: selectedPkg?.id,
        classroom: targetCls?.id,
        title: sessionTitle,
        duration_minutes: Number(durationMinutes),
        start_time: startDateTime,
        end_time: endDateTime,
        entry_password: entryPassword.toUpperCase(),
        exit_password: (exitPassword || '').toUpperCase(),
        supervisor_pin: (supervisorPin || 'PIN-1234').toUpperCase(),
        shuffle_questions: Boolean(shuffleQuestions),
        shuffle_options: Boolean(shuffleOptions),
      };

      if (isEditing && editingSessionId && editingSessionId.length > 10) {
        await updateSessionApi(editingSessionId, payload);
        alert('Sesi Ujian Berhasil Diperbarui!');
      } else {
        await createSessionApi(payload);
        alert('Sesi Ujian Berhasil Dibuka! Siswa sekarang dapat menggunakan Token Masuk sesuai rentang jadwal.');
      }
    } catch (err) {
      console.warn('Backend create/update session fallback:', err);
      alert('Gagal menyimpan sesi ujian: ' + (err.response?.data?.error || err.message));
      return;
    }

    await fetchSessions?.();
    setIsModalOpen(false);
    setSessionTitle('');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Jadwal & Sesi Ujian
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5 leading-relaxed">
            Buka ruangan asesmen per kelas, tentukan durasi, dan atur kata sandi gerbang ujian.
          </p>
        </div>
        <button
          onClick={handleOpenAddSession}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-150 shadow-xs shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Buka Sesi Ujian Baru</span>
        </button>
      </div>

      {/* Mandatory Security Information Panel - Architectural Zinc/Dark */}
      <div className="rounded-xl bg-[#090D16] border border-zinc-800 text-zinc-100 p-4 relative overflow-hidden shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-zinc-800/90 border border-zinc-700/60 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-white text-xs sm:text-sm tracking-tight">
                  Zero-Tolerance Lockdown
                </span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                  Mandatory ON
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block mt-0.5 leading-relaxed max-w-3xl">
                Penguncian layar penuh (Mandatory Fullscreen), deteksi pindah tab & aplikasi (Window Blur Guard), serta pemblokiran copy-paste aktif otomatis pada setiap sesi.
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center gap-1.5">
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="hidden xs:inline">Terproteksi</span>
            </span>
          </div>
        </div>
      </div>

      {/* Grid Kartu Sesi Ujian Aktif */}
      <div className="space-y-4">
        {examSessions.length === 0 && (
          <div className="bg-white rounded-xl p-8 sm:p-12 text-center border border-dashed border-zinc-300">
            <CalendarClock className="w-10 h-10 text-zinc-300 mx-auto mb-2.5" />
            <h4 className="font-semibold text-zinc-800 text-base">Belum Ada Sesi Ujian Aktif</h4>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto leading-relaxed">
              Klik tombol "Buka Sesi Ujian Baru" di atas untuk membuka ruang ujian bagi siswa.
            </p>
          </div>
        )}

        {examSessions.map((session) => {
          const now = new Date();
          const sTime = session.start_time ? new Date(session.start_time) : (session.date ? new Date(`${session.date}T${session.startTime || '08:00'}`) : null);
          const eTime = session.end_time ? new Date(session.end_time) : (session.date ? new Date(`${session.date}T${session.endTime || '09:30'}`) : null);

          let scheduleStatus = 'ACTIVE';
          if (sTime && !isNaN(sTime.getTime()) && now < sTime) scheduleStatus = 'UPCOMING';
          if (eTime && !isNaN(eTime.getTime()) && now > eTime) scheduleStatus = 'EXPIRED';

          const formatShortDate = (d) => {
            if (!d || isNaN(d.getTime())) return '-';
            return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
          };
          const formatShortTime = (d) => {
            if (!d || isNaN(d.getTime())) return '';
            return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
          };

          const sDateStr = sTime ? formatShortDate(sTime) : '-';
          const eDateStr = eTime ? formatShortDate(eTime) : '-';
          const sTimeStr = sTime ? formatShortTime(sTime) : (session.startTime || '08:00');
          const eTimeStr = eTime ? formatShortTime(eTime) : (session.endTime || '09:30');

          const scheduleDisplay = sDateStr === eDateStr
            ? `${sDateStr} (${sTimeStr} - ${eTimeStr} WIB)`
            : `${sDateStr} ${sTimeStr} s/d ${eDateStr} ${eTimeStr} WIB`;

          const isGForm = session.examType === 'EXTERNAL_LINK' || session.exam_type === 'EXTERNAL_LINK';
          const entryVal = session.entryPassword || session.entry_password || '-';
          const pinVal = session.supervisorPin || session.supervisor_pin || 'PIN-1234';

          return (
            <div
              key={session.id}
              className="bg-white rounded-xl p-5 sm:p-6 border border-zinc-200/90 hover:border-zinc-300 shadow-2xs hover:shadow-xs hover:-translate-y-0.5 transition-all duration-150 space-y-4"
            >
              {/* Baris 1: Header Kartu (Kelas, Tipe Soal, Status Jadwal, & Tombol Aksi) */}
              <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-white uppercase">
                    {session.classroom || session.classroom_name || 'Semua Kelas'}
                  </span>
                  {isGForm ? (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3 text-blue-600" /> Google Form
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-emerald-600" /> Soal Mandiri
                    </span>
                  )}
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    {session.durationMinutes || session.duration_minutes || 60} Menit
                  </span>

                  {/* Status Sinkronisasi Jadwal */}
                  {scheduleStatus === 'ACTIVE' && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Sedang Berjalan
                    </span>
                  )}
                  {scheduleStatus === 'UPCOMING' && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Belum Dimulai
                    </span>
                  )}
                  {scheduleStatus === 'EXPIRED' && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200 flex items-center gap-1.5">
                      <Lock className="w-3 h-3 text-zinc-500" />
                      Telah Berakhir
                    </span>
                  )}

                  {(session.shuffleQuestions || session.shuffle_questions) && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 flex items-center gap-1">
                      <Shuffle className="w-3 h-3 text-zinc-500" /> Acak Soal
                    </span>
                  )}
                  {(session.shuffleOptions || session.shuffle_options) && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 flex items-center gap-1">
                      <Shuffle className="w-3 h-3 text-zinc-500" /> Acak Opsi
                    </span>
                  )}
                </div>

                {/* Tombol Aksi Cepat Edit & Hapus */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEditSession(session)}
                    className="px-2.5 py-1 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 rounded-lg text-xs font-medium transition flex items-center gap-1 shadow-2xs hover:-translate-y-0.5 active:scale-[0.98]"
                    title="Edit Sesi Ujian"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteSession(session.id, session.title)}
                    className="p-1 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition active:scale-[0.98]"
                    title="Hapus Sesi Ujian"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="sr-only">Hapus</span>
                  </button>
                </div>
              </div>

              {/* Baris 2: Judul Sesi, Mapel, & Jadwal */}
              <div className="space-y-1">
                <h3 className="font-semibold text-zinc-900 text-base sm:text-lg tracking-tight leading-snug">
                  {session.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 font-medium">
                  <div>
                    Mata Pelajaran: <span className="text-zinc-800 font-semibold">{session.subjectName || session.subject_name || '-'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-zinc-600 font-mono">
                    <CalendarClock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                    <span>{scheduleDisplay}</span>
                  </div>
                </div>
              </div>

              {/* Baris 3: DUO TOKEN TILES (Password Masuk & PIN Pengawas Ruangan) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 pt-1">
                {/* 1. Box Password Masuk */}
                <button
                  type="button"
                  onClick={() => handleCopyToken(entryVal, 'entry', session.id)}
                  className={`p-3 rounded-lg border text-center transition-all duration-150 group relative cursor-pointer active:scale-[0.98] select-none hover:-translate-y-0.5 ${
                    copiedKey === `${session.id}-entry`
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-300'
                      : 'bg-zinc-50 hover:bg-zinc-100/80 border-zinc-200'
                  }`}
                  title="Klik untuk menyalin Password Masuk ke keyboard"
                >
                  <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center justify-center gap-1 mb-0.5">
                    <KeyRound className="w-3 h-3 text-zinc-500 shrink-0" />
                    <span className="truncate">Token Masuk Siswa</span>
                  </div>
                  <div className="font-mono font-bold text-sm sm:text-base text-zinc-900 tracking-wider truncate py-0.5">
                    {entryVal}
                  </div>
                  <div className="text-[10px] font-medium mt-0.5">
                    {copiedKey === `${session.id}-entry` ? (
                      <span className="text-emerald-700 flex items-center justify-center gap-0.5 animate-pulse">
                        <Check className="w-3 h-3" /> Tersalin!
                      </span>
                    ) : (
                      <span className="text-zinc-500 group-hover:text-zinc-800 flex items-center justify-center gap-1">
                        <Copy className="w-2.5 h-2.5" /> Salin Token
                      </span>
                    )}
                  </div>
                </button>

                {/* 2. Box PIN Pengawas Ruangan */}
                <button
                  type="button"
                  onClick={() => handleCopyToken(pinVal, 'supervisor', session.id)}
                  className={`p-3 rounded-lg border text-center transition-all duration-150 group relative cursor-pointer active:scale-[0.98] select-none hover:-translate-y-0.5 ${
                    copiedKey === `${session.id}-supervisor`
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-300'
                      : 'bg-amber-50/50 hover:bg-amber-100/60 border-amber-200'
                  }`}
                  title="Klik untuk menyalin PIN Pengawas ke keyboard"
                >
                  <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-amber-700 flex items-center justify-center gap-1 mb-0.5">
                    <ShieldCheck className="w-3 h-3 text-amber-600 shrink-0" />
                    <span className="truncate">PIN Buka Kunci Pengawas</span>
                  </div>
                  <div className="font-mono font-bold text-sm sm:text-base text-amber-950 tracking-wider truncate py-0.5">
                    {pinVal}
                  </div>
                  <div className="text-[10px] font-medium mt-0.5">
                    {copiedKey === `${session.id}-supervisor` ? (
                      <span className="text-emerald-700 flex items-center justify-center gap-0.5 animate-pulse">
                        <Check className="w-3 h-3" /> Tersalin!
                      </span>
                    ) : (
                      <span className="text-amber-700 group-hover:text-amber-900 flex items-center justify-center gap-1">
                        <Copy className="w-2.5 h-2.5" /> Salin PIN
                      </span>
                    )}
                  </div>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* MODAL BUKA / EDIT SESI UJIAN */}
      {/* ======================================================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Ruang Sesi Ujian' : 'Buka Ruang Sesi Ujian Baru'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSaveSession} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Pilih Paket Soal Ujian:
            </label>
            <select
              value={selectedPackageId}
              onChange={(e) => {
                setSelectedPackageId(e.target.value);
                const pkg = examPackages.find((p) => p.id === e.target.value);
                if (pkg) {
                  setSessionTitle(`Ujian ${pkg.subjectName} Kelas ${classroom}`);
                }
              }}
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm font-medium focus:outline-none focus:border-zinc-400 bg-white"
            >
              {examPackages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  [{pkg.examType === 'NATIVE_QUESTIONS' ? 'MANDIRI' : 'GFORM'}] {pkg.subjectName} - {pkg.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Pilih Kelas Peserta:
              </label>
              <select
                value={classroom}
                onChange={(e) => {
                  setClassroom(e.target.value);
                  const pkg = examPackages.find((p) => p.id === selectedPackageId);
                  if (pkg) {
                    setSessionTitle(`Ujian ${pkg.subjectName || pkg.subject_name} Kelas ${e.target.value}`);
                  }
                }}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm font-medium focus:outline-none focus:border-zinc-400 bg-white"
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

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Durasi Ujian (Menit):
              </label>
              <input
                type="number"
                min="10"
                max="240"
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm font-medium focus:outline-none focus:border-zinc-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Judul Sesi Ujian:
            </label>
            <input
              type="text"
              required
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder="Contoh: Ujian Tengah Semester TLJ"
              className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm font-medium focus:outline-none focus:border-zinc-400"
            />
          </div>

          {/* Rentang Tanggal & Waktu Mulai serta Berakhir */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-zinc-50 rounded-lg border border-zinc-200">
            {/* 1. Jadwal Mulai Ujian */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase text-zinc-700 tracking-wider flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-zinc-500" />
                <span>Jadwal Mulai Ujian</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                    Tanggal Mulai:
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-md text-xs font-medium focus:outline-none focus:border-zinc-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                    Waktu Mulai:
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-md text-xs font-medium focus:outline-none focus:border-zinc-400 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 2. Jadwal Berakhir Ujian */}
            <div className="space-y-2">
              <div className="text-[11px] font-semibold uppercase text-rose-700 tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-600" />
                <span>Jadwal Berakhir Ujian</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                    Tanggal Berakhir:
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-md text-xs font-medium focus:outline-none focus:border-zinc-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                    Waktu Berakhir:
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-md text-xs font-medium focus:outline-none focus:border-zinc-400 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Konfigurasi Password Masuk & PIN Pengawas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-zinc-800 uppercase tracking-wider flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-zinc-500" /> Password Masuk (Token)
                </label>
                <button
                  type="button"
                  onClick={handleGenerateEntryPassword}
                  className="text-[10px] text-zinc-600 hover:text-zinc-900 font-medium flex items-center gap-0.5"
                >
                  <Shuffle className="w-2.5 h-2.5" /> Acak
                </button>
              </div>
              <input
                type="text"
                required
                value={entryPassword}
                onChange={(e) => setEntryPassword(e.target.value.toUpperCase())}
                className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-md text-xs font-mono font-bold tracking-wider text-zinc-900 bg-white uppercase text-center"
              />
              <span className="text-[10px] text-zinc-400 block">Diberikan ke siswa untuk memulai ujian</span>
            </div>

            <div className="p-3 rounded-lg bg-amber-50/50 border border-amber-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-600" /> PIN Pengawas Ruangan
                </label>
                <button
                  type="button"
                  onClick={handleGenerateSupervisorPin}
                  className="text-[10px] text-amber-700 hover:text-amber-900 font-medium flex items-center gap-0.5"
                >
                  <Shuffle className="w-2.5 h-2.5" /> Acak
                </button>
              </div>
              <input
                type="text"
                required
                value={supervisorPin}
                onChange={(e) => setSupervisorPin(e.target.value.toUpperCase())}
                className="w-full px-2.5 py-1.5 border border-amber-200 rounded-md text-xs font-mono font-bold tracking-wider text-amber-950 bg-white uppercase text-center"
              />
              <span className="text-[10px] text-zinc-400 block">Dipegang guru untuk membuka layar siswa yang terkunci</span>
            </div>
          </div>
              />
              <span className="text-[10px] text-zinc-400 block">Dipegang guru untuk buka kunci lokal</span>
            </div>
          </div>

          {/* Pengacakan Soal & Opsi Jawaban (Standar Ujian Anti-Contek) */}
          <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 space-y-2">
            <div className="text-xs font-semibold uppercase text-zinc-800 tracking-wider flex items-center gap-1.5">
              <Shuffle className="w-3.5 h-3.5 text-zinc-500" />
              <span>Pengacakan Butir Soal & Pilihan Jawaban (Anti-Sontek)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-start gap-2.5 p-2.5 rounded-md bg-white border border-zinc-200 cursor-pointer hover:border-zinc-300 transition">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-zinc-900 accent-zinc-900 cursor-pointer"
                />
                <div>
                  <span className="font-semibold text-zinc-800 block">Acak Urutan Butir Soal</span>
                  <span className="text-[11px] text-zinc-500 block leading-tight">
                    Nomor 1 siswa A berbeda dengan nomor 1 siswa B.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-md bg-white border border-zinc-200 cursor-pointer hover:border-zinc-300 transition">
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-zinc-900 accent-zinc-900 cursor-pointer"
                />
                <div>
                  <span className="font-semibold text-zinc-800 block">Acak Urutan Pilihan (A-E)</span>
                  <span className="text-[11px] text-zinc-500 block leading-tight">
                    Posisi opsi A, B, C, D diacak posisinya antar siswa.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-2 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] text-white rounded-lg text-xs font-semibold shadow-xs transition hover:-translate-y-0.5"
            >
              {isEditing ? 'Simpan Perubahan' : 'Buka Sesi Ujian'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Floating Toast Notification saat Salin Token/Password */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3.5 py-2.5 bg-zinc-950 text-white rounded-lg shadow-xl border border-zinc-800 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="p-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
            <Check className="w-3.5 h-3.5" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
