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
  const [exitPassword, setExitPassword] = useState('KELUAR' + Math.floor(100 + Math.random() * 900));
  const [supervisorPin, setSupervisorPin] = useState('PIN-' + Math.floor(1000 + Math.random() * 9000));

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

  const handleGenerateExitPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = 'KLR-';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setExitPassword(res);
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
    handleGenerateExitPassword();
    handleGenerateSupervisorPin();
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

    if (!entryPassword.trim() || !exitPassword.trim()) {
      alert('Password Masuk dan Password Keluar wajib diisi!');
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
        exit_password: exitPassword.toUpperCase(),
        supervisor_pin: (supervisorPin || 'PIN-1234').toUpperCase(),
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
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Jadwal & Sesi Ujian
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Buka ruangan asesmen per kelas, tentukan durasi, dan atur kata sandi gerbang ujian.
          </p>
        </div>
        <button
          onClick={handleOpenAddSession}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/25 transition duration-150 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Buka Sesi Ujian Baru</span>
        </button>
      </div>

      {/* Mandatory Security Information Panel - Compact & Responsive */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-500/30 text-emerald-200 shadow-md p-3.5 sm:p-5 relative overflow-hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-white text-xs sm:text-sm tracking-tight">
                  Zero-Tolerance Lockdown
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 uppercase tracking-wider">
                  Mandatory ON
                </span>
              </div>
              <p className="text-[11px] text-slate-300 hidden sm:block mt-1 leading-relaxed max-w-3xl">
                Penguncian layar penuh (*Mandatory Fullscreen*), deteksi pindah tab & aplikasi (*Window Blur & Focus Guard*), serta pemblokiran copy-paste aktif otomatis pada setiap sesi.
              </p>
            </div>
          </div>
          <div className="shrink-0">
            <span className="text-[10px] sm:text-xs px-2.5 py-1 rounded-lg bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xs:inline">Terproteksi</span>
            </span>
          </div>
        </div>
      </div>

      {/* Grid Kartu Sesi Ujian Aktif */}
      <div className="space-y-4">
        {examSessions.length === 0 && (
          <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-dashed border-slate-300">
            <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="font-bold text-slate-700 text-base">Belum Ada Sesi Ujian Aktif</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
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
          const exitVal = session.exitPassword || session.exit_password || '-';
          const pinVal = session.supervisorPin || session.supervisor_pin || 'PIN-1234';

          return (
            <div
              key={session.id}
              className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-slate-300 hover:border-indigo-500 shadow-md hover:shadow-xl transition-all duration-200 space-y-4"
            >
              {/* Baris 1: Header Kartu (Kelas, Tipe Soal, Status Jadwal, & Tombol Aksi) */}
              <div className="flex items-center justify-between gap-2 border-b-2 border-slate-100 pb-3.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black px-3 py-1 rounded-lg bg-indigo-600 text-white shadow-sm uppercase tracking-wider border-2 border-indigo-500">
                    {session.classroom || session.classroom_name || 'Semua Kelas'}
                  </span>
                  {isGForm ? (
                    <span className="text-xs font-black px-3 py-1 rounded-lg bg-purple-100 text-purple-900 border-2 border-purple-300 flex items-center gap-1.5 shadow-sm">
                      <ExternalLink className="w-3.5 h-3.5 text-purple-600" /> Google Form
                    </span>
                  ) : (
                    <span className="text-xs font-black px-3 py-1 rounded-lg bg-emerald-100 text-emerald-900 border-2 border-emerald-300 flex items-center gap-1.5 shadow-sm">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-600" /> Soal Mandiri
                    </span>
                  )}
                  <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border-2 border-amber-300 flex items-center gap-1 shadow-sm">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    {session.durationMinutes || session.duration_minutes || 60} Menit
                  </span>

                  {/* Status Sinkronisasi Jadwal */}
                  {scheduleStatus === 'ACTIVE' && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Sedang Berjalan
                    </span>
                  )}
                  {scheduleStatus === 'UPCOMING' && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5 shadow-2xs">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Belum Dimulai
                    </span>
                  )}
                  {scheduleStatus === 'EXPIRED' && (
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-300 flex items-center gap-1.5 shadow-2xs">
                      <Lock className="w-3 h-3 text-slate-500" />
                      Telah Berakhir
                    </span>
                  )}
                </div>

                {/* Tombol Aksi Cepat Edit & Hapus (Tebal & Berdimensi) */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleOpenEditSession(session)}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 border-2 border-slate-200 hover:border-indigo-400 text-slate-800 hover:text-indigo-700 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm active:scale-95"
                    title="Edit Sesi Ujian"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteSession(session.id, session.title)}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-rose-50 border-2 border-slate-200 hover:border-rose-400 text-slate-800 hover:text-rose-700 rounded-xl text-xs font-black transition flex items-center gap-1.5 shadow-sm active:scale-95"
                    title="Hapus Sesi Ujian"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span className="hidden sm:inline">Hapus</span>
                  </button>
                </div>
              </div>

              {/* Baris 2: Judul Sesi, Mapel, & Jadwal */}
              <div className="space-y-1">
                <h3 className="font-black text-slate-900 text-base sm:text-xl tracking-tight leading-snug">
                  {session.title}
                </h3>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-600 font-semibold">
                  <div>
                    Mata Pelajaran: <strong className="text-indigo-700 font-black">{session.subjectName || session.subject_name || '-'}</strong>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700 font-bold">
                    <CalendarClock className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>{scheduleDisplay}</span>
                  </div>
                </div>
              </div>

              {/* Baris 3: TRIO TOKEN BOX TEBAL (Password Masuk, Password Keluar, PIN Pengawas) */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-1">
                {/* 1. Box Password Masuk (Tebal & Kontras) */}
                <button
                  type="button"
                  onClick={() => handleCopyToken(entryVal, 'entry', session.id)}
                  className={`p-2.5 sm:p-3.5 rounded-2xl border-2 text-center transition-all duration-200 group relative cursor-pointer active:scale-95 select-none shadow-sm hover:shadow-md ${
                    copiedKey === `${session.id}-entry`
                      ? 'bg-emerald-50 border-emerald-500 ring-4 ring-emerald-300'
                      : 'bg-indigo-50/90 hover:bg-indigo-100 border-indigo-300 hover:border-indigo-600'
                  }`}
                  title="Klik untuk menyalin Password Masuk ke keyboard"
                >
                  <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center justify-center gap-1.5 mb-0.5">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">Masuk</span>
                  </div>
                  <div className="font-mono font-black text-sm sm:text-base md:text-lg text-indigo-950 tracking-wider truncate py-0.5">
                    {entryVal}
                  </div>
                  <div className="text-[9px] sm:text-xs font-black mt-0.5">
                    {copiedKey === `${session.id}-entry` ? (
                      <span className="text-emerald-700 flex items-center justify-center gap-0.5 animate-pulse">
                        <Check className="w-3 h-3" /> Tersalin!
                      </span>
                    ) : (
                      <span className="text-indigo-600 group-hover:text-indigo-800 flex items-center justify-center gap-1 opacity-90 group-hover:opacity-100">
                        <Copy className="w-3 h-3" /> Salin
                      </span>
                    )}
                  </div>
                </button>

                {/* 2. Box Password Keluar (Tebal & Kontras) */}
                <button
                  type="button"
                  onClick={() => handleCopyToken(exitVal, 'exit', session.id)}
                  className={`p-2.5 sm:p-3.5 rounded-2xl border-2 text-center transition-all duration-200 group relative cursor-pointer active:scale-95 select-none shadow-sm hover:shadow-md ${
                    copiedKey === `${session.id}-exit`
                      ? 'bg-emerald-50 border-emerald-500 ring-4 ring-emerald-300'
                      : 'bg-rose-50/90 hover:bg-rose-100 border-rose-300 hover:border-rose-600'
                  }`}
                  title="Klik untuk menyalin Password Keluar ke keyboard"
                >
                  <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-rose-700 flex items-center justify-center gap-1.5 mb-0.5">
                    <Lock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="truncate">Keluar</span>
                  </div>
                  <div className="font-mono font-black text-sm sm:text-base md:text-lg text-rose-950 tracking-wider truncate py-0.5">
                    {exitVal}
                  </div>
                  <div className="text-[9px] sm:text-xs font-black mt-0.5">
                    {copiedKey === `${session.id}-exit` ? (
                      <span className="text-emerald-700 flex items-center justify-center gap-0.5 animate-pulse">
                        <Check className="w-3 h-3" /> Tersalin!
                      </span>
                    ) : (
                      <span className="text-rose-600 group-hover:text-rose-800 flex items-center justify-center gap-1 opacity-90 group-hover:opacity-100">
                        <Copy className="w-3 h-3" /> Salin
                      </span>
                    )}
                  </div>
                </button>

                {/* 3. Box PIN Pengawas Ruangan (Tebal & Kontras) */}
                <button
                  type="button"
                  onClick={() => handleCopyToken(pinVal, 'supervisor', session.id)}
                  className={`p-2.5 sm:p-3.5 rounded-2xl border-2 text-center transition-all duration-200 group relative cursor-pointer active:scale-95 select-none shadow-sm hover:shadow-md ${
                    copiedKey === `${session.id}-supervisor`
                      ? 'bg-emerald-50 border-emerald-500 ring-4 ring-emerald-300'
                      : 'bg-amber-50/90 hover:bg-amber-100 border-amber-300 hover:border-amber-600'
                  }`}
                  title="Klik untuk menyalin PIN Pengawas ke keyboard"
                >
                  <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-700 flex items-center justify-center gap-1.5 mb-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="truncate">PIN Guru</span>
                  </div>
                  <div className="font-mono font-black text-sm sm:text-base md:text-lg text-amber-950 tracking-wider truncate py-0.5">
                    {pinVal}
                  </div>
                  <div className="text-[9px] sm:text-xs font-black mt-0.5">
                    {copiedKey === `${session.id}-supervisor` ? (
                      <span className="text-emerald-700 flex items-center justify-center gap-0.5 animate-pulse">
                        <Check className="w-3 h-3" /> Tersalin!
                      </span>
                    ) : (
                      <span className="text-amber-700 group-hover:text-amber-900 flex items-center justify-center gap-1 opacity-90 group-hover:opacity-100">
                        <Copy className="w-3 h-3" /> Salin
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
            <label className="block text-xs font-bold text-slate-700 mb-1">
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
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              <label className="block text-xs font-bold text-slate-700 mb-1">
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
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Durasi Ujian (Menit):
              </label>
              <input
                type="number"
                min="10"
                max="240"
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Judul Sesi Ujian:
            </label>
            <input
              type="text"
              required
              value={sessionTitle}
              onChange={(e) => setSessionTitle(e.target.value)}
              placeholder="Contoh: Ujian Tengah Semester TLJ"
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Rentang Tanggal & Waktu Mulai serta Berakhir */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50/80 rounded-2xl border border-slate-200">
            {/* 1. Jadwal Mulai Ujian */}
            <div className="space-y-2">
              <div className="text-[11px] font-black uppercase text-indigo-700 tracking-wider flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-indigo-600" />
                <span>Jadwal Mulai Ujian</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Tanggal Mulai:
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Waktu Mulai:
                  </label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* 2. Jadwal Berakhir Ujian */}
            <div className="space-y-2">
              <div className="text-[11px] font-black uppercase text-rose-700 tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-600" />
                <span>Jadwal Berakhir Ujian</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Tanggal Berakhir:
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Waktu Berakhir:
                  </label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Konfigurasi Password Masuk, Password Keluar & PIN Pengawas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" /> Password Masuk
                </label>
                <button
                  type="button"
                  onClick={handleGenerateEntryPassword}
                  className="text-[10px] text-indigo-600 hover:underline flex items-center gap-0.5"
                >
                  <Shuffle className="w-3 h-3" /> Acak
                </button>
              </div>
              <input
                type="text"
                required
                value={entryPassword}
                onChange={(e) => setEntryPassword(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-indigo-300 rounded-lg text-sm font-mono font-bold tracking-wider text-indigo-950 bg-white uppercase text-center"
              />
              <span className="text-[10px] text-slate-500 block">Diberikan ke siswa untuk memulai</span>
            </div>

            <div className="p-3 rounded-xl bg-red-50/70 border border-red-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-red-900 uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-red-600" /> Password Keluar
                </label>
                <button
                  type="button"
                  onClick={handleGenerateExitPassword}
                  className="text-[10px] text-red-600 hover:underline flex items-center gap-0.5"
                >
                  <Shuffle className="w-3 h-3" /> Acak
                </button>
              </div>
              <input
                type="text"
                required
                value={exitPassword}
                onChange={(e) => setExitPassword(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm font-mono font-bold tracking-wider text-red-950 bg-white uppercase text-center"
              />
              <span className="text-[10px] text-slate-500 block">Diberikan setelah jawaban dikirim</span>
            </div>

            <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> PIN Pengawas
                </label>
                <button
                  type="button"
                  onClick={handleGenerateSupervisorPin}
                  className="text-[10px] text-amber-600 hover:underline flex items-center gap-0.5"
                >
                  <Shuffle className="w-3 h-3" /> Acak
                </button>
              </div>
              <input
                type="text"
                required
                value={supervisorPin}
                onChange={(e) => setSupervisorPin(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm font-mono font-bold tracking-wider text-amber-950 bg-white uppercase text-center"
              />
              <span className="text-[10px] text-slate-500 block">Dipegang guru untuk buka kunci lokal</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition"
            >
              {isEditing ? 'Simpan Perubahan' : 'Buka Sesi Ujian'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Floating Toast Notification saat Salin Token/Password */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900/95 text-white rounded-xl shadow-2xl border border-slate-700 text-xs font-bold animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="p-1 rounded-full bg-emerald-500/20 text-emerald-400">
            <Check className="w-4 h-4" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
