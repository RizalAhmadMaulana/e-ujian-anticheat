import os
import uuid
import random
import mimetypes
from io import BytesIO
from django.conf import settings
from django.db.models import Q
from django.http import HttpResponse, Http404, FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

from .models import ExamPackage, ExamSession, Question, QuestionOption
from .serializers import ExamPackageSerializer, ExamSessionSerializer
from .services import calculate_auto_grading_score
from .tokens import is_valid_entry_token, get_session_tokens
from .parsers import parse_docx_questions, parse_excel_questions, generate_question_excel_template
from apps.accounts.permissions import IsTeacherRole
from apps.accounts.models import User, SchoolSetting
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
        
        # Jika siswa, tampilkan paket yang sedang aktif untuk kelas siswa atau semua kelas
        if getattr(user, 'role', None) == 'STUDENT':
            if hasattr(user, 'classroom') and user.classroom:
                return ExamPackage.objects.filter(
                    Q(sessions__allow_all_classes=True) |
                    Q(sessions__classrooms=user.classroom) |
                    Q(sessions__classroom=user.classroom), 
                    sessions__is_active=True
                ).distinct().prefetch_related('questions__options')
            else:
                return ExamPackage.objects.filter(
                    sessions__allow_all_classes=True, 
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
        qs = ExamSession.objects.all().select_related('package', 'classroom').prefetch_related('classrooms')

        # Filter kelas untuk role Siswa
        if getattr(user, 'role', None) == 'STUDENT':
            if hasattr(user, 'classroom') and user.classroom:
                qs = qs.filter(
                    Q(allow_all_classes=True) |
                    Q(classrooms=user.classroom) |
                    Q(classroom=user.classroom),
                    is_active=True
                ).distinct()
            else:
                qs = qs.filter(allow_all_classes=True, is_active=True)

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

        input_password = request.data.get('entry_password', '').strip().upper().replace(' ', '')

        if not input_password:
            return Response(
                {"success": False, "message": "Password Masuk (Token) wajib diisi!"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        is_valid = is_valid_entry_token(session.id, input_password, base_token=session.entry_password)

        # Smart Fallback Resolution: jika token tidak cocok dengan session_id di URL,
        # periksa apakah token ini cocok dengan sesi aktif lain milik siswa / kelas yang sama
        if not is_valid:
            user = request.user
            base_qs = ExamSession.objects.filter(is_active=True).select_related('package', 'classroom').prefetch_related('classrooms')
            
            # Prioritaskan sesi di kelas siswa
            if hasattr(user, 'classroom') and user.classroom:
                for cand in base_qs.filter(
                    Q(allow_all_classes=True) |
                    Q(classrooms=user.classroom) |
                    Q(classroom=user.classroom)
                ).distinct():
                    if cand.id != session.id and is_valid_entry_token(cand.id, input_password, base_token=cand.entry_password):
                        session = cand
                        is_valid = True
                        break
            
            # Fallback ke seluruh sesi aktif
            if not is_valid:
                for cand in base_qs:
                    if cand.id != session.id and is_valid_entry_token(cand.id, input_password, base_token=cand.entry_password):
                        session = cand
                        is_valid = True
                        break

        if not is_valid:
            return Response(
                {"success": False, "message": "Token Masuk salah atau sudah kedaluwarsa! Token diperbarui otomatis setiap 10 menit. Silakan minta token terbaru kepada pengawas."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validasi Rentang Waktu Ujian untuk sesi yang sudah terverifikasi (Sinkronisasi Jadwal Mulai & Selesai)
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

        # Validasi Pengerjaan Tunggal (Single Attempt Enforcement) untuk role Siswa
        if getattr(request.user, 'role', None) == 'STUDENT':
            existing_attempt = StudentAttempt.objects.filter(session=session, student=request.user).first()
            if existing_attempt and existing_attempt.status == StudentAttempt.AttemptStatus.SUBMITTED:
                answers_dict = existing_attempt.answers_json or {}
                is_remedial_allowed = bool(isinstance(answers_dict, dict) and answers_dict.get('_remedial_allowed'))
                if not is_remedial_allowed:
                    return Response({
                        "success": False,
                        "status_code": "ALREADY_SUBMITTED",
                        "message": "Anda sudah menyelesaikan ujian ini dan lembar jawaban Anda telah tersimpan secara resmi. Pengerjaan ulang hanya dapat dilakukan jika Guru Pengawas membuka akses remidi untuk Anda."
                    }, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            "success": True,
            "message": "Token Masuk Terverifikasi. Layar Anda akan dikunci ke Mode Lockdown.",
            "session_id": str(session.id),
            "package_id": str(session.package.id),
            "title": session.package.title,
            "subject_name": session.package.subject_name,
            "classroom": session.get_classrooms_display(),
            "duration_minutes": session.duration_minutes
        }, status=status.HTTP_200_OK)


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

        # Cek apakah siswa sudah pernah menyelesaikan ujian ini sebelumnya (Single Attempt Enforcement)
        existing_attempt = StudentAttempt.objects.filter(session=session, student=student).first()
        if existing_attempt:
            answers_dict = existing_attempt.answers_json or {}
            is_remedial_allowed = bool(isinstance(answers_dict, dict) and answers_dict.get('_remedial_allowed'))
            # Jika siswa sudah pernah SUBMITTED atau finished_at terisi dan bukan masa remidi aktif:
            if (existing_attempt.status == StudentAttempt.AttemptStatus.SUBMITTED or existing_attempt.finished_at is not None) and not is_remedial_allowed:
                # Self-healing jika status di database sempat tertimpa
                if existing_attempt.status != StudentAttempt.AttemptStatus.SUBMITTED:
                    existing_attempt.status = StudentAttempt.AttemptStatus.SUBMITTED
                    existing_attempt.save(update_fields=['status'])
                return Response({
                    "success": False,
                    "error": "Anda sudah menyelesaikan ujian ini dan lembar jawaban Anda telah tersimpan secara resmi. Pengerjaan ulang hanya dapat dilakukan jika Guru Pengawas membuka akses remidi untuk Anda."
                }, status=status.HTTP_400_BAD_REQUEST)

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

        # Jika attempt sudah pernah ada sebelumnya di basis data:
        if not created:
            answers_dict = attempt.answers_json or {}
            is_remedial_allowed = bool(isinstance(answers_dict, dict) and answers_dict.get('_remedial_allowed'))

            # 1. Jika attempt berstatus SUBMITTED (atau finished_at ada):
            if attempt.status == StudentAttempt.AttemptStatus.SUBMITTED or attempt.finished_at is not None:
                if not is_remedial_allowed:
                    if attempt.status != StudentAttempt.AttemptStatus.SUBMITTED:
                        attempt.status = StudentAttempt.AttemptStatus.SUBMITTED
                        attempt.save(update_fields=['status'])
                    return Response({
                        "success": False,
                        "error": "Anda sudah menyelesaikan ujian ini dan lembar jawaban Anda telah tersimpan secara resmi. Pengerjaan ulang hanya dapat dilakukan jika Guru Pengawas membuka akses remidi untuk Anda."
                    }, status=status.HTTP_400_BAD_REQUEST)

                # Siswa memulai ujian remidi yang diizinkan pengawas:
                # Simpan skor awal sebagai referensi untuk penentuan nilai tertinggi
                prev_score = float(attempt.total_score) if attempt.total_score is not None else float(answers_dict.get('_previous_score', 0))
                attempt.status = StudentAttempt.AttemptStatus.WORKING
                attempt.screen_orientation = orientation
                attempt.violation_count = 0
                attempt.started_at = timezone.now()
                attempt.finished_at = None
                attempt.total_score = None
                attempt.answers_json = {
                    '_previous_score': prev_score,
                    '_remedial_allowed': True,
                    '_is_remedial': True
                }
                attempt.save()
                # Hapus seluruh catatan pelanggaran lama untuk sesi ini agar Riwayat Pelanggaran & E-Jurnal bersih
                attempt.violations.all().delete()
                try:
                    from apps.ejournal.views import get_or_create_journal_with_stats
                    get_or_create_journal_with_stats(session, session.package.teacher if session.package else None)
                except Exception:
                    pass
            elif attempt.status not in [StudentAttempt.AttemptStatus.DISQUALIFIED]:
                # 2. Siswa melanjutkan ujian yang belum selesai (status WORKING / LOCKED_VIOLATION):
                # Pertahankan answers_json dan akumulasi pelanggaran yang sudah terjadi (TIDAK di-reset)
                attempt.status = StudentAttempt.AttemptStatus.WORKING
                attempt.screen_orientation = orientation
                attempt.save(update_fields=['status', 'screen_orientation'])

        # Ambil paket soal dengan serializer yang context-aware (tanpa is_correct untuk siswa!)
        package_serializer = ExamPackageSerializer(session.package, context={'request': request})
        package_data = package_serializer.data

        # Pengacakan Butir Soal & Opsi Jawaban Deterministik berbasis Seed (attempt.id)
        if session.package.exam_type == 'NATIVE_QUESTIONS' and package_data.get('questions'):
            questions = list(package_data['questions'])
            rng = random.Random(str(attempt.id))

            if session.shuffle_questions:
                rng.shuffle(questions)
                for idx, q in enumerate(questions):
                    q['order_number'] = idx + 1
                    q['orderNumber'] = idx + 1

            if session.shuffle_options:
                labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
                for q in questions:
                    if q.get('options') and q.get('question_type') in ['MULTIPLE_CHOICE', 'MULTIPLE_CHOICE_COMPLEX']:
                        opts = list(q['options'])
                        rng.shuffle(opts)
                        for o_idx, opt in enumerate(opts):
                            lbl = labels[o_idx] if o_idx < len(labels) else f"Opt {o_idx + 1}"
                            opt['option_label'] = lbl
                            opt['label'] = lbl
                        q['options'] = opts

            package_data['questions'] = questions

        return Response({
            "success": True,
            "attempt_id": str(attempt.id),
            "status": attempt.status,
            "screen_orientation": attempt.screen_orientation,
            "duration_minutes": session.duration_minutes,
            "package": package_data,
            "existing_answers": attempt.answers_json,
            "violation_count": attempt.violation_count,
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


class FinishExamSessionView(APIView):
    """
    POST /api/exams/sessions/<uuid:session_id>/finish/
    Mengakhiri sesi ujian siswa tanpa memerlukan Password Keluar.
    Menyimpan jawaban akhir (opsional), menghitung skor otomatis, dan mengubah status ke SUBMITTED.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        session = get_object_or_404(ExamSession, id=session_id)
        student = request.user
        attempt = get_object_or_404(StudentAttempt, session=session, student=student)

        # Jika ada jawaban yang disertakan pada payload
        answers = request.data.get('answers') or request.data.get('answers_json')
        if answers:
            calculate_auto_grading_score(attempt, answers)

        now = timezone.now()
        attempt.status = StudentAttempt.AttemptStatus.SUBMITTED
        attempt.finished_at = now
        attempt.save(update_fields=['status', 'finished_at'])

        return Response({
            "success": True,
            "message": "Sesi ujian Anda telah resmi diakhiri dan seluruh rekaman jawaban telah tersimpan.",
            "finished_at": now.isoformat(),
            "status": attempt.status,
            "score": float(attempt.total_score) if attempt.total_score is not None else None,
        }, status=status.HTTP_200_OK)


class VerifyExitPasswordView(APIView):
    """
    POST /api/exams/sessions/<uuid:session_id>/verify-exit/
    Siswa mengakhiri ujian (mendukung konfirmasi langsung tanpa password atau verifikasi password opsional)
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        session = get_object_or_404(ExamSession, id=session_id)
        student = request.user
        attempt = get_object_or_404(StudentAttempt, session=session, student=student)

        input_password = request.data.get('exit_password', '').strip().upper()

        # Jika tidak ada password keluar pada sesi, atau input kosong (konfirmasi langsung), atau password cocok:
        if not session.exit_password or not input_password or input_password == session.exit_password.strip().upper():
            now = timezone.now()
            attempt.status = StudentAttempt.AttemptStatus.SUBMITTED
            attempt.finished_at = now
            attempt.save(update_fields=['status', 'finished_at'])

            return Response({
                "success": True,
                "message": "Sesi ujian Anda telah resmi diakhiri dan jawaban telah tersimpan di E-Jurnal Guru.",
                "finished_at": now.isoformat(),
                "status": attempt.status,
                "score": float(attempt.total_score) if attempt.total_score is not None else None,
            }, status=status.HTTP_200_OK)

        return Response(
            {"success": False, "message": "Password Keluar tidak cocok."}, 
            status=status.HTTP_400_BAD_REQUEST
        )


class CancelExamSessionView(APIView):
    """
    POST /api/exams/sessions/<uuid:session_id>/cancel/
    Siswa membatalkan pengerjaan ujian dan keluar tanpa menyelesaikan soal.
    Menghapus seluruh rekaman pelanggaran (ViolationLog) pada sesi ini,
    menghapus rekaman attempt sehingga nilai tidak terekap di sistem,
    dan menyinkronkan data E-Jurnal serta Live Proctoring.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        session = get_object_or_404(ExamSession, id=session_id)
        student = request.user

        attempt = StudentAttempt.objects.filter(session=session, student=student).first()
        if not attempt:
            attempt_id = request.data.get('attempt_id')
            if attempt_id:
                attempt = StudentAttempt.objects.filter(id=attempt_id, student=student).first()

        if attempt:
            # 1. Hapus seluruh log pelanggaran untuk attempt ini
            attempt.violations.all().delete()
            attempt_id_str = str(attempt.id)

            # 2. Update E-Jurnal jika ada
            try:
                from apps.ejournal.models import ExamJournal
                journal = ExamJournal.objects.filter(session=session).first()
                if journal:
                    journal.total_violations_recorded = sum(
                        att.violation_count for att in session.attempts.exclude(id=attempt.id)
                    )
                    journal.save(update_fields=['total_violations_recorded'])
            except Exception:
                pass

            # 3. Broadcast ke WebSocket Proctoring agar layar guru seketika terupdate
            try:
                from asgiref.sync import async_to_sync
                from channels.layers import get_channel_layer
                channel_layer = get_channel_layer()
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        f"proctoring_{session.id}",
                        {
                            "type": "broadcast_message",
                            "data": {
                                "event": "STUDENT_CANCELLED",
                                "attempt_id": attempt_id_str,
                                "student_id": str(student.id),
                                "student_name": student.full_name or student.username,
                                "message": f"Siswa {student.full_name or student.username} membatalkan pengerjaan ujian."
                            }
                        }
                    )
            except Exception:
                pass

            # 4. Hapus attempt siswa sehingga nilai tidak terekap dan status kembali ke NOT_STARTED ("Belum Masuk")
            attempt.delete()

        return Response({
            "success": True,
            "message": "Pengerjaan ujian berhasil dibatalkan. Seluruh log pelanggaran pada sesi ini telah dihapus dan nilai tidak terekap."
        }, status=status.HTTP_200_OK)


class OpenStudentRemedialView(APIView):
    """
    POST /api/exams/sessions/<uuid:session_id>/students/<uuid:student_id>/open-remedial/
    Guru Pengawas membuka hak akses remidi untuk siswa tertentu pada sesi ujian mandiri.
    Menyimpan skor awal siswa, mereset riwayat pelanggaran ke 0,
    dan mengizinkan siswa mengerjakan ulang dengan jaminan sistem mengambil skor tertinggi.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id, student_id):
        # Validasi role Guru / Admin
        if getattr(request.user, 'role', None) not in ['TEACHER', 'ADMIN'] and not request.user.is_staff:
            return Response(
                {"error": "Hanya Guru Pengawas atau Administrator yang berhak membuka akses remidi siswa."},
                status=status.HTTP_403_FORBIDDEN
            )

        session = get_object_or_404(ExamSession, id=session_id)
        from apps.accounts.models import User
        student = get_object_or_404(User, id=student_id)
        attempt = StudentAttempt.objects.filter(session=session, student=student).first()

        if not attempt:
            return Response(
                {"error": "Siswa belum pernah memulai atau mengerjakan sesi ujian ini."},
                status=status.HTTP_404_NOT_FOUND
            )

        action = request.data.get('action', 'open')
        current_answers = attempt.answers_json or {}

        if action == 'close':
            current_answers['_remedial_allowed'] = False
            attempt.answers_json = current_answers
            attempt.save(update_fields=['answers_json'])
            return Response({
                "success": True,
                "message": f"Akses remidi untuk {student.full_name or student.username} telah ditutup kembali.",
                "student_id": str(student.id),
                "is_remedial_allowed": False
            }, status=status.HTTP_200_OK)

        # Simpan skor sebelumnya sebagai acuan nilai tertinggi
        prev_score = float(attempt.total_score) if attempt.total_score is not None else float(current_answers.get('_previous_score', 0))

        # Reset log pelanggaran siswa pada sesi ini menjadi 0 (bersih)
        attempt.violations.all().delete()
        attempt.violation_count = 0

        # Update metadata remedial di answers_json
        current_answers['_previous_score'] = prev_score
        current_answers['_remedial_allowed'] = True
        current_answers['_remedial_opened_at'] = timezone.now().isoformat()
        current_answers['_remedial_opened_by'] = request.user.full_name or request.user.username

        attempt.answers_json = current_answers
        attempt.save(update_fields=['answers_json', 'violation_count'])

        # Sinkronkan rekap pelanggaran ke E-Jurnal
        try:
            from apps.ejournal.views import get_or_create_journal_with_stats
            get_or_create_journal_with_stats(session, request.user)
        except Exception:
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
            "message": f"Akses remidi untuk {student.full_name or student.username} berhasil dibuka. Catatan pelanggaran telah dibersihkan dan nilai awal ({prev_score}) disimpan sebagai acuan skor tertinggi.",
            "student_id": str(student.id),
            "student_name": student.full_name or student.username,
            "previous_score": prev_score,
            "is_remedial_allowed": True
        }, status=status.HTTP_200_OK)


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

        stream_url = f"/api/exams/image-stream/?file={unique_name}"
        relative_url = f"/media/exam_images/{unique_name}"
        return Response({
            'url': stream_url,
            'stream_url': stream_url,
            'relative_url': relative_url,
            'filename': unique_name,
            'message': 'Gambar berhasil diunggah'
        }, status=status.HTTP_201_CREATED)


class ServeExamImageStreamView(APIView):
    r"""
    GET /api/exams/image-stream/?file=<filename>
    GET /api/exams/image-stream/<path:filename>
    Melayani stream biner gambar soal & opsi jawaban tanpa ekstensi di path URL.
    Sangat kebal dari pencegatan regex static file Nginx (location ~* \.(jpg|png|webp)).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, filename=None):
        raw_name = filename or request.GET.get('file') or request.GET.get('name') or request.GET.get('f') or ''
        if not raw_name:
            raise Http404("Nama berkas gambar tidak disertakan.")

        # Sanitasi path traversal
        clean_name = os.path.basename(raw_name).strip()
        candidates = [
            os.path.join(settings.MEDIA_ROOT, 'exam_images', clean_name),
            os.path.join(settings.MEDIA_ROOT, clean_name),
            os.path.join(str(settings.BASE_DIR), 'media', 'exam_images', clean_name),
            os.path.join(str(settings.BASE_DIR), 'media', clean_name),
        ]

        target_path = None
        for cand in candidates:
            if os.path.exists(cand) and os.path.isfile(cand):
                target_path = cand
                break

        if not target_path:
            raise Http404(f"Berkas gambar '{clean_name}' tidak ditemukan di server.")

        content_type, _ = mimetypes.guess_type(target_path)
        content_type = content_type or 'image/png'

        response = FileResponse(open(target_path, 'rb'), content_type=content_type)
        response['Cache-Control'] = 'public, max-age=86400'
        return response


class ServeExamMediaFileView(APIView):
    """
    GET /api/exams/images/<path:filename>
    Melayani berkas media gambar soal secara langsung via API
    kebal dari konfigurasi proxy Nginx dan tidak terhalang oleh DEBUG=False.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, filename):
        clean_name = os.path.basename(filename).strip()
        candidates = [
            os.path.join(settings.MEDIA_ROOT, 'exam_images', clean_name),
            os.path.join(settings.MEDIA_ROOT, clean_name),
            os.path.join(str(settings.BASE_DIR), 'media', 'exam_images', clean_name),
            os.path.join(str(settings.BASE_DIR), 'media', clean_name),
            os.path.join(settings.MEDIA_ROOT, filename),
        ]
        target_path = None
        for cand in candidates:
            if os.path.exists(cand) and os.path.isfile(cand):
                target_path = cand
                break

        if not target_path:
            raise Http404(f"Berkas gambar '{clean_name}' tidak ditemukan.")

        content_type, _ = mimetypes.guess_type(target_path)
        content_type = content_type or 'image/png'

        response = FileResponse(open(target_path, 'rb'), content_type=content_type)
        response['Cache-Control'] = 'public, max-age=86400'
        return response


class DownloadQuestionTemplateExcelView(APIView):
    """
    GET /api/exams/packages/template-excel/
    Unduh template format Excel (.xlsx) resmi untuk import massal butir soal
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        wb = generate_question_excel_template()
        stream = BytesIO()
        wb.save(stream)
        stream.seek(0)

        response = HttpResponse(
            stream.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="Template_Bank_Soal_E-Ujian.xlsx"'
        return response


class ImportDocxQuestionsView(APIView):
    """
    POST /api/exams/packages/import-docx/
    POST /api/exams/packages/<uuid:pk>/import-docx/
    Import butir soal massal dari berkas Microsoft Word (.docx)
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk=None):
        file_obj = request.FILES.get('file') or request.FILES.get('docx_file')
        if not file_obj:
            return Response({'error': 'Berkas Microsoft Word (.docx) wajib dilampirkan.'}, status=status.HTTP_400_BAD_REQUEST)

        if not file_obj.name.lower().endswith('.docx'):
            return Response({'error': 'Format berkas tidak valid. Harap unggah berkas berekstensi .docx'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            parsed_questions = parse_docx_questions(file_obj)
        except Exception as e:
            return Response({'error': f'Gagal membaca berkas Word: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        if not parsed_questions:
            return Response({'error': 'Tidak ada butir soal yang berhasil terdeteksi dari berkas Word.'}, status=status.HTTP_400_BAD_REQUEST)

        # Cari atau buat ExamPackage
        if pk:
            package = get_object_or_404(ExamPackage, id=pk)
        else:
            title = request.data.get('title') or f"Import Word - {os.path.splitext(file_obj.name)[0]}"
            subject_name = request.data.get('subject_name') or "Mata Pelajaran"
            package = ExamPackage.objects.create(
                title=title,
                subject_name=subject_name,
                exam_type=ExamPackage.ExamTypeChoices.NATIVE_QUESTIONS,
                teacher=request.user
            )

        # Tambahkan pertanyaan dan opsi
        start_order = package.questions.count()
        created_count = 0
        for idx, q_data in enumerate(parsed_questions):
            options_data = q_data.pop('options', [])
            q_data.pop('keys', None)
            order_num = start_order + idx + 1
            question = Question.objects.create(
                package=package,
                question_text=q_data.get('question_text', ''),
                image_url=q_data.get('image_url') or None,
                question_type=q_data.get('question_type', 'MULTIPLE_CHOICE'),
                points=q_data.get('points', 10),
                order_number=order_num,
                extra_data=q_data.get('extra_data', {})
            )
            for opt_data in options_data:
                QuestionOption.objects.create(
                    question=question,
                    option_label=opt_data.get('option_label', 'A'),
                    option_text=opt_data.get('option_text', ''),
                    is_correct=opt_data.get('is_correct', False)
                )
            created_count += 1

        serializer = ExamPackageSerializer(package, context={'request': request})
        return Response({
            'success': True,
            'message': f'Berhasil mengimpor {created_count} butir soal dari dokumen Word.',
            'package': serializer.data,
            'imported_count': created_count
        }, status=status.HTTP_201_CREATED)


class ImportExcelQuestionsView(APIView):
    """
    POST /api/exams/packages/import-excel/
    POST /api/exams/packages/<uuid:pk>/import-excel/
    Import butir soal massal dari berkas Microsoft Excel (.xlsx)
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk=None):
        file_obj = request.FILES.get('file') or request.FILES.get('excel_file')
        if not file_obj:
            return Response({'error': 'Berkas Microsoft Excel (.xlsx) wajib dilampirkan.'}, status=status.HTTP_400_BAD_REQUEST)

        if not file_obj.name.lower().endswith(('.xlsx', '.xlsm')):
            return Response({'error': 'Format berkas tidak valid. Harap unggah berkas berekstensi .xlsx'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            parsed_questions = parse_excel_questions(file_obj)
        except Exception as e:
            return Response({'error': f'Gagal membaca berkas Excel: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

        if not parsed_questions:
            return Response({'error': 'Tidak ada butir soal yang terdeteksi dari berkas Excel.'}, status=status.HTTP_400_BAD_REQUEST)

        # Cari atau buat ExamPackage
        if pk:
            package = get_object_or_404(ExamPackage, id=pk)
        else:
            title = request.data.get('title') or f"Import Excel - {os.path.splitext(file_obj.name)[0]}"
            subject_name = request.data.get('subject_name') or "Mata Pelajaran"
            package = ExamPackage.objects.create(
                title=title,
                subject_name=subject_name,
                exam_type=ExamPackage.ExamTypeChoices.NATIVE_QUESTIONS,
                teacher=request.user
            )

        start_order = package.questions.count()
        created_count = 0
        for idx, q_data in enumerate(parsed_questions):
            options_data = q_data.pop('options', [])
            q_data.pop('keys', None)
            order_num = start_order + idx + 1
            question = Question.objects.create(
                package=package,
                question_text=q_data.get('question_text', ''),
                image_url=q_data.get('image_url') or None,
                question_type=q_data.get('question_type', 'MULTIPLE_CHOICE'),
                points=q_data.get('points', 10),
                order_number=order_num,
                extra_data=q_data.get('extra_data', {})
            )
            for opt_data in options_data:
                QuestionOption.objects.create(
                    question=question,
                    option_label=opt_data.get('option_label', 'A'),
                    option_text=opt_data.get('option_text', ''),
                    is_correct=opt_data.get('is_correct', False)
                )
            created_count += 1

        serializer = ExamPackageSerializer(package, context={'request': request})
        return Response({
            'success': True,
            'message': f'Berhasil mengimpor {created_count} butir soal dari berkas Excel.',
            'package': serializer.data,
            'imported_count': created_count
        }, status=status.HTTP_201_CREATED)


class SessionEssaySubmissionsView(APIView):
    """
    GET /api/exams/sessions/<uuid:session_id>/essay-submissions/
    Mengambil daftar butir soal esai dan lembar jawaban seluruh siswa untuk dikoreksi guru
    Mendukung filter query ?classroom=... atau ?classroom_id=...
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, session_id):
        session = get_object_or_404(ExamSession.objects.select_related('package', 'classroom'), id=session_id)
        package = session.package
        
        # Ambil soal-soal bertipe ESSAY pada paket sesi
        essay_questions = Question.objects.filter(
            package=package,
            question_type=Question.QuestionTypeChoices.ESSAY
        ).order_by('order_number')

        questions_data = [
            {
                "id": str(q.id),
                "order_number": q.order_number,
                "order": q.order_number,
                "text": q.question_text,
                "question_text": q.question_text,
                "image_url": str(q.image_url) if q.image_url else None,
                "imageUrl": str(q.image_url) if q.image_url else None,
                "points": q.points,
                "max_score": q.points,
                "max_points": q.points,
                "extra_data": q.extra_data or {}
            }
            for q in essay_questions
        ]

        # Ambil filter kelas dari parameter query (ID atau nama kelas)
        classroom_param = request.query_params.get('classroom') or request.query_params.get('classroom_id')
        target_classroom = None
        if classroom_param and str(classroom_param).strip().upper() != 'ALL':
            from apps.accounts.models import ClassRoom
            if str(classroom_param).strip().isdigit():
                target_classroom = ClassRoom.objects.filter(id=int(classroom_param)).first()
            if not target_classroom:
                target_classroom = ClassRoom.objects.filter(name__iexact=str(classroom_param).strip()).first()

        attempts = StudentAttempt.objects.filter(session=session).select_related('student', 'student__classroom').order_by('student__full_name')
        if target_classroom:
            attempts = attempts.filter(student__classroom=target_classroom)

        submissions = []
        for att in attempts:
            answers = att.answers_json or {}
            essay_scores = att.essay_scores or {}

            student_essay_data = []
            answers_by_qid = {}
            for q in essay_questions:
                q_id_str = str(q.id)
                # Siswa mungkin menyimpan jawaban dengan ID, format lowercase/uppercase, atau q_{order_number}
                raw_ans = (
                    answers.get(q_id_str) or 
                    answers.get(q_id_str.lower()) or 
                    answers.get(q_id_str.upper()) or 
                    answers.get(f"q_{q.order_number}") or 
                    answers.get(str(q.order_number)) or 
                    ""
                )
                if isinstance(raw_ans, dict):
                    student_answer_text = raw_ans.get('text') or raw_ans.get('answer') or raw_ans.get('value') or raw_ans.get('student_answer') or str(raw_ans)
                else:
                    student_answer_text = str(raw_ans) if raw_ans is not None else ""

                grading_info = essay_scores.get(q_id_str, {})
                score_val = grading_info.get('score')
                item_obj = {
                    "question_id": q_id_str,
                    "order_number": q.order_number,
                    "order": q.order_number,
                    "student_answer": student_answer_text,
                    "points": q.points,
                    "max_points": q.points,
                    "max_score": q.points,
                    "score": score_val,
                    "feedback": grading_info.get('feedback', ''),
                    "graded_at": grading_info.get('graded_at'),
                    "is_graded": score_val is not None
                }
                student_essay_data.append(item_obj)
                answers_by_qid[q_id_str] = item_obj

            graded_count = sum(1 for item in student_essay_data if item["is_graded"])
            total_essays = len(essay_questions)
            is_fully_graded = (graded_count >= total_essays) if total_essays > 0 else True
            essay_earned_points = sum(float(item["score"]) for item in student_essay_data if item["score"] is not None)

            student_entry = {
                "attempt_id": str(att.id),
                "student_id": str(att.student.id),
                "student_name": att.student.full_name or att.student.username,
                "nisn": att.student.nisn or att.student.username or "-",
                "classroom": att.student.classroom.name if getattr(att.student, 'classroom', None) else session.get_classrooms_display(),
                "classroom_id": att.student.classroom_id if getattr(att.student, 'classroom_id', None) else None,
                "status": att.status,
                "status_label": att.get_status_display(),
                "total_score": float(att.total_score) if att.total_score is not None else 0.0,
                "essay_score": essay_earned_points,
                "graded_count": graded_count,
                "total_essays": total_essays,
                "is_fully_graded": is_fully_graded,
                # Sediakan KEDUA format: dictionary dan list agar kompatibel 100%!
                "answers": answers_by_qid,
                "answers_list": student_essay_data
            }
            submissions.append(student_entry)

        return Response({
            "success": True,
            "session_id": str(session.id),
            "session_title": package.title if package else "Sesi Ujian",
            "subject_name": package.subject_name if package else "-",
            "classroom": target_classroom.name if target_classroom else session.get_classrooms_display(),
            "total_essay_questions": len(questions_data),
            "essay_questions": questions_data,
            "submissions": submissions,
            "students": submissions
        }, status=status.HTTP_200_OK)


class GradeEssaySubmissionView(APIView):
    """
    POST /api/exams/sessions/<uuid:session_id>/grade-essay/
    Guru menyimpan skor nilai esai dan komentar umpan balik untuk butir soal tertentu
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, session_id):
        session = get_object_or_404(ExamSession, id=session_id)
        attempt_id = request.data.get('attempt_id')
        student_id = request.data.get('student_id')
        question_id = request.data.get('question_id')
        raw_score = request.data.get('score')
        feedback = request.data.get('feedback', '').strip()

        if not attempt_id and not student_id:
            return Response(
                {"error": "Parameter attempt_id atau student_id wajib disertakan."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not question_id or raw_score is None:
            return Response(
                {"error": "Parameter question_id dan score wajib disertakan."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if attempt_id:
            attempt = get_object_or_404(StudentAttempt, id=attempt_id, session=session)
        else:
            attempt = get_object_or_404(StudentAttempt, student_id=student_id, session=session)

        question = get_object_or_404(Question, id=question_id, package=session.package)

        try:
            score = float(raw_score)
        except (ValueError, TypeError):
            return Response({"error": "Format skor nilai tidak valid."}, status=status.HTTP_400_BAD_REQUEST)

        if score < 0:
            return Response({"error": "Skor nilai tidak boleh negatif."}, status=status.HTTP_400_BAD_REQUEST)

        if score > float(question.points):
            return Response(
                {"error": f"Skor nilai ({score}) melebihi bobot poin maksimal butir soal ({question.points})."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update essay_scores
        current_scores = attempt.essay_scores or {}
        current_scores[str(question_id)] = {
            "score": score,
            "max_points": question.points,
            "feedback": feedback,
            "graded_at": timezone.now().isoformat(),
            "graded_by": request.user.full_name or request.user.username
        }
        attempt.essay_scores = current_scores
        attempt.save(update_fields=['essay_scores'])

        # Hitung ulang total score secara otomatis
        recalculated_total = calculate_auto_grading_score(attempt, attempt.answers_json or {})

        return Response({
            "success": True,
            "message": f"Nilai esai nomor {question.order_number} berhasil disimpan.",
            "attempt_id": str(attempt.id),
            "question_id": str(question.id),
            "score": score,
            "feedback": feedback,
            "total_score": float(recalculated_total) if recalculated_total is not None else float(attempt.total_score or 0)
        }, status=status.HTTP_200_OK)


class SessionStudentResultsView(APIView):
    """
    GET /api/exams/sessions/<uuid:session_id>/student-results/
    Mengambil ringkasan rekapitulasi nilai seluruh siswa pada sesi ujian tertentu beserta statistik kelas
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, session_id):
        session = get_object_or_404(ExamSession.objects.select_related('package', 'classroom'), id=session_id)
        package = session.package
        questions = list(Question.objects.filter(package=package).prefetch_related('options').order_by('order_number')) if package else []
        total_questions_count = len(questions)
        total_max_points = sum(q.points for q in questions)
        essay_questions = [q for q in questions if q.question_type == Question.QuestionTypeChoices.ESSAY]
        has_essay = len(essay_questions) > 0

        # Ambil filter kelas dari parameter query (ID atau nama kelas)
        classroom_param = request.query_params.get('classroom') or request.query_params.get('classroom_id')
        target_classroom = None
        if classroom_param and str(classroom_param).strip().upper() != 'ALL':
            from apps.accounts.models import ClassRoom
            if str(classroom_param).strip().isdigit():
                target_classroom = ClassRoom.objects.filter(id=int(classroom_param)).first()
            if not target_classroom:
                target_classroom = ClassRoom.objects.filter(name__iexact=str(classroom_param).strip()).first()

        # Ambil daftar seluruh siswa yang berhak mengikuti sesi ujian ini
        if target_classroom:
            students_qs = list(User.objects.filter(classroom=target_classroom, role=User.RoleChoices.STUDENT).select_related('classroom').order_by('full_name'))
            attempts_qs = StudentAttempt.objects.filter(session=session, student__classroom=target_classroom).select_related('student', 'student__classroom')
            classroom_display_name = target_classroom.name
        else:
            if session.allow_all_classes:
                students_qs = list(User.objects.filter(role=User.RoleChoices.STUDENT).select_related('classroom').order_by('full_name'))
            elif hasattr(session, 'classrooms') and session.classrooms.exists():
                students_qs = list(User.objects.filter(classroom__in=session.classrooms.all(), role=User.RoleChoices.STUDENT).select_related('classroom').order_by('full_name'))
            elif session.classroom:
                students_qs = list(User.objects.filter(classroom=session.classroom, role=User.RoleChoices.STUDENT).select_related('classroom').order_by('full_name'))
            else:
                students_qs = list(User.objects.filter(role=User.RoleChoices.STUDENT).select_related('classroom').order_by('full_name'))
            attempts_qs = StudentAttempt.objects.filter(session=session).select_related('student', 'student__classroom')
            classroom_display_name = session.get_classrooms_display()

        # Peta attempt yang sudah tersimpan untuk sesi ini
        attempts_by_student = {att.student_id: att for att in attempts_qs}

        # Gabungkan siswa yang terdaftar maupun siswa yang telah memiliki attempt
        enrolled_student_ids = set(s.id for s in students_qs)
        all_students = list(students_qs)
        for att in attempts_qs:
            if att.student_id not in enrolled_student_ids:
                all_students.append(att.student)
                enrolled_student_ids.add(att.student_id)

        all_students.sort(key=lambda s: (s.full_name or s.username or "").lower())

        students_data = []
        scores_list = []

        for st in all_students:
            att = attempts_by_student.get(st.id)
            if att:
                answers = att.answers_json or {}
                essay_scores = att.essay_scores or {}

                is_remedial_allowed = bool(isinstance(answers, dict) and answers.get('_remedial_allowed'))

                # SELF-HEALING / DATA CONSISTENCY RECOVERY:
                # Jika siswa sudah punya finished_at (sudah menyelesaikan ujian dan submit),
                # dan BUKAN dalam masa remidi aktif, maka status MUTLAK HARUS SUBMITTED!
                if att.finished_at is not None and not is_remedial_allowed and att.status != StudentAttempt.AttemptStatus.SUBMITTED:
                    att.status = StudentAttempt.AttemptStatus.SUBMITTED
                    att.save(update_fields=['status'])

                # Hitung butir soal yang benar untuk pilihan ganda & objektif
                correct_count = 0
                for q in questions:
                    ans = answers.get(str(q.id)) or answers.get(f"q_{q.order_number}")
                    if ans is None:
                        continue
                    if q.question_type == Question.QuestionTypeChoices.MULTIPLE_CHOICE:
                        correct_opt = next((o for o in q.options.all() if o.is_correct), None)
                        if correct_opt:
                            raw_str = str(ans).strip()
                            if raw_str == str(correct_opt.id) or raw_str.upper() == correct_opt.option_label.strip().upper():
                                correct_count += 1
                    elif q.question_type == Question.QuestionTypeChoices.MULTIPLE_CHOICE_COMPLEX:
                        correct_labels = set(q.options.filter(is_correct=True).values_list('option_label', flat=True))
                        student_items = set(str(x).strip().upper() for x in ans) if isinstance(ans, list) else set()
                        if student_items == correct_labels:
                            correct_count += 1
                    elif q.question_type == Question.QuestionTypeChoices.SHORT_ANSWER:
                        extra = q.extra_data or {}
                        accepted = extra.get('exact_keys') or extra.get('accepted_answers') or extra.get('keys') or []
                        if isinstance(accepted, str):
                            accepted = [x.strip() for x in accepted.split('/') if x.strip()]
                        if any(str(ans).strip().lower() == str(acc).strip().lower() for acc in accepted):
                            correct_count += 1
                    elif q.question_type == Question.QuestionTypeChoices.TRUE_FALSE_MATRIX:
                        extra = q.extra_data or {}
                        rows = extra.get('rows', [])
                        if isinstance(ans, dict) and rows:
                            if sum(1 for i, r in enumerate(rows) if ans.get(str(i)) == bool(r.get('correct') or r.get('is_correct'))) == len(rows):
                                correct_count += 1
                    elif q.question_type == Question.QuestionTypeChoices.MATCHING_PAIR:
                        extra = q.extra_data or {}
                        pairs = extra.get('pairs', [])
                        if isinstance(ans, dict) and pairs:
                            if sum(1 for p in pairs if str(ans.get(p.get('left'), '')).strip().lower() == str(p.get('right', '')).strip().lower()) == len(pairs):
                                correct_count += 1
                    elif q.question_type == Question.QuestionTypeChoices.ESSAY:
                        e_info = essay_scores.get(str(q.id), {})
                        if e_info.get('score', 0) > 0:
                            correct_count += 1

                # Cek kelengkapan penilaian esai
                all_essays_graded = True
                essay_graded_count = 0
                if has_essay:
                    for eq in essay_questions:
                        eq_id_str = str(eq.id)
                        eq_info = essay_scores.get(eq_id_str)
                        if isinstance(eq_info, dict) and eq_info.get('score') is not None:
                            essay_graded_count += 1
                        else:
                            all_essays_graded = False

                is_essay_graded = (not has_essay) or (all_essays_graded and att.status == StudentAttempt.AttemptStatus.SUBMITTED)
                has_ungraded_essay = bool(has_essay and att.status == StudentAttempt.AttemptStatus.SUBMITTED and not all_essays_graded)

                score_val = float(att.total_score) if att.total_score is not None else (0.0 if att.status == StudentAttempt.AttemptStatus.SUBMITTED else None)
                if score_val is not None and not has_ungraded_essay:
                    scores_list.append(score_val)

                is_remedial_allowed = bool(isinstance(answers, dict) and answers.get('_remedial_allowed'))
                prev_score = answers.get('_previous_score') if isinstance(answers, dict) else None
                rem_score = answers.get('_remedial_score') if isinstance(answers, dict) else None
                highest_sc = answers.get('_highest_score') if isinstance(answers, dict) else None

                students_data.append({
                    "attempt_id": str(att.id),
                    "student_id": str(st.id),
                    "nisn": st.nisn or st.username or "-",
                    "student_name": st.full_name or st.username,
                    "classroom_id": st.classroom_id,
                    "classroom_name": st.classroom.name if getattr(st, 'classroom', None) else classroom_display_name,
                    "status": att.status,
                    "status_label": att.get_status_display(),
                    "total_score": score_val,
                    "correct_count": correct_count,
                    "total_questions": total_questions_count,
                    "has_essay": has_essay,
                    "is_essay_graded": is_essay_graded,
                    "has_ungraded_essay": has_ungraded_essay,
                    "essay_graded_count": essay_graded_count,
                    "total_essay_questions": len(essay_questions),
                    "violation_count": att.violation_count,
                    "is_remedial_allowed": is_remedial_allowed,
                    "previous_score": float(prev_score) if prev_score is not None else None,
                    "remedial_score": float(rem_score) if rem_score is not None else None,
                    "highest_score": float(highest_sc) if highest_sc is not None else None,
                    "started_at": att.started_at.isoformat() if att.started_at else None,
                    "finished_at": att.finished_at.isoformat() if att.finished_at else None,
                    "finished_date": timezone.localtime(att.finished_at).strftime("%d/%m/%Y") if att.finished_at else "-",
                    "finished_time": timezone.localtime(att.finished_at).strftime("%H:%M:%S") if att.finished_at else "-",
                })
            else:
                students_data.append({
                    "attempt_id": None,
                    "student_id": str(st.id),
                    "nisn": st.nisn or st.username or "-",
                    "student_name": st.full_name or st.username,
                    "classroom_id": st.classroom_id,
                    "classroom_name": st.classroom.name if getattr(st, 'classroom', None) else classroom_display_name,
                    "status": "NOT_STARTED",
                    "status_label": "Belum Masuk",
                    "total_score": None,
                    "correct_count": 0,
                    "total_questions": total_questions_count,
                    "has_essay": has_essay,
                    "is_essay_graded": not has_essay,
                    "has_ungraded_essay": False,
                    "essay_graded_count": 0,
                    "total_essay_questions": len(essay_questions),
                    "violation_count": 0,
                    "is_remedial_allowed": False,
                    "previous_score": None,
                    "remedial_score": None,
                    "highest_score": None,
                    "started_at": None,
                    "finished_at": None,
                })

        avg_score = round(sum(scores_list) / len(scores_list), 1) if scores_list else 0.0
        max_score = max(scores_list) if scores_list else 0.0
        min_score = min(scores_list) if scores_list else 0.0

        session_title = session.package.title if (session.package and hasattr(session.package, 'title')) else "Sesi Ujian"
        subject_name = session.package.subject_name if session.package else "-"
        exam_type = session.package.exam_type if session.package else "NATIVE_QUESTIONS"

        return Response({
            "success": True,
            "session_id": str(session.id),
            "session_title": session_title,
            "subject_name": subject_name,
            "classroom_display": classroom_display_name,
            "exam_type": exam_type,
            "total_questions": total_questions_count,
            "total_max_points": total_max_points,
            "has_essay": has_essay,
            "total_essay_questions": len(essay_questions),
            "statistics": {
                "total_students": len(students_data),
                "submitted_count": len(scores_list),
                "in_progress_count": len([s for s in students_data if s["status"] == "WORKING"]),
                "not_started_count": len([s for s in students_data if s["status"] == "NOT_STARTED"]),
                "average_score": avg_score,
                "highest_score": max_score,
                "lowest_score": min_score,
            },
            "students": students_data
        }, status=status.HTTP_200_OK)


class StudentAttemptDetailBreakdownView(APIView):
    """
    GET /api/exams/attempts/<uuid:attempt_id>/breakdown/
    Mengambil rincian lembar jawaban siswa per nomor butir soal (soal, jawaban siswa, kunci, status benar/salah, perolehan poin)
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, attempt_id):
        attempt = get_object_or_404(
            StudentAttempt.objects.select_related('session', 'session__package', 'student', 'student__classroom'),
            id=attempt_id
        )
        session = attempt.session
        package = session.package
        questions = Question.objects.filter(package=package).prefetch_related('options').order_by('order_number')

        answers = attempt.answers_json or {}
        essay_scores = attempt.essay_scores or {}

        items = []
        total_correct_count = 0
        total_incorrect_count = 0

        for q in questions:
            student_ans = answers.get(str(q.id)) or answers.get(f"q_{q.order_number}")
            q_points = q.points or 10

            status_item = "UNANSWERED"
            earned_points = 0.0
            student_display = "-"
            key_display = "-"
            options_data = []

            # 1. Pilihan Ganda Biasa
            if q.question_type == Question.QuestionTypeChoices.MULTIPLE_CHOICE:
                correct_opt = q.options.filter(is_correct=True).first()
                key_display = f"Opsi {correct_opt.option_label}. {correct_opt.option_text}" if correct_opt else "-"

                for opt in q.options.all():
                    is_chosen = False
                    if student_ans is not None:
                        raw_str = str(student_ans).strip()
                        if raw_str == str(opt.id) or raw_str.upper() == opt.option_label.strip().upper():
                            is_chosen = True
                            student_display = f"Opsi {opt.option_label}. {opt.option_text}"

                    opt_raw = opt.option_text or ''
                    opt_img = None
                    opt_clean_text = opt_raw
                    if opt_raw.startswith('[IMAGE:'):
                        end_i = opt_raw.find(']')
                        if end_i != -1:
                            opt_img = opt_raw[7:end_i].strip()
                            opt_clean_text = opt_raw[end_i + 1:].strip()

                    options_data.append({
                        "id": str(opt.id),
                        "label": opt.option_label,
                        "text": opt_clean_text,
                        "image_url": opt_img,
                        "imageUrl": opt_img,
                        "is_correct": opt.is_correct,
                        "is_chosen": is_chosen
                    })

                if student_ans is None or str(student_ans).strip() == "":
                    status_item = "UNANSWERED"
                    student_display = "(Tidak dijawab)"
                    total_incorrect_count += 1
                elif correct_opt and (str(student_ans).strip() == str(correct_opt.id) or str(student_ans).strip().upper() == correct_opt.option_label.strip().upper()):
                    status_item = "CORRECT"
                    earned_points = float(q_points)
                    total_correct_count += 1
                else:
                    status_item = "INCORRECT"
                    total_incorrect_count += 1

            # 2. Pilihan Ganda Kompleks
            elif q.question_type == Question.QuestionTypeChoices.MULTIPLE_CHOICE_COMPLEX:
                correct_opts = q.options.filter(is_correct=True)
                correct_labels = set(correct_opts.values_list('option_label', flat=True))
                key_display = ", ".join(sorted(correct_labels)) or "-"

                student_items = set()
                if isinstance(student_ans, list):
                    student_items = {str(x).strip().upper() for x in student_ans if x}
                elif isinstance(student_ans, str):
                    student_items = {str(x).strip().upper() for x in student_ans.replace(';', ',').split(',') if x.strip()}

                student_display = ", ".join(sorted(student_items)) if student_items else "(Tidak dijawab)"

                for opt in q.options.all():
                    is_chosen = opt.option_label.upper() in student_items or str(opt.id) in student_items
                    opt_raw = opt.option_text or ''
                    opt_img = None
                    opt_clean_text = opt_raw
                    if opt_raw.startswith('[IMAGE:'):
                        end_i = opt_raw.find(']')
                        if end_i != -1:
                            opt_img = opt_raw[7:end_i].strip()
                            opt_clean_text = opt_raw[end_i + 1:].strip()

                    options_data.append({
                        "id": str(opt.id),
                        "label": opt.option_label,
                        "text": opt_clean_text,
                        "image_url": opt_img,
                        "imageUrl": opt_img,
                        "is_correct": opt.is_correct,
                        "is_chosen": is_chosen
                    })

                if not student_items:
                    status_item = "UNANSWERED"
                    total_incorrect_count += 1
                elif student_items == correct_labels:
                    status_item = "CORRECT"
                    earned_points = float(q_points)
                    total_correct_count += 1
                elif student_items.issubset(correct_labels) and len(student_items) > 0:
                    status_item = "PARTIAL"
                    ratio = len(student_items) / len(correct_labels)
                    earned_points = round(float(q_points) * ratio, 2)
                    total_correct_count += 1
                else:
                    status_item = "INCORRECT"
                    total_incorrect_count += 1

            # 3. Isian Singkat
            elif q.question_type == Question.QuestionTypeChoices.SHORT_ANSWER:
                extra = q.extra_data or {}
                accepted = extra.get('exact_keys') or extra.get('accepted_answers') or extra.get('keys') or []
                if isinstance(accepted, str):
                    accepted = [x.strip() for x in accepted.split('/') if x.strip()]
                key_display = " / ".join(accepted) if accepted else "-"

                clean_ans = str(student_ans).strip().lower() if student_ans else ""
                student_display = str(student_ans) if student_ans else "(Tidak dijawab)"

                if not clean_ans:
                    status_item = "UNANSWERED"
                    total_incorrect_count += 1
                elif any(clean_ans == str(acc).strip().lower() for acc in accepted):
                    status_item = "CORRECT"
                    earned_points = float(q_points)
                    total_correct_count += 1
                else:
                    status_item = "INCORRECT"
                    total_incorrect_count += 1

            # 4. Matriks Benar / Salah
            elif q.question_type == Question.QuestionTypeChoices.TRUE_FALSE_MATRIX:
                extra = q.extra_data or {}
                rows = extra.get('rows', [])
                key_display = "; ".join([f"Brs {i+1}: {'Benar' if (r.get('correct') or r.get('is_correct')) else 'Salah'}" for i, r in enumerate(rows)])
                if isinstance(student_ans, dict) and student_ans:
                    student_display = "; ".join([f"Brs {int(k)+1}: {'Benar' if v else 'Salah'}" for k, v in student_ans.items()])
                    correct_sub = sum(1 for i, r in enumerate(rows) if student_ans.get(str(i)) == bool(r.get('correct') or r.get('is_correct')))
                    if correct_sub == len(rows):
                        status_item = "CORRECT"
                        earned_points = float(q_points)
                        total_correct_count += 1
                    elif correct_sub > 0:
                        status_item = "PARTIAL"
                        earned_points = round(float(q_points) * (correct_sub / len(rows)), 2)
                        total_correct_count += 1
                    else:
                        status_item = "INCORRECT"
                        total_incorrect_count += 1
                else:
                    status_item = "UNANSWERED"
                    student_display = "(Tidak dijawab)"
                    total_incorrect_count += 1

            # 5. Menjodohkan
            elif q.question_type == Question.QuestionTypeChoices.MATCHING_PAIR:
                extra = q.extra_data or {}
                pairs = extra.get('pairs', [])
                key_display = "; ".join([f"{p.get('left')} ➔ {p.get('right')}" for p in pairs])
                if isinstance(student_ans, dict) and student_ans:
                    student_display = "; ".join([f"{k} ➔ {v}" for k, v in student_ans.items() if v])
                    matched_sub = sum(1 for p in pairs if str(student_ans.get(p.get('left'), '')).strip().lower() == str(p.get('right', '')).strip().lower())
                    if matched_sub == len(pairs):
                        status_item = "CORRECT"
                        earned_points = float(q_points)
                        total_correct_count += 1
                    elif matched_sub > 0:
                        status_item = "PARTIAL"
                        earned_points = round(float(q_points) * (matched_sub / len(pairs)), 2)
                        total_correct_count += 1
                    else:
                        status_item = "INCORRECT"
                        total_incorrect_count += 1
                else:
                    status_item = "UNANSWERED"
                    student_display = "(Tidak dijawab)"
                    total_incorrect_count += 1

            # 6. Esai
            elif q.question_type == Question.QuestionTypeChoices.ESSAY:
                key_display = "(Rubrik Penilaian Esai Guru)"
                student_display = str(student_ans) if student_ans else "(Tidak ada jawaban tertulis)"
                e_info = essay_scores.get(str(q.id), {})
                if e_info and e_info.get('score') is not None:
                    status_item = "ESSAY_GRADED"
                    earned_points = float(e_info.get('score', 0))
                    if earned_points > 0:
                        total_correct_count += 1
                    else:
                        total_incorrect_count += 1
                else:
                    status_item = "ESSAY_PENDING"

            items.append({
                "question_id": str(q.id),
                "order_number": q.order_number,
                "question_text": q.question_text,
                "image_url": q.image_url,
                "imageUrl": q.image_url,
                "question_type": q.question_type,
                "points": q_points,
                "earned_points": earned_points,
                "status": status_item,
                "student_answer_display": student_display,
                "correct_answer_display": key_display,
                "options": options_data,
                "feedback": essay_scores.get(str(q.id), {}).get('feedback', '')
            })

        return Response({
            "success": True,
            "attempt_id": str(attempt.id),
            "student_name": attempt.student.full_name,
            "nisn": attempt.student.nisn,
            "classroom": attempt.student.classroom.name if getattr(attempt.student, 'classroom', None) else session.get_classrooms_display(),
            "session_title": session.package.title if session.package else "Sesi Ujian",
            "subject_name": package.subject_name if package else "-",
            "total_score": float(attempt.total_score) if attempt.total_score is not None else 0.0,
            "total_max_points": sum(q.points for q in questions),
            "total_correct": total_correct_count,
            "total_incorrect": total_incorrect_count,
            "total_questions": len(questions),
            "items": items
        }, status=status.HTTP_200_OK)


class ExportSessionResultsExcelView(APIView):
    """
    GET /api/exams/sessions/<uuid:session_id>/export-results-excel/
    Mengunduh berkas Excel (.xlsx) resmi rekapitulasi nilai dan analisis lembar jawaban per butir soal
    Mendukung parameter query ?classroom=... dan ?status=...
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, session_id):
        session = get_object_or_404(ExamSession.objects.select_related('package', 'classroom'), id=session_id)
        package = session.package
        questions = list(Question.objects.filter(package=package).prefetch_related('options').order_by('order_number')) if package else []

        classroom_param = request.query_params.get('classroom') or request.query_params.get('classroom_id')
        status_param = request.query_params.get('status')

        target_classroom = None
        if classroom_param and str(classroom_param).strip().upper() != 'ALL':
            from apps.accounts.models import ClassRoom
            if str(classroom_param).strip().isdigit():
                target_classroom = ClassRoom.objects.filter(id=int(classroom_param)).first()
            if not target_classroom:
                target_classroom = ClassRoom.objects.filter(name__iexact=str(classroom_param).strip()).first()

        if target_classroom:
            students_qs = list(User.objects.filter(classroom=target_classroom, role=User.RoleChoices.STUDENT).select_related('classroom').order_by('full_name'))
            attempts_qs = StudentAttempt.objects.filter(session=session, student__classroom=target_classroom).select_related('student', 'student__classroom')
            classroom_display_name = target_classroom.name
        else:
            if session.allow_all_classes:
                students_qs = list(User.objects.filter(role=User.RoleChoices.STUDENT).select_related('classroom').order_by('full_name'))
            elif hasattr(session, 'classrooms') and session.classrooms.exists():
                students_qs = list(User.objects.filter(classroom__in=session.classrooms.all(), role=User.RoleChoices.STUDENT).select_related('classroom').order_by('full_name'))
            elif session.classroom:
                students_qs = list(User.objects.filter(classroom=session.classroom, role=User.RoleChoices.STUDENT).select_related('classroom').order_by('full_name'))
            else:
                students_qs = list(User.objects.filter(role=User.RoleChoices.STUDENT).select_related('classroom').order_by('full_name'))
            attempts_qs = StudentAttempt.objects.filter(session=session).select_related('student', 'student__classroom')
            classroom_display_name = session.get_classrooms_display()

        attempts_by_student = {att.student_id: att for att in attempts_qs}

        enrolled_student_ids = set(s.id for s in students_qs)
        all_students = list(students_qs)
        for att in attempts_qs:
            if att.student_id not in enrolled_student_ids:
                all_students.append(att.student)
                enrolled_student_ids.add(att.student_id)

        all_students.sort(key=lambda s: (s.full_name or s.username or "").lower())

        students_data = []
        for st in all_students:
            att = attempts_by_student.get(st.id)
            if att:
                answers = att.answers_json or {}
                essay_scores = att.essay_scores or {}

                is_remedial_allowed = bool(isinstance(answers, dict) and answers.get('_remedial_allowed'))

                # SELF-HEALING / DATA CONSISTENCY RECOVERY:
                # Jika siswa sudah punya finished_at (sudah menyelesaikan ujian dan submit),
                # dan BUKAN dalam masa remidi aktif, maka status MUTLAK HARUS SUBMITTED!
                if att.finished_at is not None and not is_remedial_allowed and att.status != StudentAttempt.AttemptStatus.SUBMITTED:
                    att.status = StudentAttempt.AttemptStatus.SUBMITTED
                    att.save(update_fields=['status'])
                correct_count = 0
                for q in questions:
                    ans = answers.get(str(q.id)) or answers.get(f"q_{q.order_number}")
                    if ans is None:
                        continue
                    if q.question_type == Question.QuestionTypeChoices.MULTIPLE_CHOICE:
                        correct_opt = next((o for o in q.options.all() if o.is_correct), None)
                        if correct_opt and (str(ans).strip() == str(correct_opt.id) or str(ans).strip().upper() == correct_opt.option_label.strip().upper()):
                            correct_count += 1
                    elif q.question_type == Question.QuestionTypeChoices.MULTIPLE_CHOICE_COMPLEX:
                        correct_labels = set(q.options.filter(is_correct=True).values_list('option_label', flat=True))
                        student_items = set(str(x).strip().upper() for x in ans) if isinstance(ans, list) else set()
                        if student_items == correct_labels:
                            correct_count += 1
                    elif q.question_type == Question.QuestionTypeChoices.SHORT_ANSWER:
                        extra = q.extra_data or {}
                        accepted = extra.get('exact_keys') or extra.get('accepted_answers') or []
                        if isinstance(accepted, str):
                            accepted = [x.strip() for x in accepted.split('/') if x.strip()]
                        if any(str(ans).strip().lower() == str(acc).strip().lower() for acc in accepted):
                            correct_count += 1
                    elif q.question_type == Question.QuestionTypeChoices.TRUE_FALSE_MATRIX:
                        extra = q.extra_data or {}
                        rows = extra.get('rows', [])
                        if isinstance(ans, dict) and rows:
                            if sum(1 for i, r in enumerate(rows) if ans.get(str(i)) == bool(r.get('correct') or r.get('is_correct'))) == len(rows):
                                correct_count += 1
                    elif q.question_type == Question.QuestionTypeChoices.MATCHING_PAIR:
                        extra = q.extra_data or {}
                        pairs = extra.get('pairs', [])
                        if isinstance(ans, dict) and pairs:
                            if sum(1 for p in pairs if str(ans.get(p.get('left'), '')).strip().lower() == str(p.get('right', '')).strip().lower()) == len(pairs):
                                correct_count += 1
                    elif q.question_type == Question.QuestionTypeChoices.ESSAY:
                        e_info = essay_scores.get(str(q.id), {})
                        if e_info.get('score', 0) > 0:
                            correct_count += 1

                essay_questions = [q for q in questions if q.question_type == Question.QuestionTypeChoices.ESSAY]
                has_essay = len(essay_questions) > 0
                all_essays_graded = True
                if has_essay:
                    for eq in essay_questions:
                        eq_info = essay_scores.get(str(eq.id))
                        if not (isinstance(eq_info, dict) and eq_info.get('score') is not None):
                            all_essays_graded = False
                has_ungraded_essay = bool(has_essay and att.status == StudentAttempt.AttemptStatus.SUBMITTED and not all_essays_graded)

                score_val = float(att.total_score) if att.total_score is not None else (0.0 if att.status == StudentAttempt.AttemptStatus.SUBMITTED else None)
                students_data.append({
                    "student_id": st.id,
                    "nisn": st.nisn or st.username or "-",
                    "student_name": st.full_name or st.username,
                    "classroom_name": st.classroom.name if getattr(st, 'classroom', None) else classroom_display_name,
                    "status": att.status,
                    "total_score": score_val,
                    "has_ungraded_essay": has_ungraded_essay,
                    "correct_count": correct_count,
                    "violation_count": att.violation_count,
                    "finished_at": att.finished_at.isoformat() if att.finished_at else None,
                })
            else:
                students_data.append({
                    "student_id": st.id,
                    "nisn": st.nisn or st.username or "-",
                    "student_name": st.full_name or st.username,
                    "classroom_name": st.classroom.name if getattr(st, 'classroom', None) else classroom_display_name,
                    "status": "NOT_STARTED",
                    "total_score": None,
                    "has_ungraded_essay": False,
                    "correct_count": 0,
                    "violation_count": 0,
                })

        # Filter status jika diminta (contoh: SUBMITTED atau WORKING)
        if status_param and str(status_param).strip().upper() != 'ALL':
            st_filter = str(status_param).strip().upper()
            if st_filter == 'SUBMITTED':
                students_data = [s for s in students_data if s["status"] == "SUBMITTED"]
            elif st_filter in ['WORKING', 'IN_PROGRESS']:
                students_data = [s for s in students_data if s["status"] in ["WORKING", "LOCKED_VIOLATION"]]
            else:
                students_data = [s for s in students_data if s["status"] == st_filter]

        from .excel_results_generator import generate_session_results_excel
        excel_bytes = generate_session_results_excel(session, questions, students_data, attempts_by_student, classroom_display=classroom_display_name)

        cls_slug = classroom_display_name.replace(', ', '_').replace(' ', '_')
        subj_slug = (package.subject_name or 'Ujian').replace(' ', '_') if package else 'Ujian'
        status_slug = f"_{status_param}" if (status_param and str(status_param).strip().upper() != 'ALL') else ""
        filename = f"Rekap_Nilai_{cls_slug}_{subj_slug}{status_slug}.xlsx"

        response = HttpResponse(
            excel_bytes,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response



