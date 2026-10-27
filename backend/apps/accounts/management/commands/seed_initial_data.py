import uuid
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model
from apps.accounts.models import ClassRoom
from apps.exams.models import ExamPackage, Question, QuestionOption, ExamSession
from apps.proctoring.models import StudentAttempt, ViolationLog
from apps.ejournal.models import ExamJournal

User = get_user_model()

class Command(BaseCommand):
    help = "Seed initial data: Kelas, Akun Guru & Siswa, Paket Soal Hybrid, Sesi Ujian, dan E-Jurnal."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Memulai seeding data awal E-Ujian..."))

        # 1. Buat Kelas
        classroom, _ = ClassRoom.objects.get_or_create(
            name="X TKJ 1",
            defaults={"academic_year": "2026/2027"}
        )
        ClassRoom.objects.get_or_create(name="X RPL 1", defaults={"academic_year": "2026/2027"})
        ClassRoom.objects.get_or_create(name="XI TKJ 1", defaults={"academic_year": "2026/2027"})
        self.stdout.write(f"- Kelas: {classroom.name} (Tahun: {classroom.academic_year})")

        # 1b. Buat Akun Superuser Admin
        admin_user, _ = User.objects.get_or_create(
            username="admin",
            defaults={
                "full_name": "Administrator E-Ujian",
                "role": User.RoleChoices.TEACHER,
                "is_staff": True,
                "is_superuser": True
            }
        )
        admin_user.set_password("admin123")
        admin_user.is_staff = True
        admin_user.is_superuser = True
        admin_user.save()
        self.stdout.write(f"- Admin Superuser: admin (password: admin123)")

        # 2. Buat Akun Guru
        teacher, _ = User.objects.get_or_create(
            username="guru",
            defaults={
                "full_name": "Drs. Budi Santoso, M.Kom",
                "role": User.RoleChoices.TEACHER,
                "is_staff": True,
            }
        )
        teacher.set_password("guru123")
        teacher.is_staff = True
        teacher.save()

        teacher01, _ = User.objects.get_or_create(
            username="guru01",
            defaults={
                "full_name": "Drs. Budi Santoso, M.Kom",
                "role": User.RoleChoices.TEACHER,
                "is_staff": True,
            }
        )
        teacher01.set_password("guru123")
        teacher01.is_staff = True
        teacher01.save()
        self.stdout.write(f"- Guru: {teacher.full_name} (username: guru / password: guru123)")

        # 3. Buat Akun Siswa
        students_data = [
            ("siswa", "Ahmad Fadhil Ramadhan"),
            ("siswa01", "Ahmad Fadhil Ramadhan"),
            ("siswa02", "Bilqis Nur Azizah"),
            ("siswa03", "Chandra Dwi Prasetyo"),
        ]
        created_students = []
        for username, full_name in students_data:
            student, _ = User.objects.get_or_create(
                username=username,
                defaults={
                    "full_name": full_name,
                    "role": User.RoleChoices.STUDENT,
                    "classroom": classroom,
                }
            )
            student.classroom = classroom
            student.set_password("siswa123")
            student.save()
            created_students.append(student)
            self.stdout.write(f"- Siswa: {student.full_name} (username: {student.username} / password: siswa123)")

        # 4. Buat Paket Soal Mandiri (Native)
        pkg_native, created = ExamPackage.objects.get_or_create(
            title="Asesmen Sumatif: Protokol VoIP & Jaringan Nirkabel",
            defaults={
                "teacher": teacher,
                "subject_name": "Teknologi Layanan Jaringan",
                "exam_type": ExamPackage.ExamTypeChoices.NATIVE_QUESTIONS,
            }
        )

        if not pkg_native.questions.exists():
            # Pertanyaan 1
            q1 = Question.objects.create(
                package=pkg_native,
                question_text="Protokol VoIP yang berfungsi untuk menginisiasi, memodifikasi, dan mengakhiri sesi komunikasi multimedia secara real-time adalah...",
                question_type=Question.QuestionTypeChoices.MULTIPLE_CHOICE,
                points=20,
                order_number=1
            )
            QuestionOption.objects.bulk_create([
                QuestionOption(question=q1, option_label='A', option_text='H.323', is_correct=False),
                QuestionOption(question=q1, option_label='B', option_text='SIP (Session Initiation Protocol)', is_correct=True),
                QuestionOption(question=q1, option_label='C', option_text='RTP (Real-time Transport Protocol)', is_correct=False),
                QuestionOption(question=q1, option_label='D', option_text='RTCP (Real-time Transport Control Protocol)', is_correct=False),
                QuestionOption(question=q1, option_label='E', option_text='MGCP (Media Gateway Control Protocol)', is_correct=False),
            ])

            # Pertanyaan 2
            q2 = Question.objects.create(
                package=pkg_native,
                question_text="Komponen arsitektur jaringan VoIP yang bertindak sebagai jembatan antara jaringan IP dengan jaringan telepon analog (PSTN) adalah...",
                question_type=Question.QuestionTypeChoices.MULTIPLE_CHOICE,
                points=20,
                order_number=2
            )
            QuestionOption.objects.bulk_create([
                QuestionOption(question=q2, option_label='A', option_text='Call Server', is_correct=False),
                QuestionOption(question=q2, option_label='B', option_text='IP Phone', is_correct=False),
                QuestionOption(question=q2, option_label='C', option_text='Media Gateway', is_correct=True),
                QuestionOption(question=q2, option_label='D', option_text='Softswitch Class 5', is_correct=False),
                QuestionOption(question=q2, option_label='E', option_text='Proxy Server', is_correct=False),
            ])

            # Pertanyaan 3
            q3 = Question.objects.create(
                package=pkg_native,
                question_text="Port default UDP yang secara standar digunakan oleh Session Initiation Protocol (SIP) untuk transmisi data kontrol sesi adalah...",
                question_type=Question.QuestionTypeChoices.MULTIPLE_CHOICE,
                points=20,
                order_number=3
            )
            QuestionOption.objects.bulk_create([
                QuestionOption(question=q3, option_label='A', option_text='Port 5060', is_correct=True),
                QuestionOption(question=q3, option_label='B', option_text='Port 8080', is_correct=False),
                QuestionOption(question=q3, option_label='C', option_text='Port 21', is_correct=False),
                QuestionOption(question=q3, option_label='D', option_text='Port 443', is_correct=False),
                QuestionOption(question=q3, option_label='E', option_text='Port 23', is_correct=False),
            ])

            # Pertanyaan 4
            q4 = Question.objects.create(
                package=pkg_native,
                question_text="Metode pengkodean suara analog menjadi bit stream digital terkompresi pada teknologi transmisi suara VoIP dikenal dengan istilah...",
                question_type=Question.QuestionTypeChoices.MULTIPLE_CHOICE,
                points=20,
                order_number=4
            )
            QuestionOption.objects.bulk_create([
                QuestionOption(question=q4, option_label='A', option_text='Bandwidth Shaping', is_correct=False),
                QuestionOption(question=q4, option_label='B', option_text='Voice Codec (Coder-Decoder)', is_correct=True),
                QuestionOption(question=q4, option_label='C', option_text='Packet Switching', is_correct=False),
                QuestionOption(question=q4, option_label='D', option_text='Jitter Buffer', is_correct=False),
                QuestionOption(question=q4, option_label='E', option_text='Echo Cancellation', is_correct=False),
            ])

            # Pertanyaan 5
            q5 = Question.objects.create(
                package=pkg_native,
                question_text="Parameter kualitas layanan (QoS) VoIP yang mengukur variasi jeda kedatangan antar-paket data suara pada titik penerima adalah...",
                question_type=Question.QuestionTypeChoices.MULTIPLE_CHOICE,
                points=20,
                order_number=5
            )
            QuestionOption.objects.bulk_create([
                QuestionOption(question=q5, option_label='A', option_text='Throughput', is_correct=False),
                QuestionOption(question=q5, option_label='B', option_text='Latency / Delay', is_correct=False),
                QuestionOption(question=q5, option_label='C', option_text='Jitter', is_correct=True),
                QuestionOption(question=q5, option_label='D', option_text='Packet Loss', is_correct=False),
                QuestionOption(question=q5, option_label='E', option_text='Bandwidth Rate', is_correct=False),
            ])

            # Pertanyaan 6 (Esai)
            Question.objects.create(
                package=pkg_native,
                question_text="Jelaskan perbedaan mendasar antara protokol SIP dan RTP dalam penyelenggaraan panggilan suara VoIP!",
                question_type=Question.QuestionTypeChoices.ESSAY,
                points=20,
                order_number=6
            )
            self.stdout.write(f"- Paket Soal Mandiri: {pkg_native.title} (6 Soal Dibuat)")

        # 5. Buat Paket Soal Link Eksternal Google Form
        pkg_external, created = ExamPackage.objects.get_or_create(
            title="Penilaian Praktik Google Form: Pengkabelan Jaringan",
            defaults={
                "teacher": teacher,
                "subject_name": "Komputer dan Jaringan Dasar",
                "exam_type": ExamPackage.ExamTypeChoices.EXTERNAL_LINK,
                "external_url": "https://docs.google.com/forms/d/e/1FAIpQLScP_mockGoogleFormExamLink2026/viewform?embedded=true",
            }
        )
        self.stdout.write(f"- Paket Soal Eksternal: {pkg_external.title} ({pkg_external.external_url})")

        # 6. Buat Sesi Ujian Aktif
        now = timezone.now()
        session, created = ExamSession.objects.get_or_create(
            package=pkg_native,
            classroom=classroom,
            defaults={
                "start_time": now,
                "end_time": now + timedelta(minutes=90),
                "duration_minutes": 60,
                "entry_password": "12345",
                "exit_password": "54321",
                "strict_lockdown": True,
                "is_active": True,
            }
        )
        self.stdout.write(f"- Sesi Ujian Aktif: {session.package.subject_name} (Password Masuk: {session.entry_password} / Keluar: {session.exit_password})")

        # 7. Buat Attempt Siswa Awal
        # Siswa 1: WORKING
        attempt1, _ = StudentAttempt.objects.get_or_create(
            session=session,
            student=created_students[0],
            defaults={
                "status": StudentAttempt.AttemptStatus.WORKING,
                "screen_orientation": StudentAttempt.ScreenOrientationChoices.PORTRAIT,
                "violation_count": 0,
            }
        )

        # Siswa 2: LOCKED_VIOLATION
        attempt2, _ = StudentAttempt.objects.get_or_create(
            session=session,
            student=created_students[1],
            defaults={
                "status": StudentAttempt.AttemptStatus.LOCKED_VIOLATION,
                "screen_orientation": StudentAttempt.ScreenOrientationChoices.LANDSCAPE,
                "violation_count": 1,
            }
        )
        if not attempt2.violations.exists():
            ViolationLog.objects.create(
                attempt=attempt2,
                violation_type=ViolationLog.ViolationTypeChoices.TAB_SWITCH,
                description="Siswa terdeteksi berpindah tab browser (Page Visibility Hidden)",
            )

        # Siswa 3: SUBMITTED
        attempt3, _ = StudentAttempt.objects.get_or_create(
            session=session,
            student=created_students[2],
            defaults={
                "status": StudentAttempt.AttemptStatus.SUBMITTED,
                "screen_orientation": StudentAttempt.ScreenOrientationChoices.PORTRAIT,
                "total_score": 85.00,
                "violation_count": 0,
                "finished_at": now,
            }
        )

        # 8. Buat E-Jurnal Sesi
        ExamJournal.objects.get_or_create(
            session=session,
            defaults={
                "teacher": teacher,
                "total_students_scheduled": 3,
                "total_students_present": 3,
                "total_students_absent": 0,
                "total_violations_recorded": 1,
                "supervisor_notes": "Ujian berlangsung tertib. Satu peserta sempat terkunci karena berpindah tab, telah ditegur oleh pengawas.",
            }
        )
        self.stdout.write(self.style.SUCCESS("[OK] Seluruh data awal berhasil di-seed ke database!"))
