import axiosInstance from './axiosInstance';

/**
 * Mengambil rekapitulasi data lengkap E-Jurnal & Berita Acara untuk suatu sesi
 */
export const getSessionEJournalApi = async (sessionId) => {
  const response = await axiosInstance.get(`/ejournal/sessions/${sessionId}/`);
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
 * Mengunduh file PDF resmi Berita Acara
 */
export const downloadEJournalPdfApi = async (sessionId, filename = 'Berita_Acara_Ujian.pdf') => {
  const response = await axiosInstance.get(`/ejournal/sessions/${sessionId}/export-pdf/`, {
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
 * Mengunduh file Excel (.xlsx) Rekapitulasi Nilai & Pelanggaran
 */
export const downloadEJournalExcelApi = async (sessionId, filename = 'Rekapitulasi_Nilai_Ujian.xlsx') => {
  const response = await axiosInstance.get(`/ejournal/sessions/${sessionId}/export-excel/`, {
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
