from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from apps.accounts.models import User, ClassRoom
from apps.exams.models import ExamPackage, Question, QuestionOption, ExamSession
from apps.proctoring.models import StudentAttempt, ViolationLog
from apps.ejournal.models import ExamJournal

class ProctoringAndAntiCheatE2ETests(APITestCase):
    """
    Automated Test Suite Lengkap Skenario Asesmen Anti-Cheat & E-Jurnal
    Menguji 6 Skenario Kunci sesuai Master PRD:
    1. Pembuatan Paket Soal Mandiri & Paket Link Google Form (Auto-Embed Validation)
    2. Siswa Validasi Entry Password (Tolak Password Salah & Buka Attempt)
    3. Deteksi Sensor Pelanggaran TAB_SWITCH & EXIT_FULLSCREEN (Lockdown Freeze)
    4. Guru Unlock Layar Siswa (Pemulihan Status & Timestamp Unlock)
    5. Pengumpulan Jawaban, Auto-Grading Poin Sempurna, & Verifikasi Exit Password
    6. E-Jurnal Detail, Ekspor Dokumen Resmi PDF ReportLab & Excel OpenPyXL
    """

    def setUp(self):
        # 1. Inisialisasi Kelas
        self.classroom = ClassRoom.objects.create(
            name="X TKJ 1",
            academic_year="2026/2027"
        )

        # 2. Inisialisasi Akun Guru
        self.teacher = User.objects.create_user(
            username="guru_test",
            password="password123",
            full_name="Drs. Budi Santoso, M.Kom",
            role="TEACHER"
        )

        # 3. Inisialisasi Akun Siswa 1 & 2
        self.student = User.objects.create_user(
            username="0067829101",
            password="password123",
            full_name="Ahmad Fadhil Ramadhan",
            role="STUDENT",
            classroom=self.classroom
        )
        self.student2 = User.objects.create_user(
            username="0067829102",
            password="password123",
            full_name="Bilqis Nur Azizah",
            role="STUDENT",
            classroom=self.classroom
        )

        # Token JWT Guru & Siswa
        res_login_teacher = self.client.post('/api/auth/login/', {
            'username': 'guru_test',
            'password': 'password123'
        })
        self.assertEqual(res_login_teacher.status_code, status.HTTP_200_OK)
        self.teacher_token = res_login_teacher.data['access']

        res_login_student = self.client.post('/api/auth/login/', {
            'username': '0067829101',
            'password': 'password123'
        })
        self.assertEqual(res_login_student.status_code, status.HTTP_200_OK)
        self.student_token = res_login_student.data['access']

    def test_scenario_1_teacher_create_native_and_google_form_packages(self):
        """
        Skenario 1:
        Guru berhasil membuat Paket Soal Mandiri dan Paket Soal Link Google Form.
        Pastikan tautan Google Form otomatis memiliki parameter /viewform?embedded=true.
        """
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher_token}')

        # A. Paket Soal Mandiri (Native Questions)
        native_payload = {
            'title': 'Ulangan Harian 1: Jaringan Dasar',
            'subject_name': 'Komputer dan Jaringan Dasar',
            'exam_type': 'NATIVE_QUESTIONS',
            'questions': [
                {
                    'question_type': 'MULTIPLE_CHOICE',
                    'question_text': 'Topologi jaringan yang setiap nodenya terhubung ke satu titik konsentrator (switch/hub) adalah...',
                    'points': 50,
                    'order_number': 1,
                    'options': [
                        {'option_label': 'A', 'option_text': 'Bus', 'is_correct': False},
                        {'option_label': 'B', 'option_text': 'Star', 'is_correct': True},
                        {'option_label': 'C', 'option_text': 'Ring', 'is_correct': False},
                        {'option_label': 'D', 'option_text': 'Mesh', 'is_correct': False},
                    ]
                },
                {
                    'question_type': 'MULTIPLE_CHOICE',
                    'question_text': 'Kabel UTP kategori 5e standar memiliki kecepatan transfer data maksimal hingga...',
                    'points': 50,
                    'order_number': 2,
                    'options': [
                        {'option_label': 'A', 'option_text': '10 Mbps', 'is_correct': False},
                        {'option_label': 'B', 'option_text': '100 Mbps', 'is_correct': False},
                        {'option_label': 'C', 'option_text': '1000 Mbps (1 Gbps)', 'is_correct': True},
                        {'option_label': 'D', 'option_text': '10 Gbps', 'is_correct': False},
                    ]
                }
            ]
        }
        res_native = self.client.post('/api/exams/packages/', native_payload, format='json')
        self.assertEqual(res_native.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_native.data['exam_type'], 'NATIVE_QUESTIONS')
        self.assertEqual(len(res_native.data['questions']), 2)

        # B. Paket Soal Link Google Form (External Embed Auto-Sanitize)
        raw_google_form_url = 'https://docs.google.com/forms/d/e/1FAIpQLScP_testRawUrl123/viewform'
        gform_payload = {
            'title': 'Penilaian Akhir Semester GForm KJD',
            'subject_name': 'Komputer dan Jaringan Dasar',
            'exam_type': 'EXTERNAL_LINK',
            'external_url': raw_google_form_url,
            'questions': []
        }
        res_gform = self.client.post('/api/exams/packages/', gform_payload, format='json')
        self.assertEqual(res_gform.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res_gform.data['exam_type'], 'EXTERNAL_LINK')
        
        # Validasi bahwa URL Google Form otomatis mengandung ?embedded=true
        self.assertIn('embedded=true', res_gform.data['external_url'])
        self.assertTrue(res_gform.data['external_url'].endswith('/viewform?embedded=true'))

    def test_scenario_2_student_entry_password_validation_and_start_attempt(self):
        """
        Skenario 2:
        Siswa memvalidasi entry_password:
        - Password salah harus ditolak (HTTP 400).
        - Password benar diterima (HTTP 200).
        - Siswa berhasil memulai StudentAttempt dengan orientasi layar yang dipilih.
        """
        # Guru membuat paket dan sesi
        package = ExamPackage.objects.create(
            teacher=self.teacher,
            title="Asesmen Mandiri Siklus 1",
            subject_name="Teknologi Layanan Jaringan",
            exam_type="NATIVE_QUESTIONS"
        )
        now = timezone.now()
        session = ExamSession.objects.create(
            package=package,
            classroom=self.classroom,
            start_time=now,
            end_time=now + timezone.timedelta(minutes=60),
            duration_minutes=60,
            entry_password="MASUKPIN123",
            exit_password="KELUARPIN123"
        )

        # Siswa mengakses endpoint verifikasi
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.student_token}')

        # 1. Coba Password Masuk yang SALAH
        res_wrong_entry = self.client.post(f'/api/exams/sessions/{session.id}/verify-entry/', {
            'entry_password': 'PIN_SALAH'
        })
        self.assertEqual(res_wrong_entry.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(res_wrong_entry.data['success'])

        # 2. Masukkan Password Masuk yang BENAR
        res_correct_entry = self.client.post(f'/api/exams/sessions/{session.id}/verify-entry/', {
            'entry_password': 'MASUKPIN123'
        })
        self.assertEqual(res_correct_entry.status_code, status.HTTP_200_OK)
        self.assertTrue(res_correct_entry.data['success'])

        # 3. Siswa memulai pengerjaan (Start Attempt)
        res_start = self.client.post(f'/api/exams/sessions/{session.id}/start/', {
            'screen_orientation': 'PORTRAIT'
        })
        self.assertEqual(res_start.status_code, status.HTTP_200_OK)
        self.assertTrue(res_start.data['success'])
        self.assertEqual(res_start.data['status'], 'WORKING')
        self.assertEqual(res_start.data['screen_orientation'], 'PORTRAIT')

        # Verifikasi record di database
        attempt = StudentAttempt.objects.get(id=res_start.data['attempt_id'])
        self.assertEqual(attempt.student, self.student)
        self.assertEqual(attempt.status, StudentAttempt.AttemptStatus.WORKING)
        self.assertEqual(attempt.violation_count, 0)

    def test_scenario_3_anti_cheat_violation_detection_and_lockdown(self):
        """
        Skenario 3:
        Siswa terdeteksi melakukan pelanggaran:
        - Pelanggaran 1: TAB_SWITCH -> status menjadi LOCKED_VIOLATION, violation_count=1, dibuat record ViolationLog.
        - Pelanggaran 2: EXIT_FULLSCREEN -> violation_count=2, total 2 records di ViolationLog.
        """
        package = ExamPackage.objects.create(
            teacher=self.teacher,
            title="Ujian Sertifikasi",
            subject_name="Administrasi Sistem Jaringan"
        )
        now = timezone.now()
        session = ExamSession.objects.create(
            package=package,
            classroom=self.classroom,
            start_time=now,
            end_time=now + timezone.timedelta(minutes=60),
            entry_password="PASS1",
            exit_password="PASS2"
        )
        attempt = StudentAttempt.objects.create(
            session=session,
            student=self.student,
            status=StudentAttempt.AttemptStatus.WORKING,
            violation_count=0
        )

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.student_token}')

        # Pelanggaran 1: TAB_SWITCH
        res_viol1 = self.client.post(f'/api/proctoring/attempts/{attempt.id}/report-violation/', {
            'violation_type': 'TAB_SWITCH',
            'description': 'Siswa berpindah ke tab Google / ChatGPT'
        })
        self.assertEqual(res_viol1.status_code, status.HTTP_200_OK)
        self.assertEqual(res_viol1.data['status'], 'LOCKED_VIOLATION')
        self.assertEqual(res_viol1.data['violation_count'], 1)

        attempt.refresh_from_db()
        self.assertEqual(attempt.status, StudentAttempt.AttemptStatus.LOCKED_VIOLATION)
        self.assertEqual(attempt.violation_count, 1)
        self.assertEqual(ViolationLog.objects.filter(attempt=attempt).count(), 1)

        # Pelanggaran 2: EXIT_FULLSCREEN
        res_viol2 = self.client.post(f'/api/proctoring/attempts/{attempt.id}/report-violation/', {
            'violation_type': 'EXIT_FULLSCREEN',
            'description': 'Siswa menekan tombol ESC dan keluar dari mode layar penuh'
        })
        self.assertEqual(res_viol2.status_code, status.HTTP_200_OK)
        self.assertEqual(res_viol2.data['violation_count'], 2)

        attempt.refresh_from_db()
        self.assertEqual(attempt.violation_count, 2)
        self.assertEqual(ViolationLog.objects.filter(attempt=attempt).count(), 2)

    def test_scenario_4_teacher_unlock_student_attempt(self):
        """
        Skenario 4:
        Guru melakukan unlock terhadap siswa yang terkunci:
        - Status kembali menjadi WORKING.
        - Field unlocked_by_teacher_at pada ViolationLog terisi (tidak null).
        """
        package = ExamPackage.objects.create(
            teacher=self.teacher,
            title="Paket ASJ",
            subject_name="ASJ"
        )
        now = timezone.now()
        session = ExamSession.objects.create(
            package=package,
            classroom=self.classroom,
            start_time=now,
            end_time=now + timezone.timedelta(minutes=60),
            entry_password="PASS",
            exit_password="PASS"
        )
        attempt = StudentAttempt.objects.create(
            session=session,
            student=self.student,
            status=StudentAttempt.AttemptStatus.LOCKED_VIOLATION,
            violation_count=1
        )
        log = ViolationLog.objects.create(
            attempt=attempt,
            violation_type='TAB_SWITCH',
            description='Terdeteksi meminimalkan jendela browser'
        )
        self.assertIsNone(log.unlocked_by_teacher_at)

        # Guru membuka kunci siswa
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher_token}')
        res_unlock = self.client.post(f'/api/proctoring/attempts/{attempt.id}/unlock/', {
            'supervisor_pin': '12345'
        })
        self.assertEqual(res_unlock.status_code, status.HTTP_200_OK)
        self.assertTrue(res_unlock.data['success'])
        self.assertEqual(res_unlock.data['status'], 'WORKING')

        attempt.refresh_from_db()
        log.refresh_from_db()
        self.assertEqual(attempt.status, StudentAttempt.AttemptStatus.WORKING)
        self.assertIsNotNone(log.unlocked_by_teacher_at)

    def test_scenario_5_auto_grading_submission_and_exit_password_verification(self):
        """
        Skenario 5:
        Siswa menyelesaikan ujian:
        - Auto-grading menghitung nilai PG dengan tepat (100.0).
        - Siswa mencoba keluar dengan password salah (HTTP 400).
        - Siswa keluar menggunakan exit_password yang benar (HTTP 200, status SUBMITTED).
        """
        package = ExamPackage.objects.create(
            teacher=self.teacher,
            title="Paket Pemrograman Web",
            subject_name="Pemrograman Web",
            exam_type="NATIVE_QUESTIONS"
        )
        q1 = Question.objects.create(
            package=package,
            question_text="Tag HTML5 untuk menyematkan audio adalah...",
            points=50,
            order_number=1
        )
        QuestionOption.objects.create(question=q1, option_label='A', option_text='<sound>', is_correct=False)
        QuestionOption.objects.create(question=q1, option_label='B', option_text='<audio>', is_correct=True)

        q2 = Question.objects.create(
            package=package,
            question_text="Atribut HTML untuk menampilkan form di dalam iframe tanpa header eksternal adalah...",
            points=50,
            order_number=2
        )
        QuestionOption.objects.create(question=q2, option_label='A', option_text='embedded=true', is_correct=True)
        QuestionOption.objects.create(question=q2, option_label='B', option_text='target=_blank', is_correct=False)

        now = timezone.now()
        session = ExamSession.objects.create(
            package=package,
            classroom=self.classroom,
            start_time=now,
            end_time=now + timezone.timedelta(minutes=60),
            entry_password="MASUK",
            exit_password="KELUARRESMI123"
        )
        attempt = StudentAttempt.objects.create(
            session=session,
            student=self.student,
            status=StudentAttempt.AttemptStatus.WORKING
        )

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.student_token}')

        # 1. Siswa mengirimkan jawaban benar untuk kedua butir soal
        student_answers = {
            str(q1.id): 'B',
            str(q2.id): 'A'
        }
        res_submit = self.client.post(f'/api/exams/sessions/{session.id}/submit/', {
            'answers_json': student_answers
        }, format='json')
        self.assertEqual(res_submit.status_code, status.HTTP_200_OK)
        self.assertEqual(res_submit.data['total_score'], 100.0)

        attempt.refresh_from_db()
        self.assertEqual(float(attempt.total_score), 100.0)

        # 2. Coba Password Keluar yang SALAH
        res_wrong_exit = self.client.post(f'/api/exams/sessions/{session.id}/verify-exit/', {
            'exit_password': 'KELUAR_SALAH'
        })
        self.assertEqual(res_wrong_exit.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(res_wrong_exit.data['success'])

        # 3. Masukkan Password Keluar yang BENAR
        res_correct_exit = self.client.post(f'/api/exams/sessions/{session.id}/verify-exit/', {
            'exit_password': 'KELUARRESMI123'
        })
        self.assertEqual(res_correct_exit.status_code, status.HTTP_200_OK)
        self.assertTrue(res_correct_exit.data['success'])
        self.assertEqual(res_correct_exit.data['status'], 'SUBMITTED')

        attempt.refresh_from_db()
        self.assertEqual(attempt.status, StudentAttempt.AttemptStatus.SUBMITTED)
        self.assertIsNotNone(attempt.finished_at)

    def test_scenario_6_ejournal_detail_and_pdf_excel_exports(self):
        """
        Skenario 6:
        Endpoint E-Jurnal:
        - Mengembalikan rekapitulasi data kehadiran, nilai rata-rata, dan pelanggaran (200 OK).
        - Update supervisor notes berhasil disimpan (200 OK).
        - Ekspor PDF menghasilkan file resmi application/pdf (200 OK).
        - Ekspor Excel menghasilkan file resmi openxmlformats (200 OK).
        """
        package = ExamPackage.objects.create(
            teacher=self.teacher,
            title="Paket Basis Data",
            subject_name="Basis Data"
        )
        now = timezone.now()
        session = ExamSession.objects.create(
            package=package,
            classroom=self.classroom,
            start_time=now,
            end_time=now + timezone.timedelta(minutes=90),
            entry_password="IN",
            exit_password="OUT"
        )
        attempt1 = StudentAttempt.objects.create(
            session=session,
            student=self.student,
            status=StudentAttempt.AttemptStatus.SUBMITTED,
            total_score=90.0,
            violation_count=0
        )
        attempt2 = StudentAttempt.objects.create(
            session=session,
            student=self.student2,
            status=StudentAttempt.AttemptStatus.WORKING,
            total_score=80.0,
            violation_count=1
        )
        ViolationLog.objects.create(
            attempt=attempt2,
            violation_type='TAB_SWITCH',
            description='Membuka jendela lain'
        )

        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.teacher_token}')

        # 1. Detail E-Jurnal
        res_journal = self.client.get(f'/api/ejournal/sessions/{session.id}/')
        self.assertEqual(res_journal.status_code, status.HTTP_200_OK)
        self.assertEqual(res_journal.data['total_students_present'], 2)
        self.assertEqual(res_journal.data['total_violations_recorded'], 1)
        self.assertEqual(res_journal.data['average_score'], 85.0)

        # 2. Update Catatan Pengawas (PATCH)
        res_patch = self.client.patch(f'/api/ejournal/sessions/{session.id}/', {
            'supervisor_notes': 'Ujian berlangsung lancar dengan pengawasan ketat sensor anti-cheat.'
        })
        self.assertEqual(res_patch.status_code, status.HTTP_200_OK)
        self.assertIn('berlangsung lancar', res_patch.data['supervisor_notes'])

        # 3. Export PDF
        res_pdf = self.client.get(f'/api/ejournal/sessions/{session.id}/export-pdf/')
        self.assertEqual(res_pdf.status_code, status.HTTP_200_OK)
        self.assertEqual(res_pdf['Content-Type'], 'application/pdf')
        self.assertTrue(res_pdf.content.startswith(b'%PDF'))
        self.assertGreater(len(res_pdf.content), 1000)

        # 4. Export Excel
        res_excel = self.client.get(f'/api/ejournal/sessions/{session.id}/export-excel/')
        self.assertEqual(res_excel.status_code, status.HTTP_200_OK)
        self.assertIn('spreadsheetml', res_excel['Content-Type'])
        self.assertGreater(len(res_excel.content), 1000)
