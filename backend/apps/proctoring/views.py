from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import StudentAttempt, ViolationLog
from .serializers import (
    StudentAttemptDetailSerializer, 
    ViolationLogSerializer,
    ViolationHistorySerializer
)
from apps.exams.models import ExamSession
from apps.exams.tokens import is_valid_supervisor_pin

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
            "classroom": session.get_classrooms_display(),
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

        # Guard Mutlak: Jika siswa sudah SUBMITTED atau sudah selesai (finished_at ada),
        # ABAIKAN seluruh laporan pelanggaran dan jangan kunci layar / ubah status!
        if attempt.status == StudentAttempt.AttemptStatus.SUBMITTED or attempt.finished_at is not None:
            return Response({
                "success": True,
                "status": StudentAttempt.AttemptStatus.SUBMITTED,
                "violation_count": attempt.violation_count,
                "message": "Attempt already finished/submitted"
            }, status=status.HTTP_200_OK)

        # Guard Mutlak: Jika siswa SUDAH dalam status terkunci, jangan tambah akumulasi lagi!
        if attempt.status == StudentAttempt.AttemptStatus.LOCKED_VIOLATION:
            return Response({
                "success": True,
                "status": attempt.status,
                "violation_count": attempt.violation_count,
                "message": "Attempt already locked"
            }, status=status.HTTP_200_OK)

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
    Guru membuka kembali layar siswa yang terkunci (atau via PIN pengawas lokal)
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, attempt_id):
        attempt = get_object_or_404(StudentAttempt.objects.select_related('student', 'session'), id=attempt_id)

        # Jika request menyertakan PIN, validasi terhadap supervisor_pin sesi (dinamis 10 menit & fallback)
        input_pin = request.data.get('supervisor_pin')
        if input_pin:
            session_id = attempt.session.id if attempt.session else None
            base_pin = attempt.session.supervisor_pin if attempt.session else ''
            
            is_valid = is_valid_supervisor_pin(session_id, input_pin, base_pin=base_pin)
            if not is_valid and attempt.session:
                other_sessions = ExamSession.objects.filter(is_active=True).prefetch_related('classrooms')
                if hasattr(attempt.student, 'classroom') and attempt.student.classroom:
                    other_sessions = other_sessions.filter(
                        Q(allow_all_classes=True) |
                        Q(classrooms=attempt.student.classroom) |
                        Q(classroom=attempt.student.classroom)
                    ).distinct()
                for oses in other_sessions:
                    if is_valid_supervisor_pin(oses.id, input_pin, base_pin=oses.supervisor_pin):
                        is_valid = True
                        break

            if not is_valid:
                return Response({
                    "success": False,
                    "error": "PIN Pengawas salah atau sudah kedaluwarsa! PIN diperbarui otomatis setiap 10 menit. Silakan periksa PIN terbaru di menu Jadwal & Sesi Ujian."
                }, status=status.HTTP_400_BAD_REQUEST)

        attempt.status = StudentAttempt.AttemptStatus.WORKING
        attempt.save(update_fields=['status'])

        now = timezone.now()
        last_log = attempt.violations.filter(unlocked_by_teacher_at__isnull=True).first()
        if last_log:
            last_log.unlocked_by_teacher_at = now
            last_log.save(update_fields=['unlocked_by_teacher_at'])

        # Broadcast event STUDENT_UNLOCKED ke WebSocket room agar seluruh tab/client ter-update real-time
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            if channel_layer and attempt.session_id:
                async_to_sync(channel_layer.group_send)(
                    f"proctoring_{attempt.session_id}",
                    {
                        "type": "broadcast_message",
                        "data": {
                            "event": "STUDENT_UNLOCKED",
                            "attempt_id": str(attempt.id),
                            "student_name": attempt.student.full_name or attempt.student.username,
                            "status": "WORKING",
                            "unlocked_at": now.strftime("%H:%M:%S"),
                            "message": "Layar ujian telah dibuka kembali oleh Guru Pengawas."
                        }
                    }
                )
        except Exception as e:
            pass

        return Response({
            "success": True,
            "message": "Layar siswa berhasil dibuka kembali.",
            "status": attempt.status,
            "unlocked_at": now.strftime("%H:%M:%S")
        }, status=status.HTTP_200_OK)


