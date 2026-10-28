import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExamStore } from '../../store/useExamStore';
import { getSessionsApi, startExamAttemptApi } from '../../api/examApi';
import { 
  BookOpen, 
  ExternalLink, 
  ArrowRight, 
  ShieldCheck, 
  ArrowLeft, 
  Lock, 
  Sparkles, 
  Maximize2, 
  AlertTriangle, 
  Smartphone, 
  Monitor 
} from 'lucide-react';

export default function SubjectPortal() {
  const navigate = useNavigate();
  const { 
    examPackages, 
    setSelectedPackage, 
    activeAttempt, 
    currentUser, 
    examSessions,
    setAttemptId,
    setSessionId
  } = useExamStore();
  
  const [availableSessions, setAvailableSessions] = useState(examSessions);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchingPackageId, setLaunchingPackageId] = useState(null);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const sessions = await getSessionsApi();
        if (sessions && sessions.length > 0) {
          setAvailableSessions(sessions);
        }
      } catch (err) {
        console.warn('Gagal ambil sesi backend, pakai store:', err);
      }
    };
    fetchSessions();
  }, []);

  const handleStartExam = async (pkg) => {
    setIsLaunching(true);
    setLaunchingPackageId(pkg.id);
    setSelectedPackage(pkg);

    // Cari sesi ujian yang cocok
    const matchingSession = availableSessions.find(
      s => s.package === pkg.id || (s.package && s.package.id === pkg.id) || s.packageId === pkg.id
    ) || availableSessions[0];

    if (matchingSession) {
      setSessionId(matchingSession.id, matchingSession.supervisor_pin || matchingSession.supervisorPin || '');
      try {
        const res = await startExamAttemptApi(matchingSession.id, activeAttempt.screenOrientation);
        if (res && res.attempt_id) {
          setAttemptId(res.attempt_id);
        }
      } catch (err) {
        console.warn('Backend startAttempt fallback ke lokal attempt:', err);
      }
    }

    // Aktifkan HTML5 Fullscreen API secara mutlak
    try {
      const docEl = document.documentElement;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.msRequestFullscreen) {
        await docEl.msRequestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen request blocked or not user-gesture triggered:', err);
    }

    setTimeout(() => {
      navigate('/student/exam-workspace');
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Background Ambience Glow */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-2xl w-full space-y-6 z-10">
        {/* Navigation & Header Status Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/student/lobby')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Lobby</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 rounded-xl bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 font-bold flex items-center gap-1.5 shadow-sm">
              {activeAttempt.screenOrientation === 'LANDSCAPE' ? (
                <Monitor className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              )}
              <span>Orientasi: {activeAttempt.screenOrientation}</span>
            </span>
          </div>
        </div>

        {/* Big Title Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-950/70 border border-indigo-500/30 text-indigo-400 text-xs font-bold mb-1 shadow-sm">
            <Lock className="w-3.5 h-3.5" /> Ruang Ujian Terproteksi — Kelas {currentUser?.classroom || 'X TKJ 1'}
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
            Selamat Datang di Portal Ujian — Pilih Mata Pelajaran
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            Klik tombol mata pelajaran di bawah ini untuk memulai pengerjaan. Layar Anda akan langsung dikunci dalam mode <strong className="text-white">Fullscreen Otomatis</strong>.
          </p>
        </div>

        {/* Warning Callout Box */}
        <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-3 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <div className="font-extrabold text-white text-xs">
              Peringatan Keamanan Asesmen:
            </div>
            <p className="text-amber-200/90 text-[11px]">
              Begitu tombol mata pelajaran ditekan, jangan tekan tombol ESC, tombol Home, atau berpindah ke aplikasi lain. Layar akan langsung dibekukan dan kejadian tersebut akan tercatat dalam <strong>E-Jurnal Guru</strong>.
            </p>
          </div>
        </div>

        {/* ======================================================== */}
        {/* LIST TOMBOL MATA PELAJARAN (EXAMBROWSER BIG BUTTONS) */}
        {/* ======================================================== */}
        <div className="space-y-3.5">
          {examPackages.map((pkg) => {
            const isSelected = launchingPackageId === pkg.id;
            const isNative = pkg.examType === 'NATIVE_QUESTIONS';

            return (
              <button
                key={pkg.id}
                type="button"
                disabled={isLaunching}
                onClick={() => handleStartExam(pkg)}
                className={`w-full group relative text-left p-5 sm:p-6 rounded-3xl border-2 transition-all duration-200 shadow-xl flex items-center justify-between overflow-hidden ${
                  isSelected
                    ? 'border-indigo-400 bg-indigo-950/90 ring-4 ring-indigo-500/30'
                    : 'border-slate-800 hover:border-indigo-500 bg-slate-900/90 hover:bg-slate-900 transform hover:-translate-y-1'
                }`}
              >
                <div className="flex items-center gap-4 sm:gap-5">
                  {/* Icon Box */}
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-110 ${
                      isNative
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 shadow-emerald-950/40'
                        : 'bg-purple-600/20 text-purple-400 border border-purple-500/30 shadow-purple-950/40'
                    }`}
                  >
                    {isNative ? (
                      <BookOpen className="w-7 h-7" />
                    ) : (
                      <ExternalLink className="w-7 h-7" />
                    )}
                  </div>

                  {/* Title & Badge */}
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-base sm:text-lg font-black text-white uppercase tracking-tight group-hover:text-indigo-300 transition">
                        {pkg.subjectName}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          isNative
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : 'bg-purple-950 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {isNative ? 'Soal Mandiri (Native)' : 'Google Form Terproteksi'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium line-clamp-1">
                      {pkg.title}
                    </p>
                  </div>
                </div>

                {/* Arrow Button */}
                <div className="flex items-center gap-2 text-xs font-black text-indigo-400 group-hover:text-white group-hover:translate-x-1.5 transition-transform shrink-0 pl-2">
                  <span className="hidden sm:inline-block font-mono tracking-wider">
                    {isSelected ? 'MEMBUKA...' : 'MULAI UJIAN'}
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-indigo-600/20 group-hover:bg-indigo-600 border border-indigo-500/30 flex items-center justify-center text-indigo-300 group-hover:text-white transition">
                    {isSelected ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <ArrowRight className="w-5 h-5" />
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Security Footer Notice */}
        <div className="pt-2 text-center text-[11px] text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Sesi Asesmen Diawasi oleh Pengawas Ruang Ujian & Sistem Anti-Cheat</span>
        </div>
      </div>
    </div>
  );
}
