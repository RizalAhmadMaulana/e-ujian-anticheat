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
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* ======================================================== */}
      {/* 1. WELCOME BANNER & ZERO-TOLERANCE STATUS */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 sm:p-8 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Sistem Pengawasan Asesmen Berjalan Aktif
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight">
              Selamat Datang, {currentUser?.fullName || currentUser?.full_name || 'Drs. Budi Santoso'}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Monitoring pelaksanaan asesmen sekolah secara langsung dengan proteksi penguncian layar 
              <strong className="text-white"> Zero-Tolerance Lockdown</strong>, pendeteksi kecurangan tab/aplikasi, dan otomatisasi <strong className="text-white">E-Jurnal Berita Acara</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/teacher/sessions')}
              className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition"
            >
              <CalendarClock className="w-4 h-4" />
              <span>Jadwalkan Sesi Ujian</span>
            </button>
            <button
              onClick={() => navigate('/teacher/proctoring')}
              className="px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-red-600/30 flex items-center gap-2 transition"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>Ruang Pengawas ({lockedStudents.length} Terkunci)</span>
            </button>
            <button
              onClick={() => navigate('/teacher/packages')}
              className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs sm:text-sm font-semibold border border-slate-700 flex items-center gap-2 transition"
            >
              <PlusCircle className="w-4 h-4 text-indigo-400" />
              <span>Buat Paket Soal</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. 4 KARTU STATISTIK UTAMA */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Kartu 1: Total Paket Soal */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Paket Soal
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 mt-2">{examPackages.length}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
            <span className="font-semibold text-indigo-600">Hybrid Source:</span>
            <span>Soal Mandiri & Link GForm</span>
          </div>
        </div>

        {/* Kartu 2: Sesi Ujian Aktif */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Sesi Ujian Aktif
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 mt-2">{activeSessions.length}</div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Siap dikerjakan siswa di kelas
          </div>
        </div>

        {/* Kartu 3: Siswa Sedang Mengerjakan */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Siswa Mengerjakan
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-800 mt-2">{workingStudents.length}</div>
          <div className="text-[11px] text-blue-600 font-semibold mt-1">
            {submittedStudents.length} dari {proctoringStudents.length} siswa telah selesai
          </div>
        </div>

        {/* Kartu 4: Total Pelanggaran Terdeteksi */}
        <div className={`bg-white rounded-2xl p-5 border transition ${
          lockedStudents.length > 0 
            ? 'border-red-400 ring-4 ring-red-100 shadow-md' 
            : 'border-slate-200/90 shadow-sm'
        }`}>
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Pelanggaran
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              lockedStudents.length > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-3xl font-black mt-2 ${lockedStudents.length > 0 ? 'text-red-600' : 'text-slate-800'}`}>
            {totalViolationsCount}
          </div>
          <div className="text-[11px] font-bold mt-1">
            {lockedStudents.length > 0 ? (
              <span className="text-red-600 flex items-center gap-1 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" /> {lockedStudents.length} siswa layar terkunci
              </span>
            ) : (
              <span className="text-emerald-600">Tidak ada penguncian aktif</span>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. DUA KOLOM: SESI UJIAN HARI INI & FEED LOG PELANGGARAN */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri (2 Kolom): Sesi Ujian Hari Ini */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-800">Sesi Ujian Hari Ini</h2>
              <p className="text-xs text-slate-500">Daftar ruangan ujian yang sedang aktif dan siap diakses siswa</p>
            </div>
            <button
              onClick={() => navigate('/teacher/sessions')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
            >
              <span>Kelola Semua Sesi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3.5">
            {examSessions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs space-y-3">
                <p>Belum ada sesi ujian yang dibuat. Silakan buat sesi ujian untuk mengizinkan siswa mengakses soal.</p>
                <button
                  onClick={() => navigate('/teacher/sessions')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition"
                >
                  + Buat Sesi Ujian Baru
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
                    className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 bg-slate-50/50 hover:bg-indigo-50/20 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                          Kelas: {classroomName}
                        </span>
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-md bg-slate-200 text-slate-700">
                          {duration} Menit
                        </span>
                        {examType === 'EXTERNAL_LINK' ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-100 text-purple-700 flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" /> Google Form
                          </span>
                        ) : (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 flex items-center gap-1">
                            <BookOpen className="w-3 h-3" /> Soal Mandiri
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm">{sessionTitle}</h3>
                      <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                        <span>
                          Token Masuk: <strong className="text-indigo-700 font-mono font-bold">{entryPw}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Password Keluar: <strong className="text-slate-800 font-mono font-bold">{exitPw}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      <button
                        onClick={() => navigate('/teacher/proctoring')}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Radio className="w-3.5 h-3.5" /> Pantau Live
                      </button>
                      <button
                        onClick={() => navigate('/teacher/ejournal')}
                        className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" /> E-Jurnal
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Kolom Kanan (1 Kolom): Feed Log Pelanggaran Real-Time */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-800">Log Pelanggaran Siswa</h2>
                <p className="text-xs text-slate-500">Sensor perpindahan tab & keluar fullscreen</p>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            </div>

            <div className="mt-4 space-y-3">
              {studentsWithViolations.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
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
                      className={`p-3.5 rounded-xl border text-xs transition ${
                        isCurrentlyLocked
                          ? 'bg-red-50/80 border-red-300 ring-2 ring-red-300/40'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <div className="font-bold text-slate-800">{sName}</div>
                          <div className="text-[11px] text-slate-500">
                            NISN: {sNisn} ({sClass})
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isCurrentlyLocked 
                            ? 'bg-red-600 text-white animate-pulse' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {vCount}x Pelanggaran
                        </span>
                      </div>

                      {student.lastViolation && (
                        <div className="text-[11px] text-slate-600 bg-white/70 p-2 rounded-lg border border-slate-200/60 mb-2">
                          <span className="font-semibold text-red-600">[{student.lastViolation.time}]</span> {student.lastViolation.description}
                        </div>
                      )}

                      {isCurrentlyLocked && (
                        <button
                          onClick={() => unlockStudent(student.studentId || student.id)}
                          className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <Unlock className="w-3.5 h-3.5" /> Buka Kunci Layar Siswa
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={() => navigate('/teacher/proctoring')}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Radio className="w-4 h-4 text-red-400" /> Buka Ruang Live Proctoring Lengkap
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
