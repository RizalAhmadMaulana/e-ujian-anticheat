import { useEffect, useRef, useState, useCallback } from 'react';
import { getBaseWsUrl } from '../api/axiosInstance';
import { useExamStore } from '../store/useExamStore';

/**
 * Hook WebSocket Proctoring Real-Time
 * Menghubungkan Guru (Live Proctoring) dan Siswa (ExamWorkspace) ke Daphne Channels
 */
export const useProctorSocket = (sessionId, callbacks = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const callbacksRef = useRef(callbacks);

  // Perbarui ref callbacks agar tidak memicu re-subscribe berulang
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  const connect = useCallback(() => {
    if (!sessionId) return;

    try {
      const wsUrl = `${getBaseWsUrl()}/ws/proctoring/${sessionId}/`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log(`[WebSocket] Terhubung ke Sesi Proctoring: ${sessionId}`);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);

          const { 
            onStudentLocked, 
            onStudentUnlocked, 
            onStudentDisqualified, 
            onStudentSubmitted, 
            onMessage 
          } = callbacksRef.current;
          
          if (onMessage) onMessage(data);

          switch (data.event) {
            case 'STUDENT_LOCKED_ALERT':
              if (onStudentLocked) onStudentLocked(data);
              break;

            case 'STUDENT_UNLOCKED':
              // Otomatis ubah state isLocked di useExamStore menjadi false jika attempt cocok
              const currentStore = useExamStore.getState();
              const studentAttemptId = currentStore.activeAttempt.attemptId;
              if (!studentAttemptId || studentAttemptId === data.attempt_id) {
                currentStore.unlockStudent(currentStore.currentUser?.id);
                // Pastikan fullscreen di-re-request jika terlepas
                if (typeof document !== 'undefined' && document.documentElement.requestFullscreen && !document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {});
                }
              }

              if (onStudentUnlocked) onStudentUnlocked(data);
              break;

            case 'STUDENT_DISQUALIFIED':
              if (onStudentDisqualified) onStudentDisqualified(data);
              break;

            case 'STUDENT_SUBMITTED':
              if (onStudentSubmitted) onStudentSubmitted(data);
              break;

            default:
              break;
          }
        } catch (err) {
          console.error('[WebSocket] Gagal parse JSON pesan:', err);
        }
      };

      ws.onerror = (error) => {
        console.warn('[WebSocket] Terjadi galat koneksi proctoring:', error);
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('[WebSocket] Koneksi terputus. Mencoba rekoneksi dalam 3 detik...');
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };
    } catch (err) {
      console.error('[WebSocket] Inisialisasi WebSocket gagal:', err);
    }
  }, [sessionId]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Method pengirim aksi universal
  const sendMessage = useCallback((action, payload = {}) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action, ...payload }));
      return true;
    }
    return false;
  }, []);

  // 1. Pelaporan Pelanggaran Sensor Siswa
  const sendViolationReport = useCallback((attemptId, violationType, description) => {
    return sendMessage('REPORT_VIOLATION', {
      attempt_id: attemptId,
      violation_type: violationType,
      description: description
    });
  }, [sendMessage]);

  // 2. Perintah Guru Membuka Kunci Layar Siswa
  const sendUnlockCommand = useCallback((attemptId) => {
    return sendMessage('UNLOCK_STUDENT', {
      attempt_id: attemptId
    });
  }, [sendMessage]);

  // 3. Perintah Guru Mendiskualifikasi Siswa
  const sendDisqualifyCommand = useCallback((attemptId) => {
    return sendMessage('DISQUALIFY_STUDENT', {
      attempt_id: attemptId
    });
  }, [sendMessage]);

  // 4. Notifikasi Siswa Mengumpulkan Ujian
  const notifySubmission = useCallback((attemptId, totalScore) => {
    return sendMessage('STUDENT_SUBMITTED', {
      attempt_id: attemptId,
      total_score: totalScore
    });
  }, [sendMessage]);

  return {
    isConnected,
    lastMessage,
    sendViolationReport,
    sendUnlockCommand,
    sendDisqualifyCommand,
    notifySubmission,
    sendMessage,
    // Aliases for compatibility
    reportViolation: sendViolationReport,
    unlockStudent: sendUnlockCommand,
    disqualifyStudent: sendDisqualifyCommand
  };
};

export default useProctorSocket;