class UnlockAllStudentsAPIView(APIView):
    """
    POST /api/proctoring/sessions/<uuid:session_id>/unlock-all/
    Guru membuka kembali seluruh layar siswa yang terkunci pada sesi tersebut secara massal
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        session = get_object_or_404(ExamSession, id=session_id)
        locked_attempts = StudentAttempt.objects.filter(
            session=session,
            status=StudentAttempt.AttemptStatus.LOCKED_VIOLATION
        ).select_related('student')

        now = timezone.now()
        unlocked_items = []

        for attempt in locked_attempts:
            attempt.status = StudentAttempt.AttemptStatus.WORKING
            attempt.save(update_fields=['status'])

            last_log = attempt.violations.filter(unlocked_by_teacher_at__isnull=True).first()
            if last_log:
                last_log.unlocked_by_teacher_at = now
                last_log.save(update_fields=['unlocked_by_teacher_at'])

            unlocked_items.append({
                "attempt_id": str(attempt.id),
                "student_name": attempt.student.full_name or attempt.student.username,
                "unlocked_at": now.strftime("%H:%M:%S")
            })

        count = len(unlocked_items)

        # Broadcast event ke WebSocket room agar seluruh tab/client siswa ter-update real-time
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            if channel_layer:
                # 1. Kirim event individual untuk tiap attempt
                for item in unlocked_items:
                    async_to_sync(channel_layer.group_send)(
                        f"proctoring_{session.id}",
                        {
                            "type": "broadcast_message",
                            "data": {
                                "event": "STUDENT_UNLOCKED",
                                "attempt_id": item['attempt_id'],
                                "student_name": item['student_name'],
                                "status": "WORKING",
                                "unlocked_at": item['unlocked_at'],
                                "message": "Layar ujian telah dibuka kembali oleh Guru Pengawas."
                            }
                        }
                    )
                # 2. Kirim sinyal massal ALL_STUDENTS_UNLOCKED
                async_to_sync(channel_layer.group_send)(
                    f"proctoring_{session.id}",
                    {
                        "type": "broadcast_message",
                        "data": {
                            "event": "ALL_STUDENTS_UNLOCKED",
                            "session_id": str(session.id),
                            "count": count,
                            "message": f"Seluruh layar siswa yang terkunci ({count} siswa) telah dibuka kembali oleh Guru Pengawas."
                        }
                    }
                )
        except Exception:
            pass

        return Response({
            "success": True,
            "message": f"Berhasil membuka kunci seluruh siswa ({count} siswa).",
            "unlocked_count": count
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

        # Broadcast event STUDENT_DISQUALIFIED ke WebSocket room
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            if channel_layer and attempt.session_id:
                async_to_sync(channel_layer.group_send)(
                    f"proctoring_{attempt.session_id}",
                    {
                        "type": "broadcast_message",
                        "data": {
                            "event": "STUDENT_DISQUALIFIED",
                            "attempt_id": str(attempt.id),
                            "student_name": attempt.student.full_name or attempt.student.username,
                            "status": "DISQUALIFIED",
                            "message": "Peserta didiskualifikasi oleh Guru Pengawas."
                        }
                    }
                )
        except Exception as e:
            pass

        return Response({
            "success": True,
            "message": f"Peserta {attempt.student.full_name} resmi didiskualifikasi.",
            "status": attempt.status
        }, status=status.HTTP_200_OK)


class AttemptStatusAPIView(APIView):
    """
    GET /api/proctoring/attempts/<uuid:attempt_id>/status/
    Polling status individual attempt siswa untuk auto-unlock jika guru membuka dari live proctoring
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, attempt_id):
        attempt = get_object_or_404(StudentAttempt, id=attempt_id)
        return Response({
            "attempt_id": str(attempt.id),
            "status": attempt.status,
            "violation_count": attempt.violation_count,
            "network_latency_ms": attempt.network_latency_ms,
        }, status=status.HTTP_200_OK)


