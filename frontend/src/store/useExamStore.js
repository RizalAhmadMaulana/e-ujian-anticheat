import { create } from 'zustand';
import { examApi } from '../api/examApi';
import { authApi } from '../api/authApi';
import { proctoringApi } from '../api/proctoringApi';
import { ejournalApi } from '../api/ejournalApi';

/**
 * Mock Data Pengguna Awal
 */
const MOCK_TEACHER = {
  id: 't-001',
  username: 'guru',
  fullName: 'Guru Pengawas',
  full_name: 'Guru Pengawas',
  role: 'TEACHER',
  schoolName: 'MIS RISALAH',
};

const MOCK_STUDENT = {
  id: 's-001',
  username: '0067829101',
  fullName: 'Ahmad Fadhil Ramadhan',
  role: 'STUDENT',
  classroom: 'X TKJ 1',
  schoolName: 'SMK Negeri 1 Informatika',
  nisn: '0067829101',
};

const INITIAL_PACKAGES = [];
const INITIAL_SESSIONS = [];
const INITIAL_PROCTORING_STUDENTS = [];

const STORAGE_KEY_ATTEMPT = 'exam_active_attempt';

const getInitialActiveAttempt = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ATTEMPT);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        return {
          attemptId: parsed.attemptId || null,
          sessionId: parsed.sessionId || null,
          selectedPackage: parsed.selectedPackage || null,
          hasVerifiedEntryPassword: Boolean(parsed.hasVerifiedEntryPassword),
          screenOrientation: parsed.screenOrientation || localStorage.getItem('exam_screen_orientation') || 'PORTRAIT',
          isLocked: Boolean(parsed.isLocked),
          violationCount: Number(parsed.violationCount) || 0,
          violationLogs: Array.isArray(parsed.violationLogs) ? parsed.violationLogs : [],
          studentAnswers: (parsed.studentAnswers && typeof parsed.studentAnswers === 'object') ? parsed.studentAnswers : {},
          remainingSeconds: Number(parsed.remainingSeconds) || 3600,
          examStartedAt: parsed.examStartedAt || null,
          examSubmittedAt: parsed.examSubmittedAt || null,
          supervisorPin: parsed.supervisorPin || '',
          isSimulation: Boolean(parsed.isSimulation),
        };
      }
    }
  } catch (_) {}
  return {
    attemptId: null,
    sessionId: null,
    selectedPackage: null,
    hasVerifiedEntryPassword: false,
    screenOrientation: (() => {
      try {
        return localStorage.getItem('exam_screen_orientation') || 'PORTRAIT';
      } catch {
        return 'PORTRAIT';
      }
    })(),
    isLocked: false,
    violationCount: 0,
    violationLogs: [],
    studentAnswers: {},
    remainingSeconds: 60 * 60,
    examStartedAt: null,
    examSubmittedAt: null,
    supervisorPin: '',
    isSimulation: false,
  };
};

const persistActiveAttempt = (attempt) => {
  try {
    if (attempt && (attempt.attemptId || attempt.sessionId || attempt.selectedPackage)) {
      localStorage.setItem(STORAGE_KEY_ATTEMPT, JSON.stringify(attempt));
    }
  } catch (_) {}
};

const clearActiveAttemptStorage = () => {
  try {
    localStorage.removeItem(STORAGE_KEY_ATTEMPT);
  } catch (_) {}
};

