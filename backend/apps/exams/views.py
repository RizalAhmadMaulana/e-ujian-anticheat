import os
import uuid
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

from .models import ExamPackage, ExamSession
from .serializers import ExamPackageSerializer, ExamSessionSerializer
from .services import calculate_auto_grading_score
from apps.accounts.permissions import IsTeacherRole
from apps.proctoring.models import StudentAttempt

class ExamPackageListCreateView(generics.ListCreateAPIView):
    """
    GET & POST /api/exams/packages/
    Daftar dan pembuatan Paket Soal (Hybrid: Native & Google Form)
    """
    queryset = ExamPackage.objects.all().prefetch_related('questions__options')
    serializer_class = ExamPackageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == 'TEACHER' or user.is_staff:
            return ExamPackage.objects.all().prefetch_related('questions__options')
        
        # Jika siswa, tampilkan paket yang sedang aktif untuk kelas siswa
        if hasattr(user, 'classroom') and user.classroom:
            return ExamPackage.objects.filter(
                sessions__classroom=user.classroom, 
                sessions__is_active=True
            ).distinct().prefetch_related('questions__options')
        return ExamPackage.objects.none()


class ExamPackageDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET, PUT, DELETE /api/exams/packages/<uuid:pk>/
    Detail paket ujian
    """
    queryset = ExamPackage.objects.all().prefetch_related('questions__options')
    serializer_class = ExamPackageSerializer
    permission_classes = [permissions.IsAuthenticated]


class ExamSessionListCreateView(generics.ListCreateAPIView):
    """
    GET & POST /api/exams/sessions/
    Daftar dan konfigurasi jadwal sesi ujian
    """
    queryset = ExamSession.objects.all().select_related('package', 'classroom')
    serializer_class = ExamSessionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = ExamSession.objects.all().select_related('package', 'classroom')

        # Filter kelas untuk role Siswa
        if getattr(user, 'role', None) == 'STUDENT' and hasattr(user, 'classroom') and user.classroom:
            qs = qs.filter(classroom=user.classroom, is_active=True)

        return qs


class ExamSessionDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET, PUT, DELETE /api/exams/sessions/<uuid:pk>/
    Detail jadwal sesi ujian
    """
    queryset = ExamSession.objects.all().select_related('package', 'classroom')
    serializer_class = ExamSessionSerializer
    permission_classes = [permissions.IsAuthenticated]


# ==============================================================================
# ENDPOINT KHUSUS SISWA (GATEKEEPER, ARENA LOCKDOWN, SUBMIT & EXIT)
# ==============================================================================