class StudentHeartbeatAPIView(APIView):
    """
    POST /api/proctoring/attempts/<uuid:attempt_id>/heartbeat/
    Siswa mengirim sinyal heartbeat & latensi ping (ms) untuk indikator kualitas jaringan
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, attempt_id):
        attempt = get_object_or_404(StudentAttempt, id=attempt_id)
        latency = int(request.data.get('latency_ms', 0) or 0)
        attempt.network_latency_ms = latency
        attempt.save(update_fields=['network_latency_ms'])

        # Broadcast update latency ke grup pengawas Guru jika ada WebSocket
        try:
            from asgiref.sync import async_to_sync
            from channels.layers import get_channel_layer
            channel_layer = get_channel_layer()
            if channel_layer and attempt.session_id:
                async_to_sync(channel_layer.group_send)(
                    f"proctoring_{attempt.session_id}",
                    {
                        "type": "broadcast_message",
                        "data": {
                            "event": "NETWORK_HEARTBEAT",
                            "attempt_id": str(attempt.id),
                            "latency_ms": latency
                        }
                    }
                )
        except Exception:
            pass

        return Response({
            "success": True,
            "latency_ms": latency,
            "timestamp": timezone.now().isoformat()
        }, status=status.HTTP_200_OK)


class ViolationHistoryListView(APIView):
    """
    GET /api/proctoring/violations/
    Mengambil riwayat pelanggaran terfilter berdasarkan sesi, paket soal, dan kelas
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        queryset = ViolationLog.objects.select_related(
            'attempt', 
            'attempt__student', 
            'attempt__session', 
            'attempt__session__package', 
            'attempt__session__classroom'
        ).order_by('-detected_at')

        session_id = request.query_params.get('session_id')
        package_id = request.query_params.get('package_id')
        classroom_param = request.query_params.get('classroom_id') or request.query_params.get('classroom')
        search = request.query_params.get('search')

        if session_id and session_id != 'ALL':
            queryset = queryset.filter(attempt__session_id=session_id)
        if package_id and package_id != 'ALL':
            queryset = queryset.filter(attempt__session__package_id=package_id)
        if classroom_param and str(classroom_param).strip().upper() != 'ALL':
            import re
            from apps.accounts.models import ClassRoom
            param_str = str(classroom_param).strip()
            target_class = None
            if param_str.isdigit():
                target_class = ClassRoom.objects.filter(id=int(param_str)).first()
            if not target_class:
                clean_cls_name = re.sub(r'^(kelas|rombel)\s+', '', param_str.split('(')[0].strip(), flags=re.IGNORECASE)
                target_class = (
                    ClassRoom.objects.filter(name__iexact=clean_cls_name).first() or
                    ClassRoom.objects.filter(name__iexact=param_str).first() or
                    ClassRoom.objects.filter(name__icontains=clean_cls_name).first()
                )

            if target_class:
                # Filter strictly by the student's classroom (crucial for multi-class sessions)
                queryset = queryset.filter(attempt__student__classroom=target_class)
            else:
                clean_name = re.sub(r'^(kelas|rombel)\s+', '', param_str.split('(')[0].strip(), flags=re.IGNORECASE)
                queryset = queryset.filter(attempt__student__classroom__name__icontains=clean_name)
        if search:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(attempt__student__full_name__icontains=search) |
                Q(attempt__student__username__icontains=search) |
                Q(description__icontains=search)
            )

        serializer = ViolationHistorySerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ViolationHistoryDeleteView(APIView):
    """
    DELETE /api/proctoring/violations/<int:violation_id>/
    Menghapus satu catatan log pelanggaran, memperbarui akumulasi count attempt, dan otomatis sinkron ke E-Jurnal
    """
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, violation_id):
        violation = get_object_or_404(
            ViolationLog.objects.select_related('attempt', 'attempt__session'), 
            id=violation_id
        )
        attempt = violation.attempt
        session = attempt.session

        student_name = attempt.student.full_name or attempt.student.username
        violation_type_label = violation.get_violation_type_display()
        violation.delete()

        # Update akumulasi violation_count pada StudentAttempt
        new_violation_count = attempt.violations.count()
        attempt.violation_count = new_violation_count
        attempt.save(update_fields=['violation_count'])

        # Update agregasi total_violations_recorded pada ExamJournal jika ada
        try:
            from apps.ejournal.models import ExamJournal
            journal = ExamJournal.objects.filter(session=session).first()
            if journal:
                journal.total_violations_recorded = sum(att.violation_count for att in session.attempts.all())
                journal.save(update_fields=['total_violations_recorded'])
        except Exception:
            pass

        return Response({
            "success": True,
            "message": f"Catatan pelanggaran {student_name} ({violation_type_label}) berhasil dihapus.",
            "remaining_violation_count": new_violation_count
        }, status=status.HTTP_200_OK)


