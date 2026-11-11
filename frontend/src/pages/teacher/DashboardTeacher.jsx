import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import StatusBadge from '../../components/common/StatusBadge';
import { 
  FolderKanban, 
  Users, 
  ShieldAlert, 
  Clock, 
  ArrowRight, 
  Radio, 
  FileSpreadsheet, 
  PlusCircle,
  ExternalLink,
  BookOpen,
  AlertTriangle,
  Unlock,
  CheckCircle2,
  CalendarCheck,
  CalendarClock,
  School
} from 'lucide-react';

export default function DashboardTeacher() {
  const navigate = useNavigate();
  const { 
    examPackages, 
    examSessions, 
    proctoringStudents, 
    currentUser,
    unlockStudent,
    fetchPackages,
    fetchSessions
  } = useExamStore();

  useEffect(() => {
    fetchPackages?.();
    fetchSessions?.();
  }, [fetchPackages, fetchSessions]);

  const activeSessions = examSessions.filter((s) => s.isActive || s.is_active);
  const lockedStudents = proctoringStudents.filter((s) => s.status === 'LOCKED_VIOLATION');
  const workingStudents = proctoringStudents.filter((s) => s.status === 'WORKING');
  const submittedStudents = proctoringStudents.filter((s) => s.status === 'SUBMITTED');
  const totalViolationsCount = proctoringStudents.reduce((acc, curr) => acc + (curr.violationCount || curr.violation_count || 0), 0);

  // Siswa yang pernah melakukan pelanggaran untuk feed
  const studentsWithViolations = proctoringStudents.filter((s) => (s.violationCount || s.violation_count) > 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      {/* ======================================================== */}
      {/* 1. WELCOME BANNER & ZERO-TOLERANCE STATUS */}
      {/* ======================================================== */}
      <div className="bg-[#090D16] rounded-xl p-5 sm:p-6 text-zinc-100 border border-zinc-800 shadow-sm relative overflow-hidden">
        {/* Subtle Architectural Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            backgroundSize: '32px 32px'
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Sistem Pengawasan Asesmen Berjalan
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Selamat Datang, {currentUser?.fullName || currentUser?.full_name || currentUser?.username || 'Guru Pengawas'}
            </h1>
            <p className="text-zinc-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Monitoring pelaksanaan asesmen sekolah dengan proteksi penguncian layar 
              <strong className="text-zinc-200 font-semibold"> Zero-Tolerance Lockdown</strong>, audit integritas tab/aplikasi, dan otomatisasi <strong className="text-zinc-200 font-semibold">E-Jurnal Berita Acara</strong>.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
            <button
              onClick={() => navigate('/teacher/sessions')}
              className="h-9 px-3.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold tracking-tight transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] shadow-xs flex items-center justify-center gap-1.5"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              <span>Jadwal Sesi</span>
            </button>
            <button
              onClick={() => navigate('/teacher/proctoring')}
              className="h-9 px-3.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold tracking-tight transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Ruang Pengawas ({lockedStudents.length} Terkunci)</span>
            </button>
            <button
              onClick={() => navigate('/teacher/packages')}
              className="h-9 px-3.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/70 text-zinc-200 text-xs font-medium tracking-tight transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] flex items-center justify-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5 text-zinc-400" />
              <span>Buat Paket</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. 4 KARTU STATISTIK UTAMA (2x2 di HP, 4 di Desktop) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Kartu 1: Total Paket Soal */}
        <div className="bg-white rounded-xl p-4 border border-zinc-200/80 shadow-xs hover:border-zinc-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-wider">
              Total Paket Soal
            </span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center border border-zinc-200/60">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-zinc-900 mt-1.5 tracking-tight tabular-nums">
            {examPackages.length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 flex items-center gap-1.5">
            <span className="font-medium text-zinc-700">Format:</span>
            <span className="truncate">Mandiri & Form</span>
          </div>
        </div>

        {/* Kartu 2: Sesi Ujian Aktif */}
        <div className="bg-white rounded-xl p-4 border border-zinc-200/80 shadow-xs hover:border-zinc-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-wider">
              Sesi Ujian Aktif
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-zinc-900 mt-1.5 tracking-tight tabular-nums">
            {activeSessions.length}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Siap diakses siswa</span>
          </div>
        </div>

        {/* Kartu 3: Siswa Sedang Mengerjakan */}
        <div className="bg-white rounded-xl p-4 border border-zinc-200/80 shadow-xs hover:border-zinc-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-wider">
              Siswa Fokus
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200/60">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-zinc-900 mt-1.5 tracking-tight tabular-nums">
            {workingStudents.length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 truncate">
            {submittedStudents.length} dari {proctoringStudents.length} selesai
          </div>
        </div>

        {/* Kartu 4: Total Pelanggaran Terdeteksi */}
        <div className={`bg-white rounded-xl p-4 border transition-colors shadow-xs ${
          lockedStudents.length > 0 
            ? 'border-rose-300 bg-rose-50/20' 
            : 'border-zinc-200/80 hover:border-zinc-300'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium text-zinc-500 uppercase tracking-wider">
              Pelanggaran
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
              lockedStudents.length > 0 ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-zinc-100 text-zinc-700 border-zinc-200/60'
            }`}>
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-bold mt-1.5 tracking-tight tabular-nums ${lockedStudents.length > 0 ? 'text-rose-700' : 'text-zinc-900'}`}>
            {totalViolationsCount}
          </div>
          <div className="text-[11px] font-medium mt-1">
            {lockedStudents.length > 0 ? (
              <span className="text-rose-700 flex items-center gap-1 animate-pulse truncate">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {lockedStudents.length} siswa terkunci
              </span>
            ) : (
              <span className="text-emerald-700 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Kondusif
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. DUA KOLOM: SESI UJIAN HARI INI & FEED LOG PELANGGARAN */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Kolom Kiri (2 Kolom): Sesi Ujian Hari Ini */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200/80 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3.5">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight">Sesi Ujian Hari Ini</h2>
              <p className="text-xs text-zinc-500">Daftar ruangan asesmen yang aktif dan siap diakses</p>
            </div>
            <button
              onClick={() => navigate('/teacher/sessions')}
              className="text-xs font-semibold text-zinc-700 hover:text-zinc-950 flex items-center gap-1 transition"
            >
              <span>Kelola Sesi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {examSessions.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 text-xs space-y-2.5">
                <p>Belum ada sesi ujian yang dibuat.</p>
                <button
                  onClick={() => navigate('/teacher/sessions')}
                  className="px-3.5 py-1.5 bg-zinc-900 text-white rounded-lg font-medium text-xs hover:bg-zinc-800 transition"
                >
                  + Buat Sesi Baru
                </button>
              </div>
            ) : (
              examSessions.map((session) => {
                const sessionTitle = session.title || session.package_title || 'Sesi Ujian';
                const classroomName = session.classroom_name || session.classroom || 'Semua Kelas';
                const duration = session.duration_minutes || session.durationMinutes || 60;
                const entryPw = session.entry_password || session.entryPassword || '-';
                const exitPw = session.exit_password || session.exitPassword || '-';
                const examType = session.exam_type || session.examType || 'NATIVE_QUESTIONS';

                return (
                  <div
                    key={session.id}
                    className="p-3.5 rounded-lg border border-zinc-200/70 bg-zinc-50/50 hover:bg-zinc-50/80 hover:border-zinc-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-zinc-100 text-zinc-800 border border-zinc-200/70">
                          Kelas {classroomName}
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 border border-zinc-200/50">
                          {duration} Menit
                        </span>
                        {examType === 'EXTERNAL_LINK' ? (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60 flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" /> Form Eksternal
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                            <BookOpen className="w-3 h-3" /> Soal Mandiri
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-zinc-900 text-sm tracking-tight">{sessionTitle}</h3>
                      <div className="text-[11px] text-zinc-500 flex flex-wrap items-center gap-2.5">
                        <span>
                          Token Masuk: <strong className="text-zinc-900 font-mono font-bold">{entryPw}</strong>
                        </span>
                        <span className="text-zinc-300">•</span>
                        <span>
                          PIN Pengawas: <strong className="text-zinc-900 font-mono font-bold">{session.supervisor_pin || session.supervisorPin || 'PIN-1234'}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      <button
                        onClick={() => navigate('/teacher/proctoring')}
                        className="h-8 px-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-medium transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98] flex items-center gap-1.5 shadow-xs"
                      >
                        <Radio className="w-3.5 h-3.5" /> Pantau Live
                      </button>
                      <button
                        onClick={() => navigate('/teacher/ejournal')}
                        className="h-8 px-3 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-lg text-xs font-medium transition flex items-center gap-1.5 shadow-xs"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-500" /> E-Jurnal
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Kolom Kanan (1 Kolom): Feed Log Pelanggaran Real-Time */}
        <div className="bg-white rounded-xl border border-zinc-200/80 shadow-xs p-5 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3.5">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-zinc-900 tracking-tight">Log Pelanggaran Siswa</h2>
                <p className="text-xs text-zinc-500">Sensor perpindahan tab & keluar fullscreen</p>
              </div>
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            </div>

            <div className="mt-3.5 space-y-2.5">
              {studentsWithViolations.length === 0 ? (
                <div className="p-6 text-center text-zinc-400 text-xs">
                  Belum ada catatan pelanggaran terdeteksi.
                </div>
              ) : (
                studentsWithViolations.map((student) => {
                  const isCurrentlyLocked = student.status === 'LOCKED_VIOLATION';
                  const sName = student.fullName || student.student_name || 'Siswa';
                  const sNisn = student.nisn || student.username || '-';
                  const sClass = student.classroom || student.classroom_name || '-';
                  const vCount = student.violationCount || student.violation_count || 0;

                  return (
                    <div
                      key={student.studentId || student.id}
                      className={`p-3 rounded-lg border text-xs transition-colors ${
                        isCurrentlyLocked
                          ? 'bg-rose-50/70 border-rose-300'
                          : 'bg-zinc-50/70 border-zinc-200/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <div className="font-semibold text-zinc-900">{sName}</div>
                          <div className="text-[10px] font-mono text-zinc-500">
                            NISN: {sNisn} ({sClass})
                          </div>
                        </div>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                          isCurrentlyLocked 
                            ? 'bg-rose-100 text-rose-800 border-rose-300' 
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {vCount}x Pelanggaran
                        </span>
                      </div>

                      {student.lastViolation && (
                        <div className="text-[11px] text-zinc-600 bg-white/80 p-2 rounded border border-zinc-200/60 mb-2">
                          <span className="font-semibold text-rose-600">[{student.lastViolation.time}]</span> {student.lastViolation.description}
                        </div>
                      )}

                      {isCurrentlyLocked && (
                        <button
                          onClick={() => unlockStudent(student.studentId || student.id)}
                          className="w-full py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Unlock className="w-3.5 h-3.5" /> Buka Kunci Layar
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100">
            <button
              onClick={() => navigate('/teacher/proctoring')}
              className="w-full h-9 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-semibold tracking-tight transition flex items-center justify-center gap-2 shadow-xs"
            >
              <Radio className="w-3.5 h-3.5 text-rose-400" /> Buka Ruang Live Proctoring
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
