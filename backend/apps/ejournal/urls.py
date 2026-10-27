from django.urls import path
from apps.ejournal.views import (
    ExamJournalDetailView,
    ExamJournalExportPDFView,
    ExamJournalExportExcelView
)

urlpatterns = [
    # Detail E-Jurnal & Update Catatan Pengawas
    path('sessions/<uuid:session_id>/', ExamJournalDetailView.as_view(), name='ejournal-detail'),

    # Export PDF Dokumen Resmi Berita Acara
    path('sessions/<uuid:session_id>/export-pdf/', ExamJournalExportPDFView.as_view(), name='ejournal-export-pdf'),

    # Export Excel (.xlsx) Rekapitulasi Nilai & Presensi
    path('sessions/<uuid:session_id>/export-excel/', ExamJournalExportExcelView.as_view(), name='ejournal-export-excel'),
]