class ViolationHistoryBulkDeleteView(APIView):
    """
    POST /api/proctoring/violations/bulk-delete/
    Menghapus banyak catatan pelanggaran sekaligus (atau seluruh log sesi) dan sinkron ke E-Jurnal
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ids = request.data.get('ids', [])
        session_id = request.data.get('session_id')
        classroom_param = request.data.get('classroom_id') or request.data.get('classroom')

        if not ids and not session_id:
            return Response({
                "success": False,
                "error": "Parameter ids atau session_id wajib disertakan."
            }, status=status.HTTP_400_BAD_REQUEST)

        queryset = ViolationLog.objects.select_related('attempt', 'attempt__session', 'attempt__student__classroom')
        if ids:
            queryset = queryset.filter(id__in=ids)
        elif session_id:
            queryset = queryset.filter(attempt__session_id=session_id)
            if classroom_param and str(classroom_param).strip().upper() != 'ALL':
                import re
                from apps.accounts.models import ClassRoom
                param_str = str(classroom_param).strip()
                target_class = None
                if param_str.isdigit():
                    target_class = ClassRoom.objects.filter(id=int(param_str)).first()
                if not target_class:
                    clean_cls_name = re.sub(r'^(kelas|rombel)\s+', '', param_str.split('(')[0].strip(), flags=re.IGNORECASE)
                    target_class = (
                        ClassRoom.objects.filter(name__iexact=clean_cls_name).first() or 
                        ClassRoom.objects.filter(name__iexact=param_str).first() or
                        ClassRoom.objects.filter(name__icontains=clean_cls_name).first()
                    )
                if target_class:
                    queryset = queryset.filter(attempt__student__classroom=target_class)

        affected_attempts = list(set(v.attempt for v in queryset))
        affected_sessions = list(set(att.session for att in affected_attempts))

        count = queryset.count()
        queryset.delete()

        # Update violation_count untuk setiap attempt yang terpengaruh
        for attempt in affected_attempts:
            attempt.violation_count = attempt.violations.count()
            attempt.save(update_fields=['violation_count'])

        # Update ExamJournal untuk setiap sesi yang terpengaruh
        try:
            from apps.ejournal.models import ExamJournal
            for session in affected_sessions:
                journal = ExamJournal.objects.filter(session=session).first()
                if journal:
                    journal.total_violations_recorded = sum(att.violation_count for att in session.attempts.all())
                    journal.save(update_fields=['total_violations_recorded'])
        except Exception:
            pass

        return Response({
            "success": True,
            "deleted_count": count,
            "message": f"Berhasil menghapus {count} catatan pelanggaran."
        }, status=status.HTTP_200_OK)


