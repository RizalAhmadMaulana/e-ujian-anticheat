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
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('09:30');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [entryPassword, setEntryPassword] = useState('MASUK' + Math.floor(100 + Math.random() * 900));
  const [exitPassword, setExitPassword] = useState('KELUAR' + Math.floor(100 + Math.random() * 900));

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
    const label = type === 'entry' ? 'Password Masuk' : 'Password Keluar';
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

  const handleOpenAddSession = () => {
    setIsEditing(false);
    setEditingSessionId(null);
    if (examPackages.length > 0) {
      setSelectedPackageId(examPackages[0].id);
      setSessionTitle(`Ujian ${examPackages[0].subjectName || examPackages[0].subject_name || 'Mapel'} Kelas ${classroom || 'IX'}`);
    } else {
      setSessionTitle('');
    }
    setExamDate(new Date().toISOString().split('T')[0]);
    setStartTime('08:00');
    setEndTime('09:30');
    setDurationMinutes(60);
    handleGenerateEntryPassword();
    handleGenerateExitPassword();
    setIsModalOpen(true);
  };

  const handleOpenEditSession = (session) => {
    setIsEditing(true);
    setEditingSessionId(session.id);
    setSelectedPackageId(session.package || session.packageId || (examPackages[0]?.id || ''));
    setClassroom(session.classroom || session.classroom_name || (classroomsList[0]?.name || ''));
    setSessionTitle(session.title || '');
    setDurationMinutes(session.durationMinutes || session.duration_minutes || 60);
    
    const d = session.date || (session.start_time ? session.start_time.split('T')[0] : new Date().toISOString().split('T')[0]);
    setExamDate(d);
    
    let st = session.startTime || '08:00';
    if (session.start_time && session.start_time.includes('T')) {
      st = session.start_time.split('T')[1].substring(0, 5);
    }
    setStartTime(st);

    let et = session.endTime || '09:30';
    if (session.end_time && session.end_time.includes('T')) {
      et = session.end_time.split('T')[1].substring(0, 5);
    }
    setEndTime(et);

    setEntryPassword(session.entryPassword || session.entry_password || '');
    setExitPassword(session.exitPassword || session.exit_password || '');
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
        start_time: `${examDate}T${startTime}:00Z`,
        end_time: `${examDate}T${endTime}:00Z`,
        entry_password: entryPassword.toUpperCase(),
        exit_password: exitPassword.toUpperCase(),
      };

      if (isEditing && editingSessionId && editingSessionId.length > 10) {
        await updateSessionApi(editingSessionId, payload);
        alert('Sesi Ujian Berhasil Diperbarui!');
      } else {
        await createSessionApi(payload);
        alert('Sesi Ujian Berhasil Dibuka! Siswa sekarang dapat menggunakan Token Masuk.');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-indigo-700 shadow-md shadow-indigo-600/25 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Buka Sesi Ujian Baru</span>
        </button>
      </div>

      {/* Mandatory Security Information Panel */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-500/40 text-emerald-200 shadow-lg relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-white text-sm">
                  Protokol Keamanan Zero-Tolerance Lockdown
                </span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 uppercase tracking-wider">
                  AKTIF PERMANEN (Mandatory ON)
                </span>
              </div>
              <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                Seluruh sesi ujian menerapkan penguncian layar penuh (*Mandatory Fullscreen*), deteksi buka tab lain (*Page Visibility*), deteksi ganti aplikasi (*Window Blur* dengan *Iframe Focus Guard* untuk Google Form), serta pemblokiran klik kanan, copy-paste, dan pintasan keyboard secara mutlak.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs px-3 py-1.5 rounded-lg bg-emerald-900/60 border border-emerald-500/30 text-emerald-300 font-bold flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Terproteksi Sistem
            </span>
          </div>
        </div>
      </div>

      {/* Grid Kartu Sesi Ujian Aktif */}
      <div className="space-y-4">
        {examSessions.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
            <CalendarClock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="font-bold text-slate-700 text-base">Belum Ada Sesi Ujian Aktif</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Klik tombol "Buka Sesi Ujian Baru" di atas untuk membuka ruang ujian bagi siswa.
            </p>
          </div>
        )}

        {examSessions.map((session) => {
          const displayDate = session.date || (session.start_time ? session.start_time.split('T')[0] : '-');
          const displayStart = session.startTime || (session.start_time?.includes('T') ? session.start_time.split('T')[1].substring(0, 5) : '08:00');
          const displayEnd = session.endTime || (session.end_time?.includes('T') ? session.end_time.split('T')[1].substring(0, 5) : '09:30');

          return (
            <div
              key={session.id}
              className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm hover:border-indigo-300 transition flex flex-col lg:flex-row lg:items-center justify-between gap-6"
            >
              {/* Bagian Kiri: Info Sesi & Mapel */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-3 py-1 rounded-md bg-indigo-100 text-indigo-800">
                    {session.classroom || session.classroom_name || 'Semua Kelas'}
                  </span>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 flex items-center gap-1">
                    <CalendarClock className="w-3.5 h-3.5 text-slate-500" />
                    {displayDate} ({displayStart} - {displayEnd})
                  </span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Durasi: {session.durationMinutes || session.duration_minutes || 60} Menit
                  </span>
                  {(session.examType === 'EXTERNAL_LINK' || session.exam_type === 'EXTERNAL_LINK') ? (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-purple-100 text-purple-700 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Google Form
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> Soal Mandiri
                    </span>
                  )}
                </div>

                <h3 className="font-extrabold text-slate-900 text-base lg:text-lg">
                  {session.title}
                </h3>
                <div className="text-xs text-slate-500">
                  Mata Pelajaran: <strong className="text-indigo-700">{session.subjectName || session.subject_name}</strong>
                </div>
              </div>

              {/* Bagian Kanan: Box Password & Tombol Aksi */}
              <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
                {/* Box Password Masuk (Klik untuk Salin) */}
                <button
                  type="button"
                  onClick={() => handleCopyToken(session.entryPassword || session.entry_password, 'entry', session.id)}
                  className={`p-2.5 sm:p-3 rounded-xl border text-xs text-left transition-all duration-200 group relative cursor-pointer select-none ${
                    copiedKey === `${session.id}-entry`
                      ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300 shadow-sm'
                      : 'bg-indigo-50/90 hover:bg-indigo-100 border-indigo-200 hover:border-indigo-300 hover:shadow-md'
                  }`}
                  title="Klik untuk menyalin Password Masuk ke keyboard"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-indigo-600" /> Password Masuk
                    </span>
                    {copiedKey === `${session.id}-entry` ? (
                      <span className="text-[10px] font-extrabold text-emerald-700 flex items-center gap-0.5 animate-pulse bg-emerald-100 px-1.5 py-0.5 rounded">
                        <Check className="w-3 h-3" /> Tersalin!
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-indigo-600 opacity-60 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                        <Copy className="w-3 h-3" /> Salin
                      </span>
                    )}
                  </div>
                  <div className="font-mono font-black text-indigo-950 text-base mt-0.5 tracking-wider">
                    {session.entryPassword || session.entry_password}
                  </div>
                </button>

                {/* Box Password Keluar (Klik untuk Salin) */}
                <button
                  type="button"
                  onClick={() => handleCopyToken(session.exitPassword || session.exit_password, 'exit', session.id)}
                  className={`p-2.5 sm:p-3 rounded-xl border text-xs text-left transition-all duration-200 group relative cursor-pointer select-none ${
                    copiedKey === `${session.id}-exit`
                      ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-300 shadow-sm'
                      : 'bg-red-50/90 hover:bg-red-100 border-red-200 hover:border-red-300 hover:shadow-md'
                  }`}
                  title="Klik untuk menyalin Password Keluar ke keyboard"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] text-red-700 font-bold uppercase tracking-wider flex items-center gap-1">
                      <Lock className="w-3 h-3 text-red-600" /> Password Keluar
                    </span>
                    {copiedKey === `${session.id}-exit` ? (
                      <span className="text-[10px] font-extrabold text-emerald-700 flex items-center gap-0.5 animate-pulse bg-emerald-100 px-1.5 py-0.5 rounded">
                        <Check className="w-3 h-3" /> Tersalin!
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-red-600 opacity-60 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                        <Copy className="w-3 h-3" /> Salin
                      </span>
                    )}
                  </div>
                  <div className="font-mono font-black text-red-950 text-base mt-0.5 tracking-wider">
                    {session.exitPassword || session.exit_password}
                  </div>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditSession(session)}
                    className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    title="Edit Sesi Ujian"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteSession(session.id, session.title)}
                    className="px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    title="Hapus Sesi Ujian"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                </div>
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
        maxWidth="max-w-xl"
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tanggal:
              </label>
              <input
                type="date"
                required
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jam Mulai:
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Jam Selesai:
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Konfigurasi Password Masuk & Password Keluar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
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
