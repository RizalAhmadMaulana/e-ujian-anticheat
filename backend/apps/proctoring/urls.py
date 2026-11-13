from django.urls import path
from .views import (
    SessionProctoringStatusView,
    ReportViolationAPIView,
    UnlockStudentAPIView,
    UnlockAllStudentsAPIView,
    DisqualifyStudentAPIView,
    AttemptStatusAPIView,
    StudentHeartbeatAPIView
)

urlpatterns = [
    path('sessions/<uuid:session_id>/status/', SessionProctoringStatusView.as_view(), name='proctoring_session_status'),
    path('sessions/<uuid:session_id>/unlock-all/', UnlockAllStudentsAPIView.as_view(), name='proctoring_unlock_all_students'),
    path('attempts/<uuid:attempt_id>/report-violation/', ReportViolationAPIView.as_view(), name='proctoring_report_violation'),
    path('attempts/<uuid:attempt_id>/unlock/', UnlockStudentAPIView.as_view(), name='proctoring_unlock_student'),
    path('attempts/<uuid:attempt_id>/disqualify/', DisqualifyStudentAPIView.as_view(), name='proctoring_disqualify_student'),
    path('attempts/<uuid:attempt_id>/status/', AttemptStatusAPIView.as_view(), name='proctoring_attempt_status'),
    path('attempts/<uuid:attempt_id>/heartbeat/', StudentHeartbeatAPIView.as_view(), name='proctoring_student_heartbeat'),
]