class VerifyEntryPasswordView(APIView):
    """
    POST /api/exams/sessions/<uuid:session_id>/verify-entry/
    Siswa memasukkan Password Masuk untuk membuka gerbang ujian
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        session = get_object_or_404(ExamSession, id=session_id)
        now = timezone.now()

        # Validasi Rentang Waktu Ujian (Sinkronisasi Jadwal Mulai & Selesai)
        if session.start_time and now < session.start_time:
            start_str = timezone.localtime(session.start_time).strftime("%d %B %Y pukul %H:%M WIB")
            return Response(
                {"success": False, "status_code": "EXAM_NOT_STARTED", "message": f"Sesi ujian belum dibuka! Jadwal ujian baru dimulai pada {start_str}."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        if session.end_time and now > session.end_time:
            end_str = timezone.localtime(session.end_time).strftime("%d %B %Y pukul %H:%M WIB")
            return Response(
                {"success": False, "status_code": "EXAM_CLOSED", "message": f"Sesi ujian telah ditutup! Batas pengerjaan telah berakhir pada {end_str}."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        input_password = request.data.get('entry_password', '').strip().upper()

        if not input_password:
            return Response(
                {"success": False, "message": "Password Masuk wajib diisi!"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        if input_password == session.entry_password.strip().upper():
            return Response({
                "success": True,
                "message": "Password Masuk Terverifikasi. Layar Anda akan dikunci ke Mode Lockdown.",
                "session_id": str(session.id),
                "subject_name": session.package.subject_name,
                "classroom": session.classroom.name,
                "duration_minutes": session.duration_minutes
            }, status=status.HTTP_200_OK)

        return Response(
            {"success": False, "message": "Password Masuk salah! Silakan tanyakan kepada pengawas."}, 
            status=status.HTTP_400_BAD_REQUEST
        )


class StartExamSessionView(APIView):
    """
    POST /api/exams/sessions/<uuid:session_id>/start/
    Siswa mulai pengerjaan: membuat / mengambil StudentAttempt dan mengembalikan lembar soal terproteksi
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        session = get_object_or_404(ExamSession, id=session_id)
        now = timezone.now()

        # Validasi Rentang Waktu Ujian (Sinkronisasi Jadwal Mulai & Selesai)
        if session.start_time and now < session.start_time:
            start_str = timezone.localtime(session.start_time).strftime("%d %B %Y pukul %H:%M WIB")
            return Response(
                {"success": False, "error": f"Sesi ujian belum dibuka! Jadwal pengerjaan baru dimulai pada {start_str}."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        if session.end_time and now > session.end_time:
            end_str = timezone.localtime(session.end_time).strftime("%d %B %Y pukul %H:%M WIB")
            return Response(
                {"success": False, "error": f"Sesi ujian telah ditutup! Batas waktu ujian telah berakhir pada {end_str}."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        student = request.user
        orientation = request.data.get('screen_orientation', 'PORTRAIT').upper()

        # Dapatkan atau buat attempt siswa
        attempt, created = StudentAttempt.objects.get_or_create(
            session=session,
            student=student,
            defaults={
                'status': StudentAttempt.AttemptStatus.WORKING,
                'screen_orientation': orientation,
                'violation_count': 0,
            }
        )

        # Jika sudah pernah dibuat dan tidak sedang diskualifikasi/submitted, pastikan status working
        if not created and attempt.status not in [StudentAttempt.AttemptStatus.SUBMITTED, StudentAttempt.AttemptStatus.DISQUALIFIED]:
            attempt.status = StudentAttempt.AttemptStatus.WORKING
            attempt.screen_orientation = orientation
            attempt.save(update_fields=['status', 'screen_orientation'])

        # Ambil paket soal dengan serializer yang context-aware (tanpa is_correct untuk siswa!)
        package_serializer = ExamPackageSerializer(session.package, context={'request': request})

        return Response({
            "success": True,
            "attempt_id": str(attempt.id),
            "status": attempt.status,
            "screen_orientation": attempt.screen_orientation,
            "duration_minutes": session.duration_minutes,
            "package": package_serializer.data,
            "existing_answers": attempt.answers_json,
        }, status=status.HTTP_200_OK)


class SubmitExamAnswersView(APIView):
    """
    POST /api/exams/sessions/<uuid:session_id>/submit/
    Menyimpan jawaban siswa dan menghitung skor otomatis untuk soal pilihan ganda
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        session = get_object_or_404(ExamSession, id=session_id)
        student = request.user
        attempt = get_object_or_404(StudentAttempt, session=session, student=student)

        answers = request.data.get('answers') or request.data.get('answers_json') or {}
        score = calculate_auto_grading_score(attempt, answers)

        return Response({
            "success": True,
            "message": "Seluruh jawaban berhasil disimpan ke sistem.",
            "attempt_id": str(attempt.id),
            "calculated_score": float(score) if score is not None else None,
            "total_score": float(score) if score is not None else None,
        }, status=status.HTTP_200_OK)


class VerifyExitPasswordView(APIView):
    """
    POST /api/exams/sessions/<uuid:session_id>/verify-exit/
    Siswa memasukkan Password Keluar: jika valid, ubah status ke SUBMITTED dan catat waktu selesai
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        session = get_object_or_404(ExamSession, id=session_id)
        student = request.user
        attempt = get_object_or_404(StudentAttempt, session=session, student=student)

        input_password = request.data.get('exit_password', '').strip().upper()

        if not input_password:
            return Response(
                {"success": False, "message": "Password Keluar wajib diisi!"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        if input_password == session.exit_password.strip().upper():
            now = timezone.now()
            attempt.status = StudentAttempt.AttemptStatus.SUBMITTED
            attempt.finished_at = now
            attempt.save(update_fields=['status', 'finished_at'])

            return Response({
                "success": True,
                "message": "Password Keluar Terverifikasi! Sesi ujian Anda telah resmi diakhiri.",
                "finished_at": now.isoformat(),
                "status": attempt.status,
                "score": float(attempt.total_score) if attempt.total_score is not None else None,
            }, status=status.HTTP_200_OK)

        return Response(
            {"success": False, "message": "Password Keluar salah! Minta password keluar kepada pengawas ujian."}, 
            status=status.HTTP_400_BAD_REQUEST
        )


class ExamImageUploadView(APIView):
    """
    POST /api/exams/upload-image/
    Unggah berkas gambar butir soal dan opsi jawaban (Microsoft Forms style)
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        file_obj = request.FILES.get('image')
        if not file_obj:
            return Response({'error': 'Tidak ada berkas gambar yang diunggah.'}, status=status.HTTP_400_BAD_REQUEST)

        # Validasi ekstensi
        ext = os.path.splitext(file_obj.name)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']:
            return Response(
                {'error': 'Format berkas tidak didukung. Harap unggah gambar (JPG, PNG, GIF, WEBP, SVG).'}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Simpan ke MEDIA_ROOT / exam_images
        media_dir = os.path.join(settings.MEDIA_ROOT, 'exam_images')
        os.makedirs(media_dir, exist_ok=True)

        unique_name = f"{uuid.uuid4().hex[:12]}_{file_obj.name.replace(' ', '_')}"
        file_path = os.path.join(media_dir, unique_name)

        with open(file_path, 'wb+') as destination:
            for chunk in file_obj.chunks():
                destination.write(chunk)

        relative_url = f"/media/exam_images/{unique_name}"
        return Response({
            'url': relative_url,
            'filename': unique_name,
            'message': 'Gambar berhasil diunggah'
        }, status=status.HTTP_201_CREATED)


