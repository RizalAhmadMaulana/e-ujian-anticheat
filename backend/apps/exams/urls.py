from django.urls import path
from .views import (
    ExamPackageListCreateView,
    ExamPackageDetailView,
    ExamSessionListCreateView,
    ExamSessionDetailView,
    VerifyEntryPasswordView,
    StartExamSessionView,
    SubmitExamAnswersView,
    VerifyExitPasswordView,
    ExamImageUploadView,
)

urlpatterns = [
    # Upload Gambar Soal & Opsi Jawaban
    path('upload-image/', ExamImageUploadView.as_view(), name='exam_upload_image'),

    # CRUD Paket Ujian
    path('packages/', ExamPackageListCreateView.as_view(), name='exam_package_list_create'),
    path('packages/<uuid:pk>/', ExamPackageDetailView.as_view(), name='exam_package_detail'),

    # CRUD Sesi Ujian
    path('sessions/', ExamSessionListCreateView.as_view(), name='exam_session_list_create'),
    path('sessions/<uuid:pk>/', ExamSessionDetailView.as_view(), name='exam_session_detail'),

    # Endpoint Aksi Siswa
    path('sessions/<uuid:session_id>/verify-entry/', VerifyEntryPasswordView.as_view(), name='session_verify_entry'),
    path('sessions/<uuid:session_id>/start/', StartExamSessionView.as_view(), name='session_start_exam'),
    path('sessions/<uuid:session_id>/submit/', SubmitExamAnswersView.as_view(), name='session_submit_answers'),
    path('sessions/<uuid:session_id>/verify-exit/', VerifyExitPasswordView.as_view(), name='session_verify_exit'),
]

