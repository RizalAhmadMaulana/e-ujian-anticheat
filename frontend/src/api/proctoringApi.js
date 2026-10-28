import axiosInstance from './axiosInstance';

export const proctoringApi = {
  /**
   * Mengambil daftar status realtime seluruh peserta ujian dalam suatu sesi
   */
  getSessionStatus: async (sessionId) => {
    const response = await axiosInstance.get(`/proctoring/sessions/${sessionId}/status/`);
    return response.data;
  },

  /**
   * REST Fallback pelaporan pelanggaran dari sensor siswa
   */
  reportViolation: async (attemptId, violationType, description) => {
    const response = await axiosInstance.post(`/proctoring/attempts/${attemptId}/report-violation/`, {
      violation_type: violationType,
      description: description
    });
    return response.data;
  },

  /**
   * Mengambil status terkini attempt siswa (apakah WORKING, LOCKED_VIOLATION, dll)
   */
  getAttemptStatus: async (attemptId) => {
    const response = await axiosInstance.get(`/proctoring/attempts/${attemptId}/status/`);
    return response.data;
  },

  /**
   * Guru membuka kembali layar siswa yang terkunci menggunakan PIN pengawas (atau tanpa PIN dari Live Proctoring)
   */
  unlockStudent: async (attemptId, supervisorPin = null) => {
    const payload = supervisorPin ? { supervisor_pin: supervisorPin } : {};
    const response = await axiosInstance.post(`/proctoring/attempts/${attemptId}/unlock/`, payload);
    return response.data;
  },

  /**
   * Guru mendiskualifikasi siswa dari ruang ujian
   */
  disqualifyStudent: async (attemptId) => {
    const response = await axiosInstance.post(`/proctoring/attempts/${attemptId}/disqualify/`);
    return response.data;
  }
};

export default proctoringApi;

