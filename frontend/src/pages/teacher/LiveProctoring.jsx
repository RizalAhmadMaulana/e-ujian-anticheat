import React, { useState, useEffect, useCallback } from 'react';
import { useExamStore } from '../../store/useExamStore';
import StatusBadge from '../../components/common/StatusBadge';
import { useProctorSocket } from '../../hooks/useProctorSocket';
import { proctoringApi } from '../../api/proctoringApi';
import { examApi } from '../../api/examApi';
import { 
  Radio, 
  Unlock, 
  Ban, 
  AlertTriangle, 
  ShieldCheck, 
  Search, 
  Filter, 
  Smartphone, 
  Monitor, 
  Clock, 
  UserCheck, 
  RefreshCw, 
  Sparkles,
  Wifi,
  WifiOff,
  Megaphone,
  Send,
  X,
  Volume2,
  CheckCircle2
} from 'lucide-react';

export default function LiveProctoring() {
  const { 
    examSessions, 
    proctoringStudents, 
    currentUser,
    unlockStudent: storeUnlockStudent, 
    disqualifyStudent: storeDisqualifyStudent,
    triggerViolationLock
  } = useExamStore();

  const [availableSessions, setAvailableSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'WORKING' | 'LOCKED_VIOLATION' | 'SUBMITTED'
  const [liveStudents, setLiveStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // State Siaran Pengumuman Langsung (Live Announcement Broadcast)
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastUrgency, setBroadcastUrgency] = useState('INFO'); // 'INFO' | 'WARNING' | 'URGENT'
  const [broadcastHistory, setBroadcastHistory] = useState([]);
  const [broadcastAlertToast, setBroadcastAlertToast] = useState('');

  // 1. Ambil daftar sesi ujian dari backend
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const sessions = await examApi.getSessions();
        if (sessions && sessions.length > 0) {
          setAvailableSessions(sessions);
          setSelectedSessionId((prev) => (prev && sessions.some(s => s.id === prev) ? prev : sessions[0].id));
        } else {
          setAvailableSessions([]);
          setSelectedSessionId('');
        }
      } catch (err) {
        console.warn('Gagal memuat sesi backend:', err);
      }
    };
    fetchSessions();
  }, []);

  // 2. Ambil status siswa untuk sesi yang dipilih
  const fetchSessionStatus = useCallback(async () => {
    if (!selectedSessionId) {
      setLiveStudents([]);
      return;
    }
    setIsLoading(true);
    try {
      const data = await proctoringApi.getSessionStatus(selectedSessionId);
      if (data && data.students && data.students.length > 0) {
        const mapped = data.students.map(s => ({
          studentId: s.student_id,
          attemptId: s.id,
          nisn: s.nisn,
          fullName: s.student_name,
          classroom: data.classroom,
          status: s.status,
          screenOrientation: s.screen_orientation,
          violationCount: s.violation_count,
          score: s.total_score,
          networkLatencyMs: s.network_latency_ms || 0,
          startedAt: s.started_at ? new Date(s.started_at).toLocaleTimeString('id-ID') : '-',
          finishedAt: s.finished_at ? new Date(s.finished_at).toLocaleTimeString('id-ID') : null,
          lastViolation: s.violations && s.violations.length > 0 ? {
            type: s.violations[0].violation_type,
            description: s.violations[0].description,
            time: new Date(s.violations[0].detected_at).toLocaleTimeString('id-ID')
          } : null
        }));
        setLiveStudents(mapped);
      } else {
        setLiveStudents([]);
      }
    } catch {
      setLiveStudents([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSessionId]);

  useEffect(() => {
    fetchSessionStatus();
  }, [fetchSessionStatus]);

  // 3. WebSocket Realtime Listener
  const handleStudentLocked = useCallback((payload) => {
    setLiveStudents(prev => prev.map(student => {
      if (student.attemptId === payload.attempt_id || student.nisn === payload.nisn) {
        return {
          ...student,
          status: 'LOCKED_VIOLATION',
          violationCount: payload.violation_count,
          lastViolation: {
            type: payload.violation_type,
            description: payload.description,
            time: payload.detected_at || new Date().toLocaleTimeString('id-ID')
          }
        };
      }
      return student;
    }));
  }, []);

  const handleStudentUnlocked = useCallback((payload) => {
    setLiveStudents(prev => prev.map(student => {
      if (student.attemptId === payload.attempt_id) {
        return {
          ...student,
          status: 'WORKING'
        };
      }
      return student;
    }));
  }, []);

  const handleStudentDisqualified = useCallback((payload) => {
    setLiveStudents(prev => prev.map(student => {
      if (student.attemptId === payload.attempt_id) {
        return {
          ...student,
          status: 'DISQUALIFIED'
        };
      }
      return student;
    }));
  }, []);

  const handleStudentSubmitted = useCallback((payload) => {
    setLiveStudents(prev => prev.map(student => {
      if (student.attemptId === payload.attempt_id) {
        return {
          ...student,
          status: 'SUBMITTED',
          score: payload.total_score
        };
      }
      return student;
    }));
  }, []);

  const handleNetworkHeartbeat = useCallback((payload) => {
    setLiveStudents((prev) =>
      prev.map((student) => {
        if (student.attemptId === payload.attempt_id) {
          return {
            ...student,
            networkLatencyMs: payload.latency_ms || 0
          };
        }
        return student;
      })
    );
  }, []);

  const { isConnected, sendUnlockCommand, sendDisqualifyCommand, sendAnnouncement } = useProctorSocket(
    selectedSessionId,
    {
      onStudentLocked: handleStudentLocked,
      onStudentUnlocked: handleStudentUnlocked,
      onStudentDisqualified: handleStudentDisqualified,
      onStudentSubmitted: handleStudentSubmitted,
      onNetworkHeartbeat: handleNetworkHeartbeat
    }
  );

  // Handler Kirim Siaran Pengumuman
  const handleSendBroadcast = (e) => {
    if (e) e.preventDefault();
    const trimmed = broadcastMessage.trim();
    if (!trimmed) return;

    const sender = currentUser?.full_name || 'Guru Pengawas';
    sendAnnouncement(trimmed, broadcastUrgency, sender);

    const newRecord = {
      id: Date.now(),
      message: trimmed,
      urgency: broadcastUrgency,
      sender: sender,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };

    setBroadcastHistory(prev => [newRecord, ...prev]);
    setBroadcastMessage('');
    setIsBroadcastModalOpen(false);
    setBroadcastAlertToast('Siaran pengumuman berhasil dikirim ke seluruh layar siswa!');
    setTimeout(() => setBroadcastAlertToast(''), 4500);
  };

  const currentSession = availableSessions.find((s) => s.id === selectedSessionId) || availableSessions[0];

  // Aksi Unlock Siswa
  const handleUnlock = async (student) => {
    // 1. Panggil WebSocket
    if (student.attemptId) {
      sendUnlockCommand(student.attemptId);
      try {
        await proctoringApi.unlockStudent(student.attemptId);
      } catch (err) {
        console.warn('Unlock API fallback:', err);
      }
    }
    // 2. Perbarui Store & State Lokal
    storeUnlockStudent(student.studentId);
    setLiveStudents(prev => prev.map(s => s.studentId === student.studentId ? { ...s, status: 'WORKING' } : s));
  };

  // Aksi Diskualifikasi Siswa
  const handleDisqualify = async (student) => {
    if (!confirm(`Yakin ingin mendiskualifikasi siswa ${student.fullName}?`)) return;

    if (student.attemptId) {
      sendDisqualifyCommand(student.attemptId);
      try {
        await proctoringApi.disqualifyStudent(student.attemptId);
      } catch (err) {
        console.warn('Disqualify API fallback:', err);
      }
    }
    storeDisqualifyStudent(student.studentId);
    setLiveStudents(prev => prev.map(s => s.studentId === student.studentId ? { ...s, status: 'DISQUALIFIED' } : s));
  };

  // Filtering Data Siswa
  const displayedStudents = liveStudents.length > 0 ? liveStudents : proctoringStudents;
  const filteredStudents = displayedStudents.filter((student) => {
    const matchesSearch = 
      student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.nisn.includes(searchQuery);

    const matchesStatus = 
      statusFilter === 'ALL' || student.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalCount = displayedStudents.length;
  const workingCount = displayedStudents.filter((s) => s.status === 'WORKING').length;
  const lockedCount = displayedStudents.filter((s) => s.status === 'LOCKED_VIOLATION').length;
  const submittedCount = displayedStudents.filter((s) => s.status === 'SUBMITTED').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              Ruang Pengawas Real-Time (Live Proctoring)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5 leading-relaxed">
            Pantau aktivitas ujian, layar siswa terkunci secara live, dan berikan izin buka kunci (unlock).
          </p>
        </div>

        {/* Action Simulasi & Status Koneksi */}
        <div className="flex items-center gap-2">
          <div className={`px-2 py-0.5 rounded text-[11px] font-medium border flex items-center gap-1.5 ${
            isConnected 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            {isConnected ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-600" />
                <span>WebSocket Aktif</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-amber-600" />
                <span>Mode Standby</span>
              </>
            )}
          </div>

          {/* Tombol Kirim Siaran ke Siswa */}
          <button
            onClick={() => setIsBroadcastModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-xs hover:-translate-y-0.5 active:scale-[0.98]"
            title="Kirim Siaran Pengumuman ke Seluruh Siswa"
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kirim Siaran Siswa</span>
          </button>

          <button
            onClick={fetchSessionStatus}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition shadow-2xs hover:-translate-y-0.5 active:scale-[0.98]"
            title="Muat Ulang Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-zinc-900' : ''}`} />
          </button>
        </div>
      </div>

      {/* Toast Sukses Broadcast */}
      {broadcastAlertToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg text-xs font-medium flex items-center gap-2 shadow-2xs animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{broadcastAlertToast}</span>
        </div>
      )}

      {/* Bar Filter Sesi Ujian & Ringkasan Status */}
      <div className="bg-white rounded-xl p-5 border border-zinc-200/90 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-center">
          {/* Pilih Sesi Ujian */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              Pilih Sesi Ujian Aktif:
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full text-xs sm:text-sm font-medium rounded-lg border border-zinc-200 focus:outline-none focus:border-zinc-400 py-2 bg-white text-zinc-900"
            >
              {availableSessions.map((ses) => (
                <option key={ses.id} value={ses.id}>
                  {ses.subject_name || ses.subjectName} — {ses.classroom_name || ses.classroom} ({ses.title})
                </option>
              ))}
            </select>
          </div>

          {/* Bar Pencarian Siswa */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-1">
              Cari Nama atau NISN Siswa:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Ketik nama atau nomor induk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm font-medium rounded-lg border border-zinc-200 focus:outline-none focus:border-zinc-400 bg-white"
              />
            </div>
          </div>
        </div>

        {/* 4 Tombol Filter Tab Status */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-zinc-100 overflow-x-auto pb-1 sm:flex-wrap">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 border ${
              statusFilter === 'ALL'
                ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs font-semibold'
                : 'bg-zinc-100 text-zinc-700 border-zinc-200 hover:bg-zinc-200'
            }`}
          >
            <span>Semua Siswa</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-800 text-white font-mono font-medium">
              {totalCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('WORKING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 border ${
              statusFilter === 'WORKING'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-semibold'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Sedang Fokus</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-900 font-mono font-medium">
              {workingCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('LOCKED_VIOLATION')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 border ${
              statusFilter === 'LOCKED_VIOLATION'
                ? 'bg-rose-600 text-white border-rose-600 shadow-2xs font-semibold animate-pulse'
                : 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            <span>Layar Terkunci</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-200 text-rose-900 font-mono font-medium">
              {lockedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('SUBMITTED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shrink-0 border ${
              statusFilter === 'SUBMITTED'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold'
                : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>Selesai Terkirim</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-900 font-mono font-medium">
              {submittedCount}
            </span>
          </button>
        </div>
      </div>

      {/* Grid Kartu Siswa Real-Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredStudents.length > 0 ? (
          filteredStudents.map((student) => {
            const isLocked = student.status === 'LOCKED_VIOLATION';
            const isSubmitted = student.status === 'SUBMITTED';

            return (
              <div
                key={student.studentId || student.nisn}
                className={`rounded-xl p-4 sm:p-5 border transition-all duration-150 flex flex-col justify-between space-y-3.5 shadow-2xs ${
                  isLocked
                    ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-400'
                    : isSubmitted
                    ? 'bg-white border-zinc-200/90 hover:border-zinc-300 hover:-translate-y-0.5'
                    : 'bg-white border-zinc-200/90 hover:border-zinc-300 hover:-translate-y-0.5'
                }`}
              >
                <div>
                  {/* Bar Atas Kartu Siswa */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div>
                      <h3 className="font-semibold text-zinc-900 text-sm sm:text-base leading-tight tracking-tight">
                        {student.fullName}
                      </h3>
                      <div className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-zinc-700 bg-zinc-100 px-1.5 py-0.2 rounded border border-zinc-200">
                          {student.nisn}
                        </span>
                        <span>•</span>
                        <span className="font-medium text-zinc-700 bg-zinc-50 px-1.5 py-0.2 rounded border border-zinc-200">
                          {student.classroom}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={student.status} />
                  </div>

                  {/* Info Device & Waktu */}
                  <div className="space-y-1.5 text-xs bg-zinc-50/90 border border-zinc-200/80 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 font-medium flex items-center gap-1.5">
                        {student.screenOrientation === 'LANDSCAPE' ? (
                          <Monitor className="w-3.5 h-3.5 text-zinc-500" />
                        ) : (
                          <Smartphone className="w-3.5 h-3.5 text-zinc-500" />
                        )}
                        Orientasi Layar:
                      </span>
                      <span className="font-mono text-zinc-900 bg-white px-1.5 py-0.2 rounded border border-zinc-200 text-[11px]">
                        {student.screenOrientation}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 font-medium">Mulai:</span>
                      <span className="font-mono text-zinc-800 text-[11px]">{student.startedAt || '-'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 font-medium">Selesai:</span>
                      <span className="font-mono text-zinc-800 text-[11px]">{student.finishedAt || 'Sedang Berjalan'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 font-medium flex items-center gap-1">
                        <Wifi className="w-3 h-3 text-zinc-500" />
                        Latensi:
                      </span>
                      <span
                        className={`font-mono text-[10px] px-1.5 py-0.2 rounded border flex items-center gap-1 ${
                          student.networkLatencyMs > 0 && student.networkLatencyMs < 150
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : student.networkLatencyMs >= 150 && student.networkLatencyMs < 400
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : student.networkLatencyMs >= 400
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                        }`}
                      >
                        <span
                          className={`w-1 h-1 rounded-full ${
                            student.networkLatencyMs > 0 && student.networkLatencyMs < 150
                              ? 'bg-emerald-500'
                              : student.networkLatencyMs >= 150 && student.networkLatencyMs < 400
                              ? 'bg-amber-500'
                              : student.networkLatencyMs >= 400
                              ? 'bg-rose-500'
                              : 'bg-zinc-400'
                          }`}
                        />
                        {student.networkLatencyMs ? `${student.networkLatencyMs} ms` : 'Aktif'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-zinc-200 pt-1.5 mt-1">
                      <span className="text-zinc-500 font-medium">Pelanggaran:</span>
                      <span className={`font-mono text-[11px] px-1.5 py-0.2 rounded border ${
                        student.violationCount > 0 
                          ? 'text-rose-700 bg-rose-50 border-rose-200 animate-pulse font-semibold' 
                          : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                      }`}>
                        {student.violationCount > 0 ? `${student.violationCount} Kali` : '0 Kali'}
                      </span>
                    </div>

                    {student.score !== null && student.score !== undefined && (
                      <div className="flex items-center justify-between border-t border-zinc-200 pt-1.5 mt-1">
                        <span className="text-zinc-600 font-medium">Skor Nilai:</span>
                        <span className="text-zinc-900 font-mono font-semibold text-xs bg-white px-1.5 py-0.2 rounded border border-zinc-200">
                          {student.score} Poin
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Kotak Peringatan Pelanggaran Terakhir */}
                  {isLocked && student.lastViolation && (
                    <div className="p-2.5 bg-rose-100/70 border border-rose-300 rounded-lg mb-3 text-xs text-rose-950 space-y-0.5">
                      <div className="flex items-center gap-1.5 font-semibold text-rose-900">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>Pelanggaran ({student.lastViolation.time}):</span>
                      </div>
                      <div className="text-[11px] leading-relaxed">
                        {student.lastViolation.description}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tombol Aksi Pengawas */}
                <div className="pt-2 border-t border-zinc-100 flex items-center gap-1.5">
                  {isLocked ? (
                    <button
                      onClick={() => handleUnlock(student)}
                      className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-2xs active:scale-[0.98] hover:-translate-y-0.5"
                    >
                      <Unlock className="w-3.5 h-3.5" /> Buka Kunci Siswa
                    </button>
                  ) : isSubmitted ? (
                    <div className="flex-1 py-1.5 px-3 bg-zinc-100 text-zinc-700 border border-zinc-200 rounded-lg text-xs font-medium text-center flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-zinc-500" />
                      Selesai Terkirim
                    </div>
                  ) : (
                    <div className="flex-1 py-1.5 px-3 bg-zinc-50 text-zinc-700 border border-zinc-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Aman & Terkunci
                    </div>
                  )}

                  <button
                    onClick={() => handleDisqualify(student)}
                    className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-transparent hover:border-rose-200 transition active:scale-[0.98]"
                    title="Diskualifikasi Siswa dari Ujian"
                  >
                    <Ban className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center bg-white rounded-xl border border-dashed border-zinc-300 p-6 space-y-2">
            <div className="w-12 h-12 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto mb-2 border border-zinc-200">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-zinc-800 text-base">Belum Ada Siswa yang Sedang Mengerjakan</h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
              Saat ini belum ada peserta yang memulai sesi ujian ini atau seluruh sesi pengerjaan telah selesai. Kartu pemantauan akan otomatis muncul secara langsung (real-time) saat siswa memasukkan Password Masuk Ujian.
            </p>
          </div>
        )}
      </div>

      {/* MODAL SIARAN PENGUMUMAN LANGSUNG KE SISWA */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-zinc-200 space-y-4 my-8">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-800 flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-900">
                    Siaran Pengumuman Pengawas
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Kirim ralat soal atau instruksi waktu langsung ke layar seluruh siswa aktif.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBroadcastModalOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              {/* Urgensi Level */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Tingkat Urgensi Pengumuman:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBroadcastUrgency('INFO')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition text-center ${
                      broadcastUrgency === 'INFO'
                        ? 'bg-zinc-900 border-zinc-900 text-white font-semibold shadow-2xs'
                        : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    Info Umum
                  </button>
                  <button
                    type="button"
                    onClick={() => setBroadcastUrgency('WARNING')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition text-center ${
                      broadcastUrgency === 'WARNING'
                        ? 'bg-amber-600 border-amber-600 text-white font-semibold shadow-2xs'
                        : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    Peringatan
                  </button>
                  <button
                    type="button"
                    onClick={() => setBroadcastUrgency('URGENT')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition text-center ${
                      broadcastUrgency === 'URGENT'
                        ? 'bg-rose-600 border-rose-600 text-white font-semibold shadow-2xs'
                        : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    Ralat Vital
                  </button>
                </div>
              </div>

              {/* Textarea Pesan */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Isi Pesan Pengumuman / Ralat Soal:
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Contoh: Perhatian siswa, untuk Soal No. 8 satuan yang dimaksud adalah cm bukan meter. Waktu tersisa 15 menit lagi."
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  className="w-full p-2.5 text-xs sm:text-sm rounded-lg border border-zinc-200 focus:outline-none focus:border-zinc-400 transition resize-none font-medium leading-relaxed"
                />
              </div>

              {/* Riwayat Pengumuman Sebelumnya (jika ada) */}
              {broadcastHistory.length > 0 && (
                <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-200 space-y-1.5">
                  <div className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                    Riwayat Siaran Sesi Ini:
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1 divide-y divide-zinc-200/60 text-xs">
                    {broadcastHistory.map((h) => (
                      <div key={h.id} className="pt-1.5 first:pt-0">
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                          <span className="font-semibold text-zinc-700">[{h.urgency}] {h.time}</span>
                          <span>Oleh: {h.sender}</span>
                        </div>
                        <p className="text-zinc-800 text-[11px] mt-0.5 line-clamp-2">
                          {h.message}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tombol Aksi */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!broadcastMessage.trim()}
                  className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-xs hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim ke Seluruh Siswa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
