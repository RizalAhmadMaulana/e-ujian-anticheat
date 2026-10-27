from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import StudentAttempt, ViolationLog
from .serializers import StudentAttemptDetailSerializer, ViolationLogSerializer
from apps.exams.models import ExamSession

class SessionProctoringStatusView(APIView):
    """
    GET /api/proctoring/sessions/<uuid:session_id>/status/
    Mengambil daftar status seluruh peserta ujian pada sesi tersebut untuk live dashboard Guru
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, session_id):
        session = get_object_or_404(ExamSession, id=session_id)
        attempts = StudentAttempt.objects.filter(session=session).select_related('student', 'session__classroom').prefetch_related('violations')
        serializer = StudentAttemptDetailSerializer(attempts, many=True)
        return Response({
            "session_id": str(session.id),
            "classroom": session.classroom.name,
            "subject_name": session.package.subject_name,
            "total_participants": attempts.count(),
            "students": serializer.data
        }, status=status.HTTP_200_OK)


class ReportViolationAPIView(APIView):
    """
    POST /api/proctoring/attempts/<uuid:attempt_id>/report-violation/
    Fallback REST API pelaporan pelanggaran dari siswa (selain via WebSocket)
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, attempt_id):
        attempt = get_object_or_404(StudentAttempt, id=attempt_id)
        violation_type = request.data.get('violation_type', 'TAB_SWITCH')
        description = request.data.get('description', 'Perpindahan aplikasi/layar terdeteksi.')

        attempt.status = StudentAttempt.AttemptStatus.LOCKED_VIOLATION
        attempt.violation_count += 1
        attempt.save(update_fields=['status', 'violation_count'])

        log = ViolationLog.objects.create(
            attempt=attempt,
            violation_type=violation_type,
            description=description
        )

        return Response({
            "success": True,
            "status": attempt.status,
            "violation_count": attempt.violation_count,
            "detected_at": log.detected_at.strftime("%H:%M:%S")
        }, status=status.HTTP_200_OK)


class UnlockStudentAPIView(APIView):
    """
    POST /api/proctoring/attempts/<uuid:attempt_id>/unlock/
    Guru membuka kembali layar siswa yang terkunci
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, attempt_id):
        attempt = get_object_or_404(StudentAttempt, id=attempt_id)
        attempt.status = StudentAttempt.AttemptStatus.WORKING
        attempt.save(update_fields=['status'])

        now = timezone.now()
        last_log = attempt.violations.filter(unlocked_by_teacher_at__isnull=True).first()
        if last_log:
            last_log.unlocked_by_teacher_at = now
            last_log.save(update_fields=['unlocked_by_teacher_at'])

        return Response({
            "success": True,
            "message": "Layar siswa berhasil dibuka kembali.",
            "status": attempt.status,
            "unlocked_at": now.strftime("%H:%M:%S")
        }, status=status.HTTP_200_OK)


class DisqualifyStudentAPIView(APIView):
    """
    POST /api/proctoring/attempts/<uuid:attempt_id>/disqualify/
    Guru mendiskualifikasi siswa dari ruang ujian
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, attempt_id):
        attempt = get_object_or_404(StudentAttempt, id=attempt_id)
        attempt.status = StudentAttempt.AttemptStatus.DISQUALIFIED
        attempt.save(update_fields=['status'])

        return Response({
            "success": True,
            "message": f"Peserta {attempt.student.full_name} resmi didiskualifikasi.",
            "status": attempt.status
        }, status=status.HTTP_200_OK)

