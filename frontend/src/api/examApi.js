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
// IMPORT MASSAL SOAL (WORD .DOCX & EXCEL .XLSX) + TEMPLATE
// -------------------------------------------------------------
export const importDocxQuestionsApi = async (file, packageId = null, title = '', subjectName = '') => {
  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title', title);
  if (subjectName) formData.append('subject_name', subjectName);

  const url = packageId 
    ? `/exams/packages/${packageId}/import-docx/` 
    : '/exams/packages/import-docx/';

  const response = await axiosInstance.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const importExcelQuestionsApi = async (file, packageId = null, title = '', subjectName = '') => {
  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title', title);
  if (subjectName) formData.append('subject_name', subjectName);

  const url = packageId 
    ? `/exams/packages/${packageId}/import-excel/` 
    : '/exams/packages/import-excel/';

  const response = await axiosInstance.post(url, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const downloadQuestionTemplateExcelApi = async () => {
  const response = await axiosInstance.get('/exams/packages/template-excel/', {
    responseType: 'blob',
  });
  // Auto trigger browser download
  const blob = new Blob([response.data], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', 'Template_Bank_Soal_E-Ujian.xlsx');
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
  return true;
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

// -------------------------------------------------------------
// PENILAIAN & KOREKSI ESAI GURU (ROLE GURU)
// -------------------------------------------------------------
export const getEssaySubmissionsApi = async (sessionId) => {
  const response = await axiosInstance.get(`/exams/sessions/${sessionId}/essay-submissions/`);
  return response.data;
};

export const saveEssayGradeApi = async (sessionId, payload) => {
  const response = await axiosInstance.post(`/exams/sessions/${sessionId}/grade-essay/`, payload);
  return response.data;
};

export const examApi = {
  getPackagesApi,
  getPackageDetailApi,
  createPackageApi,
  updatePackageApi,
  deletePackageApi,
  uploadExamImageApi,
  importDocxQuestionsApi,
  importExcelQuestionsApi,
  downloadQuestionTemplateExcelApi,
  getSessionsApi,
  getSessionDetailApi,
  createSessionApi,
  updateSessionApi,
  deleteSessionApi,
  verifyEntryPasswordApi,
  startExamAttemptApi,
  submitExamAnswersApi,
  verifyExitPasswordApi,
  getEssaySubmissionsApi,
  saveEssayGradeApi,

  // Aliases for compatibility
  getPackages: getPackagesApi,
  getPackageDetail: getPackageDetailApi,
  createPackage: createPackageApi,
  updatePackage: updatePackageApi,
  deletePackage: deletePackageApi,
  uploadExamImage: uploadExamImageApi,
  importDocxQuestions: importDocxQuestionsApi,
  importExcelQuestions: importExcelQuestionsApi,
  downloadQuestionTemplateExcel: downloadQuestionTemplateExcelApi,
  getSessions: getSessionsApi,
  getSessionDetail: getSessionDetailApi,
  createSession: createSessionApi,
  updateSession: updateSessionApi,
  deleteSession: deleteSessionApi,
  verifyEntryPassword: verifyEntryPasswordApi,
  startAttempt: startExamAttemptApi,
  submitAttempt: submitExamAnswersApi,
  verifyExitPassword: verifyExitPasswordApi,
  getEssaySubmissions: getEssaySubmissionsApi,
  saveEssayGrade: saveEssayGradeApi,
};

export default examApi;
