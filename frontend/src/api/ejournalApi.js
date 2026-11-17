import axiosInstance from './axiosInstance';

/**
 * Mengambil rekapitulasi data lengkap E-Jurnal & Berita Acara untuk suatu sesi
 * Mendukung filter rombel/kelas spesifik pada sesi multi-kelas
 */
export const getSessionEJournalApi = async (sessionId, classroom = null) => {
  const params = classroom && classroom !== 'ALL' ? { classroom } : {};
  const response = await axiosInstance.get(`/ejournal/sessions/${sessionId}/`, { params });
  return response.data;
};

/**
 * Menyimpan / memperbarui catatan kejadian penting oleh pengawas ujian
 */
export const updateSupervisorNotesApi = async (sessionId, supervisorNotes) => {
  const response = await axiosInstance.patch(`/ejournal/sessions/${sessionId}/`, {
    supervisor_notes: supervisorNotes
  });
  return response.data;
};

/**
 * Mengunduh file PDF resmi Berita Acara (mendukung filter per kelas)
 */
export const downloadEJournalPdfApi = async (sessionId, filename = 'Berita_Acara_Ujian.pdf', classroom = null) => {
  const params = classroom && classroom !== 'ALL' ? { classroom } : {};
  const response = await axiosInstance.get(`/ejournal/sessions/${sessionId}/export-pdf/`, {
    params,
    responseType: 'blob'
  });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Mengunduh file Excel (.xlsx) Rekapitulasi Nilai & Pelanggaran (mendukung filter per kelas)
 */
export const downloadEJournalExcelApi = async (sessionId, filename = 'Rekapitulasi_Nilai_Ujian.xlsx', classroom = null) => {
  const params = classroom && classroom !== 'ALL' ? { classroom } : {};
  const response = await axiosInstance.get(`/ejournal/sessions/${sessionId}/export-excel/`, {
    params,
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

export const ejournalApi = {
  getSessionEJournalApi,
  updateSupervisorNotesApi,
  downloadEJournalPdfApi,
  downloadEJournalExcelApi,

  // Aliases for compatibility
  getJournal: getSessionEJournalApi,
  updateSupervisorNotes: updateSupervisorNotesApi,
  downloadPdf: downloadEJournalPdfApi,
  downloadExcel: downloadEJournalExcelApi,
};

export default ejournalApi;
