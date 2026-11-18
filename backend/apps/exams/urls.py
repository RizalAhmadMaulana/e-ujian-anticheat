from django.urls import path
from .views import (
    ExamPackageListCreateView,
    ExamPackageDetailView,
    ExamSessionListCreateView,
    ExamSessionDetailView,
    VerifyEntryPasswordView,
    StartExamSessionView,
    SubmitExamAnswersView,
    FinishExamSessionView,
    VerifyExitPasswordView,
    CancelExamSessionView,
    ExamImageUploadView,
    DownloadQuestionTemplateExcelView,
    ImportDocxQuestionsView,
    ImportExcelQuestionsView,
    SessionEssaySubmissionsView,
    GradeEssaySubmissionView,
    SessionStudentResultsView,
    StudentAttemptDetailBreakdownView,
    ExportSessionResultsExcelView,
    ServeExamMediaFileView,
    ServeExamImageStreamView,
    OpenStudentRemedialView,
)

urlpatterns = [
    # Upload & Layanan File Gambar Soal (Bebas Mixed Content & Nginx-Proof)
    path('upload-image/', ExamImageUploadView.as_view(), name='exam_upload_image'),
    path('image-stream/', ServeExamImageStreamView.as_view(), name='serve_exam_image_stream'),
    path('image-stream/<path:filename>', ServeExamImageStreamView.as_view(), name='serve_exam_image_stream_path'),
    path('images/<path:filename>', ServeExamMediaFileView.as_view(), name='serve_exam_image'),
    path('media/<path:filename>', ServeExamMediaFileView.as_view(), name='serve_exam_media_file'),

    # Template Excel & Import Massal Word/Excel (Letakkan sebelum <uuid:pk>!)
    path('packages/template-excel/', DownloadQuestionTemplateExcelView.as_view(), name='exam_package_template_excel'),
    path('packages/import-docx/', ImportDocxQuestionsView.as_view(), name='exam_package_import_docx'),
    path('packages/<uuid:pk>/import-docx/', ImportDocxQuestionsView.as_view(), name='exam_package_pk_import_docx'),
    path('packages/import-excel/', ImportExcelQuestionsView.as_view(), name='exam_package_import_excel'),
    path('packages/<uuid:pk>/import-excel/', ImportExcelQuestionsView.as_view(), name='exam_package_pk_import_excel'),

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
    path('sessions/<uuid:session_id>/finish/', FinishExamSessionView.as_view(), name='session_finish_exam'),
    path('sessions/<uuid:session_id>/cancel/', CancelExamSessionView.as_view(), name='session_cancel_exam'),
    path('sessions/<uuid:session_id>/verify-exit/', VerifyExitPasswordView.as_view(), name='session_verify_exit'),

    # Koreksi Esai Guru
    path('sessions/<uuid:session_id>/essay-submissions/', SessionEssaySubmissionsView.as_view(), name='session_essay_submissions'),
    path('sessions/<uuid:session_id>/grade-essay/', GradeEssaySubmissionView.as_view(), name='session_grade_essay'),

    # Rekap Nilai & Analisis Lembar Jawaban Siswa
    path('sessions/<uuid:session_id>/student-results/', SessionStudentResultsView.as_view(), name='session_student_results'),
    path('sessions/<uuid:session_id>/export-results-excel/', ExportSessionResultsExcelView.as_view(), name='session_export_results_excel'),
    path('sessions/<uuid:session_id>/students/<uuid:student_id>/open-remedial/', OpenStudentRemedialView.as_view(), name='session_open_student_remedial'),
    path('attempts/<uuid:attempt_id>/breakdown/', StudentAttemptDetailBreakdownView.as_view(), name='attempt_detail_breakdown'),
]