export const useExamStore = create((set, get) => ({
  // ==========================================
  // 1. STATE AUTENTIKASI
  // ==========================================
  currentUser: (() => {
    try {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        const name = parsed.full_name || parsed.fullName || parsed.username || 'Pengguna';
        let className = '';
        if (parsed.classroom_name) {
          className = parsed.classroom_name;
        } else if (typeof parsed.classroom === 'object' && parsed.classroom !== null) {
          className = parsed.classroom.name || '';
        } else if (typeof parsed.classroom === 'string') {
          className = parsed.classroom;
        }
        return {
          ...parsed,
          fullName: name,
          full_name: name,
          classroom: className,
          classroom_name: className,
        };
      }
      return null;
    } catch {
      return null;
    }
  })(),
  isAuthenticated: !!localStorage.getItem('access_token'),

  setCurrentUser: (user) => {
    if (user) {
      const name = user.full_name || user.fullName || user.username || 'Pengguna';
      let className = '';
      if (user.classroom_name) {
        className = user.classroom_name;
      } else if (typeof user.classroom === 'object' && user.classroom !== null) {
        className = user.classroom.name || '';
      } else if (typeof user.classroom === 'string') {
        className = user.classroom;
      }
      const normalized = {
        ...user,
        fullName: name,
        full_name: name,
        classroom: className,
        classroom_name: className,
      };
      localStorage.setItem('user', JSON.stringify(normalized));
      set({
        currentUser: normalized,
        isAuthenticated: true,
      });
    } else {
      set({ currentUser: null, isAuthenticated: false });
    }
  },

  loginAsTeacher: () => {
    set({
      currentUser: MOCK_TEACHER,
      isAuthenticated: true,
    });
  },

  loginAsStudent: () => {
    set({
      currentUser: MOCK_STUDENT,
      isAuthenticated: true,
    });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    clearActiveAttemptStorage();
    set({
      currentUser: null,
      isAuthenticated: false,
      activeAttempt: getInitialActiveAttempt(),
    });
  },

  // ==========================================
  // 2. DATA PAKET UJIAN & SESI
  // ==========================================
  examPackages: [],
  examSessions: [],

  fetchPackages: async () => {
    try {
      const data = await examApi.getPackagesApi();
      if (Array.isArray(data)) {
        set({ examPackages: data });
        return data;
      }
    } catch (err) {
      console.warn('[useExamStore] fetchPackages error:', err);
    }
    return get().examPackages;
  },

  fetchSessions: async () => {
    try {
      const data = await examApi.getSessionsApi();
      if (Array.isArray(data)) {
        set({ examSessions: data });
        return data;
      }
    } catch (err) {
      console.warn('[useExamStore] fetchSessions error:', err);
    }
    return get().examSessions;
  },

  addExamPackage: (newPackage) => {
    set((state) => ({
      examPackages: [
        {
          ...newPackage,
          id: newPackage.id || `pkg-${Date.now()}`,
          createdAt: new Date().toISOString(),
        },
        ...state.examPackages,
      ],
    }));
  },

  addExamSession: (newSession) => {
    set((state) => ({
      examSessions: [
        {
          ...newSession,
          id: newSession.id || `ses-${Date.now()}`,
          isActive: true,
          strictLockdown: true,
        },
        ...state.examSessions,
      ],
    }));
  },

  // ==========================================
  // 3. STATE AKTIF SISWA (ARENA UJIAN)
  // ==========================================
  activeAttempt: getInitialActiveAttempt(),

  setAttemptId: (attemptId) => {
    set((state) => {
      const updated = {
        ...state.activeAttempt,
        attemptId,
      };
      persistActiveAttempt(updated);
      return { activeAttempt: updated };
    });
  },

  setSessionId: (sessionId, supervisorPin = '') => {
    set((state) => {
      const updated = {
        ...state.activeAttempt,
        sessionId,
        supervisorPin: supervisorPin || state.activeAttempt.supervisorPin || '',
      };
      persistActiveAttempt(updated);
      return { activeAttempt: updated };
    });
  },

  setSelectedPackage: (pkg) => {
    set((state) => {
      const updated = {
        ...state.activeAttempt,
        selectedPackage: pkg,
      };
      persistActiveAttempt(updated);
      return { activeAttempt: updated };
    });
  },

  setScreenOrientation: (orientation) => {
    try {
      localStorage.setItem('exam_screen_orientation', orientation);
    } catch (_) {}
    set((state) => {
      const updated = {
        ...state.activeAttempt,
        screenOrientation: orientation,
      };
      persistActiveAttempt(updated);
      return { activeAttempt: updated };
    });
  },

  startSimulationExam: ({ packageId, sessionId, orientation = 'PORTRAIT', studentName = 'Mode Simulasi Siswa' } = {}) => {
    const { examPackages, examSessions } = get();
    const pkg = examPackages.find((p) => p.id === packageId) || examPackages[0];
    const session = examSessions.find((s) => s.id === sessionId) || examSessions[0];

    const simStudent = {
      id: 'sim-student-01',
      username: 'simulasi_guru',
      fullName: studentName,
      role: 'STUDENT',
      classroom: session?.classroom || 'Kelas Simulasi',
      schoolName: 'SMK Negeri 1 Informatika',
      nisn: '9999999999',
    };

    const simAttempt = {
      attemptId: `sim-${Date.now()}`,
      sessionId: session?.id || 'ses-001',
      selectedPackage: pkg,
      hasVerifiedEntryPassword: true,
      screenOrientation: orientation,
      isLocked: false,
      violationCount: 0,
      violationLogs: [],
      studentAnswers: {},
      remainingSeconds: (session?.durationMinutes || 60) * 60,
      examStartedAt: new Date().toLocaleTimeString('id-ID'),
      examSubmittedAt: null,
      isSimulation: true,
      supervisorPin: 'GURU123',
    };
    persistActiveAttempt(simAttempt);

    set({
      currentUser: simStudent,
      activeAttempt: simAttempt,
    });
  },

  verifyEntryPassword: (inputPassword) => {
    const { activeAttempt, examSessions } = get();
    const currentSession = examSessions.find((s) => s.id === activeAttempt.sessionId) || examSessions[0];
    
    if (inputPassword && inputPassword.trim().toUpperCase() === currentSession.entryPassword.toUpperCase()) {
      set((state) => {
        const updated = {
          ...state.activeAttempt,
          hasVerifiedEntryPassword: true,
          examStartedAt: new Date().toLocaleTimeString('id-ID'),
        };
        persistActiveAttempt(updated);
        return { activeAttempt: updated };
      });
      return { success: true };
    }
    return { success: false, message: 'Password Masuk salah! Silakan tanyakan kepada pengawas.' };
  },

  setStudentAnswer: (questionId, answer) => {
    set((state) => {
      const updatedAnswers = {
        ...state.activeAttempt.studentAnswers,
        [questionId]: answer,
      };
      const updatedAttempt = {
        ...state.activeAttempt,
        studentAnswers: updatedAnswers,
      };
      persistActiveAttempt(updatedAttempt);
      return { activeAttempt: updatedAttempt };
    });
  },

  decrementTimer: () => {
    set((state) => {
      const currentRemaining = state.activeAttempt.remainingSeconds;
      if (currentRemaining <= 0) return state;
      const updatedAttempt = {
        ...state.activeAttempt,
        remainingSeconds: currentRemaining - 1,
      };
      // Persist timer periodically (e.g. every 5 seconds) to avoid storage spam
      if (currentRemaining % 5 === 0) {
        persistActiveAttempt(updatedAttempt);
      }
      return {
        activeAttempt: updatedAttempt,
      };
    });
  },

  // ==========================================
  // 4. PROTOKOL KEAMANAN ANTI-CHEAT (SISWA)
  // ==========================================
  triggerViolationLock: (violationType, description) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID');
    const currentUser = get().currentUser || MOCK_STUDENT;

    const newLog = {
      id: `viol-${Date.now()}`,
      studentId: currentUser.id,
      studentName: currentUser.fullName,
      nisn: currentUser.nisn || '0067829101',
      violationType, // 'TAB_SWITCH' | 'EXIT_FULLSCREEN' | 'WINDOW_BLUR_APP_SWITCH' | 'SHORTCUT_ATTEMPT'
      description: description || 'Upaya perpindahan layar atau aplikasi terdeteksi sistem.',
      detectedAt: timeString,
      unlockedAt: null,
    };

    set((state) => {
      const updatedCount = state.activeAttempt.violationCount + 1;
      const updatedLogs = [newLog, ...state.activeAttempt.violationLogs];

      // Update juga di daftar proctoring untuk sinkronisasi simulasi
      const updatedProctoring = state.proctoringStudents.map((s) => {
        if (s.studentId === currentUser.id) {
          return {
            ...s,
            status: 'LOCKED_VIOLATION',
            violationCount: s.violationCount + 1,
            lastViolation: {
              type: violationType,
              description: newLog.description,
              time: timeString,
            },
          };
        }
        return s;
      });

      const updatedAttempt = {
        ...state.activeAttempt,
        isLocked: true,
        violationCount: updatedCount,
        violationLogs: updatedLogs,
      };
      persistActiveAttempt(updatedAttempt);

      return {
        activeAttempt: updatedAttempt,
        proctoringStudents: updatedProctoring,
      };
    });
  },

  finishExam: () => {
    const { activeAttempt, currentUser } = get();
    const now = new Date().toLocaleTimeString('id-ID');

    set((state) => {
      // Kalkulasi skor otomatis untuk soal mandiri pilihan ganda
      let calculatedScore = null;
      if (state.activeAttempt.selectedPackage?.examType === 'NATIVE_QUESTIONS') {
        let score = 0;
        (state.activeAttempt.selectedPackage.questions || []).forEach((q) => {
          if (q.questionType === 'MULTIPLE_CHOICE') {
            if (state.activeAttempt.studentAnswers[q.id] === q.correctOption) {
              score += q.points;
            }
          }
        });
        calculatedScore = score;
      }

      const updatedProctoring = state.proctoringStudents.map((s) => {
        if (s.studentId === currentUser?.id) {
          return {
            ...s,
            status: 'SUBMITTED',
            finishedAt: now,
            score: calculatedScore !== null ? calculatedScore : 90,
          };
        }
        return s;
      });

      clearActiveAttemptStorage();

      return {
        activeAttempt: {
          ...state.activeAttempt,
          isLocked: false,
          examSubmittedAt: now,
        },
        proctoringStudents: updatedProctoring,
      };
    });

    return { success: true };
  },

  resetActiveAttempt: () => {
    clearActiveAttemptStorage();
    set({ activeAttempt: getInitialActiveAttempt() });
  },

  verifyExitPassword: (_inputPassword) => {
    // Kompatibilitas mundur: keluar langsung tanpa memerlukan kata sandi
    return get().finishExam();
  },

  // ==========================================
  // 5. LIVE PROCTORING & E-JURNAL (GURU)
  // ==========================================
  proctoringStudents: [],

  fetchProctoringStudents: async (sessionId) => {
    if (!sessionId) return [];
    try {
      const data = await proctoringApi.getSessionStatus(sessionId);
      if (data && Array.isArray(data.students)) {
        set({ proctoringStudents: data.students });
        return data.students;
      }
    } catch (err) {
      console.warn('[useExamStore] fetchProctoringStudents error:', err);
    }
    return get().proctoringStudents;
  },

  unlockStudent: (studentId) => {
    const nowTime = new Date().toLocaleTimeString('id-ID');
    set((state) => {
      // 1. Pulihkan status proctoring
      const updatedProctoring = state.proctoringStudents.map((student) => {
        if (!studentId || student.studentId === studentId || student.id === studentId || student.attemptId === studentId) {
          return {
            ...student,
            status: 'WORKING',
          };
        }
        return student;
      });

      // 2. Selalu pulihkan activeAttempt jika siswa saat ini di-unlock
      const updatedActiveAttempt = {
        ...state.activeAttempt,
        isLocked: false,
        violationLogs: state.activeAttempt.violationLogs.map((log, index) =>
          index === 0 && !log.unlockedAt ? { ...log, unlockedAt: nowTime } : log
        ),
      };

      persistActiveAttempt(updatedActiveAttempt);

      return {
        proctoringStudents: updatedProctoring,
        activeAttempt: updatedActiveAttempt,
      };
    });
  },

  disqualifyStudent: (studentId) => {
    set((state) => ({
      proctoringStudents: state.proctoringStudents.map((student) =>
        student.studentId === studentId ? { ...student, status: 'DISQUALIFIED' } : student
      ),
    }));
  },

  saveSupervisorNotes: (sessionId, notes) => {
    if (sessionId && sessionId.length > 10) {
      ejournalApi.updateSupervisorNotesApi(sessionId, notes).catch((err) => {
        console.warn('[useExamStore] saveSupervisorNotes fallback lokal:', err);
      });
    }
    set((state) => ({
      examSessions: state.examSessions.map((s) =>
        s.id === sessionId ? { ...s, supervisorNotes: notes, supervisor_notes: notes } : s
      ),
    }));
  },

  // ==========================================
  // 6. PENGATURAN SEKOLAH (DYNAMIC SCHOOL SETTINGS)
  // ==========================================
  schoolSettings: {
    name: 'MIS RISALAH',
    sub_header: 'KEMENTERIAN AGAMA REPUBLIK INDONESIA',
    address: 'Jl. Raya Karangampel No. 45',
    phone: '(0234) 123456',
    email: 'info@mis-risalah.sch.id',
    principal_name: "H. Ahmad Syafi'i, M.Pd.I",
    principal_nip: '197508102003121002',
    city: 'Indramayu',
    academic_year: '2026/2027',
    logo_url: '',
  },

  fetchSchoolSettings: async () => {
    try {
      const data = await authApi.getSchoolSettingsApi();
      if (data && data.name) {
        set({ schoolSettings: data });
        return data;
      }
    } catch (err) {
      console.warn('[useExamStore] fetchSchoolSettings fallback lokal:', err);
    }
    return get().schoolSettings;
  },

  updateSchoolSettings: async (payload) => {
    try {
      const data = await authApi.updateSchoolSettingsApi(payload);
      if (data && data.name) {
        set({ schoolSettings: data });
        return { success: true, data };
      }
    } catch (err) {
      console.warn('[useExamStore] updateSchoolSettings error:', err);
      // Fallback update lokal
      set((state) => ({
        schoolSettings: {
          ...state.schoolSettings,
          ...payload,
        },
      }));
      return { success: false, error: err.response?.data || err.message };
    }
  },
}));

