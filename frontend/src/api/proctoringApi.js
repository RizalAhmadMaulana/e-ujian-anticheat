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
   * Guru membuka kembali layar siswa yang terkunci menggunakan PIN pengawas
   */
  unlockStudent: async (attemptId, supervisorPin = '12345') => {
    const response = await axiosInstance.post(`/proctoring/attempts/${attemptId}/unlock/`, {
      supervisor_pin: supervisorPin
    });
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

