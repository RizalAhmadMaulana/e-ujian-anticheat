import axiosInstance from './axiosInstance';

/**
 * Login pengguna (Guru atau Siswa)
 * @param {string} username - NIP Guru / NISN Siswa
 * @param {string} password - Kata sandi akun
 */
export const loginApi = async (username, password) => {
  const response = await axiosInstance.post('/auth/login/', { username, password });
  if (response.data && response.data.access) {
    localStorage.setItem('access_token', response.data.access);
    localStorage.setItem('refresh_token', response.data.refresh);
    localStorage.setItem('user', JSON.stringify(response.data.user));
  }
  return response.data;
};

/**
 * Mengambil profil detail pengguna yang sedang login
 */
export const fetchCurrentUserApi = async () => {
  const response = await axiosInstance.get('/auth/me/');
  return response.data;
};

/**
 * CRUD KELAS / ROMBEL
 */
export const getClassroomsApi = async () => {
  const response = await axiosInstance.get('/accounts/classrooms/');
  return response.data;
};

export const createClassroomApi = async (data) => {
  const response = await axiosInstance.post('/accounts/classrooms/', data);
  return response.data;
};

export const updateClassroomApi = async (id, data) => {
  const response = await axiosInstance.put(`/accounts/classrooms/${id}/`, data);
  return response.data;
};

export const deleteClassroomApi = async (id) => {
  const response = await axiosInstance.delete(`/accounts/classrooms/${id}/`);
  return response.data;
};

/**
 * CRUD MANAJEMEN PENGGUNA (USER MANAGEMENT)
 */
export const getUsersApi = async (params = {}) => {
  const response = await axiosInstance.get('/accounts/users/', { params });
  return response.data;
};

export const createUserApi = async (data) => {
  const response = await axiosInstance.post('/accounts/users/', data);
  return response.data;
};

export const updateUserApi = async (id, data) => {
  const response = await axiosInstance.put(`/accounts/users/${id}/`, data);
  return response.data;
};

export const deleteUserApi = async (id) => {
  const response = await axiosInstance.delete(`/accounts/users/${id}/`);
  return response.data;
};

/**
 * Mengunduh template Excel (.xlsx) untuk import massal data siswa
 */
export const downloadUserTemplateExcelApi = async (filename = 'Template_Import_Siswa_E-Ujian.xlsx') => {
  const response = await axiosInstance.get('/accounts/users/template-excel/', {
    responseType: 'blob'
  });
  const url = window.URL.createObjectURL(
    new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
  );
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Mengunggah dan mengimpor file Excel data siswa
 */
export const importUsersExcelApi = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await axiosInstance.post('/accounts/users/import-excel/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
};

/**
 * PENGATURAN SEKOLAH (DYNAMIC SCHOOL SETTINGS)
 */
export const getSchoolSettingsApi = async () => {
  const response = await axiosInstance.get('/accounts/school-settings/');
  return response.data;
};

export const updateSchoolSettingsApi = async (data) => {
  const response = await axiosInstance.patch('/accounts/school-settings/', data);
  return response.data;
};

/**
 * Logout dan membersihkan token dari localStorage
 */
export const logoutApi = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
};

export const authApi = {
  loginApi,
  fetchCurrentUserApi,
  getSchoolSettingsApi,
  updateSchoolSettingsApi,
  getClassroomsApi,
  createClassroomApi,
  updateClassroomApi,
  deleteClassroomApi,
  getUsersApi,
  createUserApi,
  updateUserApi,
  deleteUserApi,
  downloadUserTemplateExcelApi,
  importUsersExcelApi,
  logoutApi,
  login: loginApi,
  getMe: fetchCurrentUserApi,
  getSchoolSettings: getSchoolSettingsApi,
  updateSchoolSettings: updateSchoolSettingsApi,
  getClassrooms: getClassroomsApi,
  logout: logoutApi,
};

export default authApi;
