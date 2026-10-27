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
  WifiOff
} from 'lucide-react';

export default function LiveProctoring() {
  const { 
    examSessions, 
    proctoringStudents, 
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

  const { isConnected, sendUnlockCommand, sendDisqualifyCommand } = useProctorSocket(
    selectedSessionId,
    {
      onStudentLocked: handleStudentLocked,
      onStudentUnlocked: handleStudentUnlocked,
      onStudentDisqualified: handleStudentDisqualified,
      onStudentSubmitted: handleStudentSubmitted
    }
  );

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
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Ruang Pengawas Real-Time (Live Proctoring)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pantau aktivitas ujian, layar siswa terkunci secara live, dan berikan izin buka kunci (unlock).
          </p>
        </div>

        {/* Action Simulasi & Status Koneksi */}
        <div className="flex items-center gap-2.5">
          <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 ${
            isConnected 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
              : 'bg-amber-50 border-amber-300 text-amber-800'
          }`}>
            {isConnected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                <span>WebSocket Aktif</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                <span>Mode Standby</span>
              </>
            )}
          </div>

          <button
            onClick={fetchSessionStatus}
            disabled={isLoading}
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition"
            title="Muat Ulang Status"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Bar Filter Sesi Ujian & Ringkasan Status (Tebal & Berdimensi) */}
      <div className="bg-white rounded-2xl p-5 border-2 border-slate-200 shadow-md space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Pilih Sesi Ujian */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
              Pilih Sesi Ujian Aktif:
            </label>
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              className="w-full text-xs sm:text-sm font-bold rounded-xl border-2 border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 py-2.5 bg-slate-50 text-slate-900 shadow-sm"
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
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1">
              Cari Nama atau NISN Siswa:
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Ketik nama atau nomor induk..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl border-2 border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 bg-white shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* 4 Tombol Filter Tab Status (Mobile Scrollable & Tebal) */}
        <div className="flex items-center gap-2 pt-2 border-t-2 border-slate-100 overflow-x-auto pb-1.5 sm:flex-wrap">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shrink-0 border-2 ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200 hover:border-slate-300'
            }`}
          >
            <span>Semua Siswa</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-700 text-white font-bold">
              {totalCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('WORKING')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shrink-0 border-2 ${
              statusFilter === 'WORKING'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Sedang Fokus</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-200 text-emerald-900 font-black">
              {workingCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('LOCKED_VIOLATION')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shrink-0 border-2 ${
              statusFilter === 'LOCKED_VIOLATION'
                ? 'bg-red-600 text-white border-red-600 shadow-md shadow-red-500/20 animate-pulse'
                : 'bg-red-50 text-red-900 border-red-200 hover:bg-red-100 hover:border-red-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span>Layar Terkunci</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-200 text-red-900 font-black">
              {lockedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('SUBMITTED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 shrink-0 border-2 ${
              statusFilter === 'SUBMITTED'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100 hover:border-blue-300'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-400" />
            <span>Selesai Terkirim</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-200 text-blue-900 font-black">
              {submittedCount}
            </span>
          </button>
        </div>
      </div>

      {/* Grid Kartu Siswa Real-Time (Desain Tebal & Berkarakter) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {filteredStudents.length > 0 ? (
          filteredStudents.map((student) => {
            const isLocked = student.status === 'LOCKED_VIOLATION';
            const isSubmitted = student.status === 'SUBMITTED';

            return (
              <div
                key={student.studentId || student.nisn}
                className={`rounded-2xl p-5 border-2 transition-all duration-200 flex flex-col justify-between space-y-3.5 ${
                  isLocked
                    ? 'bg-red-50/95 border-red-500 shadow-xl ring-4 ring-red-400/40 animate-pulse-fast'
                    : isSubmitted
                    ? 'bg-white border-blue-400 hover:border-blue-600 shadow-md hover:shadow-xl'
                    : 'bg-white border-emerald-400 hover:border-emerald-600 shadow-md hover:shadow-xl'
                }`}
              >
                <div>
                  {/* Bar Atas Kartu Siswa */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="font-black text-slate-900 text-base leading-tight tracking-tight">
                        {student.fullName}
                      </h3>
                      <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {student.nisn}
                        </span>
                        <span>•</span>
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                          {student.classroom}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={student.status} />
                  </div>

                  {/* Info Device & Waktu (Kotak Tebal Berdimensi) */}
                  <div className="space-y-2 text-xs bg-slate-50/90 border-2 border-slate-200 rounded-xl p-3.5 shadow-sm mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-bold flex items-center gap-1.5">
                        {student.screenOrientation === 'LANDSCAPE' ? (
                          <Monitor className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                        )}
                        Orientasi Layar:
                      </span>
                      <span className="font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {student.screenOrientation}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-bold">Mulai Pengerjaan:</span>
                      <span className="font-bold text-slate-800">{student.startedAt || '-'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-bold">Waktu Selesai:</span>
                      <span className="font-bold text-slate-800">{student.finishedAt || 'Sedang Berjalan'}</span>
                    </div>

                    <div className="flex items-center justify-between border-t-2 border-slate-200/80 pt-1.5 mt-1">
                      <span className="text-slate-600 font-bold">Total Pelanggaran:</span>
                      <span className={`font-black px-2 py-0.5 rounded border ${
                        student.violationCount > 0 
                          ? 'text-red-700 bg-red-100 border-red-300 animate-pulse' 
                          : 'text-emerald-800 bg-emerald-100 border-emerald-300'
                      }`}>
                        {student.violationCount > 0 ? `${student.violationCount} Kali Terdeteksi` : '0 Kali (Kondusif)'}
                      </span>
                    </div>

                    {student.score !== null && student.score !== undefined && (
                      <div className="flex items-center justify-between border-t-2 border-slate-200/80 pt-1.5 mt-1 font-bold">
                        <span className="text-slate-700">Skor Nilai:</span>
                        <span className="text-indigo-700 font-black text-sm bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {student.score} Poin
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Kotak Peringatan Pelanggaran Terakhir */}
                  {isLocked && student.lastViolation && (
                    <div className="p-3 bg-red-100 border-2 border-red-400 rounded-xl mb-4 text-xs text-red-950 space-y-1 shadow-sm">
                      <div className="flex items-center gap-1.5 font-black text-red-900">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Pelanggaran ({student.lastViolation.time}):</span>
                      </div>
                      <div className="text-[11px] leading-relaxed font-bold">
                        {student.lastViolation.description}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tombol Aksi Pengawas (Tebal & Berdimensi) */}
                <div className="pt-2 border-t-2 border-slate-100 flex items-center gap-2">
                  {isLocked ? (
                    <button
                      onClick={() => handleUnlock(student)}
                      className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 active:scale-95 border-2 border-emerald-500"
                    >
                      <Unlock className="w-4 h-4" /> Buka Kunci Layar Siswa
                    </button>
                  ) : isSubmitted ? (
                    <div className="flex-1 py-2.5 px-3 bg-blue-50 text-blue-900 border-2 border-blue-300 rounded-xl text-xs font-black text-center shadow-sm flex items-center justify-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                      Selesai Terkirim
                    </div>
                  ) : (
                    <div className="flex-1 py-2.5 px-3 bg-emerald-50 text-emerald-900 border-2 border-emerald-300 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-sm">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Aman & Terkunci
                    </div>
                  )}

                  <button
                    onClick={() => handleDisqualify(student)}
                    className="p-2.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl border-2 border-slate-200 hover:border-red-300 transition active:scale-95"
                    title="Diskualifikasi Siswa dari Ujian"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-2">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2">
              <UserCheck className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Belum Ada Siswa yang Sedang Mengerjakan</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Saat ini belum ada peserta yang memulai sesi ujian ini atau seluruh sesi pengerjaan telah selesai. Kartu pemantauan akan otomatis muncul secara langsung (real-time) saat siswa memasukkan Password Masuk Ujian.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
