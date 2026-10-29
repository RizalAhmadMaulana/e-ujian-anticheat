import axiosInstance from './axiosInstance';

// -------------------------------------------------------------
// BANK SOAL & PAKET UJIAN (ROLE GURU)
// -------------------------------------------------------------
export const getPackagesApi = async () => {
  const response = await axiosInstance.get('/exams/packages/');
  return response.data;
};

export const getPackageDetailApi = async (packageId) => {
  const response = await axiosInstance.get(`/exams/packages/${packageId}/`);
  return response.data;
};

export const createPackageApi = async (payload) => {
  const response = await axiosInstance.post('/exams/packages/', payload);
  return response.data;
};

export const updatePackageApi = async (packageId, payload) => {
  const response = await axiosInstance.put(`/exams/packages/${packageId}/`, payload);
  return response.data;
};

export const deletePackageApi = async (packageId) => {
  const response = await axiosInstance.delete(`/exams/packages/${packageId}/`);
  return response.data;
};

export const uploadExamImageApi = async (file) => {
  const formData = new FormData();
  formData.append('image', file);
  const response = await axiosInstance.post('/exams/upload-image/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// -------------------------------------------------------------
// JADWAL & SESI UJIAN (ROLE GURU)
// -------------------------------------------------------------
export const getSessionsApi = async () => {
  const response = await axiosInstance.get('/exams/sessions/');
  return response.data;
};

export const getSessionDetailApi = async (sessionId) => {
  const response = await axiosInstance.get(`/exams/sessions/${sessionId}/`);
  return response.data;
};

export const createSessionApi = async (payload) => {
  const response = await axiosInstance.post('/exams/sessions/', payload);
  return response.data;
};

export const updateSessionApi = async (sessionId, payload) => {
  const response = await axiosInstance.patch(`/exams/sessions/${sessionId}/`, payload);
  return response.data;
};

export const deleteSessionApi = async (sessionId) => {
  const response = await axiosInstance.delete(`/exams/sessions/${sessionId}/`);
  return response.data;
};

// -------------------------------------------------------------
// GERBANG SISWA & ARENA UJIAN (ROLE SISWA)
// -------------------------------------------------------------
export const verifyEntryPasswordApi = async (sessionId, entryPassword) => {
  const response = await axiosInstance.post(`/exams/sessions/${sessionId}/verify-entry/`, {
    entry_password: entryPassword
  });
  return response.data;
};

export const startExamAttemptApi = async (sessionId, orientation = 'PORTRAIT') => {
  const response = await axiosInstance.post(`/exams/sessions/${sessionId}/start/`, {
    screen_orientation: orientation
  });
  return response.data;
};

export const submitExamAnswersApi = async (sessionId, answersJson) => {
  const response = await axiosInstance.post(`/exams/sessions/${sessionId}/submit/`, {
    answers_json: answersJson
  });
  return response.data;
};

export const verifyExitPasswordApi = async (sessionId, exitPassword) => {
  const response = await axiosInstance.post(`/exams/sessions/${sessionId}/verify-exit/`, {
    exit_password: exitPassword
  });
  return response.data;
};

export const examApi = {
  getPackagesApi,
  getPackageDetailApi,
  createPackageApi,
  updatePackageApi,
  deletePackageApi,
  uploadExamImageApi,
  getSessionsApi,
  getSessionDetailApi,
  createSessionApi,
  updateSessionApi,
  deleteSessionApi,
  verifyEntryPasswordApi,
  startExamAttemptApi,
  submitExamAnswersApi,
  verifyExitPasswordApi,

  // Aliases for compatibility
  getPackages: getPackagesApi,
  getPackageDetail: getPackageDetailApi,
  createPackage: createPackageApi,
  updatePackage: updatePackageApi,
  deletePackage: deletePackageApi,
  getSessions: getSessionsApi,
  getSessionDetail: getSessionDetailApi,
  createSession: createSessionApi,
  updateSession: updateSessionApi,
  deleteSession: deleteSessionApi,
  verifyEntryPassword: verifyEntryPasswordApi,
  startAttempt: startExamAttemptApi,
  submitAttempt: submitExamAnswersApi,
  verifyExitPassword: verifyExitPasswordApi,
};

export default examApi;
