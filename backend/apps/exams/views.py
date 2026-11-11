import os
import uuid
import random
from io import BytesIO
from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser

from .models import ExamPackage, ExamSession, Question, QuestionOption
from .serializers import ExamPackageSerializer, ExamSessionSerializer
from .services import calculate_auto_grading_score
from .parsers import parse_docx_questions, parse_excel_questions, generate_question_excel_template
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
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, session_id):
        session = get_object_or_404(ExamSession, id=session_id)
        
        # Ambil soal-soal bertipe ESSAY pada paket sesi
        essay_questions = Question.objects.filter(
            package=session.package,
            question_type=Question.QuestionTypeChoices.ESSAY
        ).order_by('order_number')

        questions_data = [
            {
                "id": str(q.id),
                "order_number": q.order_number,
                "text": q.question_text,
                "image_url": q.image_url.url if q.image_url else None,
                "points": q.points
            }
            for q in essay_questions
        ]

        # Ambil seluruh attempt siswa pada sesi ini
        attempts = StudentAttempt.objects.filter(session=session).select_related('student').order_by('student__full_name')

        submissions = []
        for att in attempts:
            answers = att.answers_json or {}
            essay_scores = att.essay_scores or {}

            student_essay_data = []
            for q in essay_questions:
                q_id_str = str(q.id)
                # Siswa mungkin menyimpan jawaban dengan ID atau q_{order_number}
                student_answer_text = answers.get(q_id_str) or answers.get(f"q_{q.order_number}") or ""
                grading_info = essay_scores.get(q_id_str, {})

                student_essay_data.append({
                    "question_id": q_id_str,
                    "order_number": q.order_number,
                    "student_answer": student_answer_text,
                    "max_points": q.points,
                    "score": grading_info.get('score'),
                    "feedback": grading_info.get('feedback', ''),
                    "graded_at": grading_info.get('graded_at'),
                    "is_graded": grading_info.get('score') is not None
                })

            submissions.append({
                "attempt_id": str(att.id),
                "student_id": att.student.id,
                "student_name": att.student.full_name,
                "nisn": att.student.nisn,
                "classroom": att.student.classroom.name if getattr(att.student, 'classroom', None) else session.classroom.name,
                "status": att.status,
                "status_label": att.get_status_display(),
                "total_score": float(att.total_score) if att.total_score is not None else 0.0,
                "answers": student_essay_data
            })

        return Response({
            "success": True,
            "session_id": str(session.id),
            "session_title": session.title,
            "subject_name": session.package.subject_name,
            "classroom": session.classroom.name,
            "total_essay_questions": len(questions_data),
            "essay_questions": questions_data,
            "submissions": submissions
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
        question_id = request.data.get('question_id')
        raw_score = request.data.get('score')
        feedback = request.data.get('feedback', '').strip()

        if not attempt_id or not question_id or raw_score is None:
            return Response(
                {"error": "Parameter attempt_id, question_id, dan score wajib disertakan."},
                status=status.HTTP_400_BAD_REQUEST
            )

        attempt = get_object_or_404(StudentAttempt, id=attempt_id, session=session)
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



