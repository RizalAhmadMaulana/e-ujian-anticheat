import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from apps.accounts.models import User
from apps.exams.models import ExamPackage, ExamSession
from apps.proctoring.models import StudentAttempt, ViolationLog
from apps.ejournal.models import ExamJournal

def test_full_cycle():
    print("=" * 65)
    print("RUNNING END-TO-END FULLSTACK INTEGRATION TEST (TAHAP 3)")
    print("=" * 65)

    client_teacher = APIClient()
    client_student = APIClient()

    # Step 1: Login Guru
    res_guru = client_teacher.post('/api/auth/login/', {'username': 'guru01', 'password': 'guru123'})
    assert res_guru.status_code == 200, f"Login guru failed: {res_guru.data}"
    t_token = res_guru.data['access']
    client_teacher.credentials(HTTP_AUTHORIZATION=f'Bearer {t_token}')
    print("[1] Teacher Login: OK (guru01 - Drs. Budi Santoso)")

    # Step 2: Login Siswa
    res_siswa = client_student.post('/api/auth/login/', {'username': 'siswa01', 'password': 'siswa123'})
    assert res_siswa.status_code == 200, f"Login siswa failed: {res_siswa.data}"
    s_token = res_siswa.data['access']
    client_student.credentials(HTTP_AUTHORIZATION=f'Bearer {s_token}')
    print("[2] Student Login: OK (siswa01 - Ahmad Fadhil Ramadhan)")

    # Step 3: Teacher creates a new Exam Package
    res_pkg = client_teacher.post('/api/exams/packages/', {
        'title': 'Ulangan Harian E2E: Keamanan Jaringan',
        'subject_name': 'Keamanan Jaringan & Sistem',
        'exam_type': 'NATIVE_QUESTIONS',
        'questions': [
            {
                'question_type': 'MULTIPLE_CHOICE',
                'question_text': 'Serangan jaringan yang membanjiri target dengan lalu lintas palsu disebut...',
                'points': 50,
                'order_number': 1,
                'options': [
                    {'option_label': 'A', 'option_text': 'Phishing', 'is_correct': False},
                    {'option_label': 'B', 'option_text': 'DDoS Attack', 'is_correct': True},
                    {'option_label': 'C', 'option_text': 'SQL Injection', 'is_correct': False},
                    {'option_label': 'D', 'option_text': 'XSS', 'is_correct': False},
                    {'option_label': 'E', 'option_text': 'Trojan', 'is_correct': False},
                ]
            },
            {
                'question_type': 'MULTIPLE_CHOICE',
                'question_text': 'Protokol enkripsi komunikasi web yang menggunakan port default 443 adalah...',
                'points': 50,
                'order_number': 2,
                'options': [
                    {'option_label': 'A', 'option_text': 'HTTP', 'is_correct': False},
                    {'option_label': 'B', 'option_text': 'FTP', 'is_correct': False},
                    {'option_label': 'C', 'option_text': 'HTTPS / TLS', 'is_correct': True},
                    {'option_label': 'D', 'option_text': 'Telnet', 'is_correct': False},
                    {'option_label': 'E', 'option_text': 'SMTP', 'is_correct': False},
                ]
            }
        ]
    }, format='json')
    assert res_pkg.status_code == 201, f"Create package failed: {res_pkg.data}"
    pkg_id = res_pkg.data['id']
    print(f"[3] Create Exam Package: OK (ID: {pkg_id})")

    # Step 4: Teacher creates an Exam Session
    from apps.accounts.models import ClassRoom
    classroom = ClassRoom.objects.first()

    res_ses = client_teacher.post('/api/exams/sessions/', {
        'package': pkg_id,
        'classroom': classroom.id,
        'title': 'Sesi Ulangan E2E Kelas X TKJ 1',
        'duration_minutes': 45,
        'start_time': '2026-10-26T08:00:00Z',
        'end_time': '2026-10-26T09:30:00Z',
        'entry_password': 'PASSMASUK1',
        'exit_password': 'PASSOUT1'
    }, format='json')
    assert res_ses.status_code == 201, f"Create session failed: {res_ses.data}"
    ses_id = res_ses.data['id']
    print(f"[4] Create Exam Session: OK (ID: {ses_id}, Entry: PASSMASUK1, Exit: PASSOUT1)")

    # Step 5: Student verifies Entry Password
    res_verify_entry = client_student.post(f'/api/exams/sessions/{ses_id}/verify-entry/', {
        'entry_password': 'PASSMASUK1'
    })
    assert res_verify_entry.status_code == 200 and res_verify_entry.data['success'] is True
    print("[5] Student Gatekeeper Entry PIN Verification: OK (PIN Accepted)")

    # Step 6: Student Starts Attempt
    res_start = client_student.post(f'/api/exams/sessions/{ses_id}/start/', {
        'screen_orientation': 'PORTRAIT'
    })
    assert res_start.status_code == 200, f"Start failed: {res_start.data}"
    attempt_id = res_start.data['attempt_id']
    print(f"[6] Student Starts Attempt: OK (Attempt ID: {attempt_id}, Orientation: PORTRAIT)")

    # Step 7: Anti-Cheat Sensor reports Violation (e.g. Tab Switch)
    res_viol = client_student.post(f'/api/proctoring/attempts/{attempt_id}/report-violation/', {
        'violation_type': 'TAB_SWITCH',
        'description': 'Sensor mendeteksi siswa berpindah ke tab Google Search'
    })
    assert res_viol.status_code == 200
    assert res_viol.data['status'] == 'LOCKED_VIOLATION'
    print("[7] Anti-Cheat Violation Triggered: OK (Attempt Status LOCKED_VIOLATION)")

    # Step 8: Teacher views Live Proctoring & Unlocks Student
    res_proc_status = client_teacher.get(f'/api/proctoring/sessions/{ses_id}/status/')
    assert res_proc_status.status_code == 200
    locked_student = next(s for s in res_proc_status.data['students'] if s['id'] == attempt_id)
    assert locked_student['status'] == 'LOCKED_VIOLATION'
    print("[8] Teacher Live Proctoring: OK (Student displayed in RED LOCKED_VIOLATION state)")

    res_unlock = client_teacher.post(f'/api/proctoring/attempts/{attempt_id}/unlock/', {
        'supervisor_pin': '12345'
    })
    assert res_unlock.status_code == 200 and res_unlock.data['status'] == 'WORKING'
    print("[9] Teacher Unlocks Student: OK (Student restored to WORKING state)")

    # Step 9: Student Submits Answers
    first_q = res_start.data['package']['questions'][0]
    second_q = res_start.data['package']['questions'][1]
    
    # Menjawab B (benar: 50 poin) dan C (benar: 50 poin) -> total 100
    ans_dict = {
        first_q['id']: 'B',
        second_q['id']: 'C'
    }
    res_submit = client_student.post(f'/api/exams/sessions/{ses_id}/submit/', {
        'answers_json': ans_dict
    }, format='json')
    assert res_submit.status_code == 200, f"Submit failed: {res_submit.data}"
    assert res_submit.data['total_score'] == 100.0
    print(f"[10] Student Submits Answers: OK (Auto-Grading Score: {res_submit.data['total_score']}/100)")

    # Step 10: Student verifies Exit Password
    res_exit = client_student.post(f'/api/exams/sessions/{ses_id}/verify-exit/', {
        'exit_password': 'PASSOUT1'
    })
    assert res_exit.status_code == 200 and res_exit.data['success'] is True
    print("[11] Student Exit Password Verification: OK (Alarm Sound Triggered, Workspace Released)")

    # Step 11: Teacher views E-Journal & Saves Supervisor Notes
    res_journal = client_teacher.get(f'/api/ejournal/sessions/{ses_id}/')
    assert res_journal.status_code == 200
    assert res_journal.data['total_students_present'] >= 1
    print(f"[12] E-Journal Sesi Asesmen: OK (Hadir: {res_journal.data['total_students_present']}, Skor Rata-rata: {res_journal.data['average_score']})")

    res_patch_notes = client_teacher.patch(f'/api/ejournal/sessions/{ses_id}/', {
        'supervisor_notes': 'Ujian E2E berjalan tertib. Siswa siswa01 sempat terkunci karena tab switch dan telah di-unlock.'
    })
    assert res_patch_notes.status_code == 200
    print("[13] Save Supervisor Notes: OK")

    # Step 12: Teacher exports official PDF and Excel
    res_pdf = client_teacher.get(f'/api/ejournal/sessions/{ses_id}/export-pdf/')
    assert res_pdf.status_code == 200 and res_pdf['Content-Type'] == 'application/pdf'
    assert len(res_pdf.content) > 1000
    print(f"[14] Export Official ReportLab PDF: OK (Bytes: {len(res_pdf.content)})")

    res_excel = client_teacher.get(f'/api/ejournal/sessions/{ses_id}/export-excel/')
    assert res_excel.status_code == 200 and 'spreadsheetml' in res_excel['Content-Type']
    assert len(res_excel.content) > 1000
    print(f"[15] Export Multi-Sheet OpenPyXL Excel: OK (Bytes: {len(res_excel.content)})")

    print("\n" + "=" * 65)
    print("ALL 15/15 END-TO-END FULLSTACK INTEGRATION TESTS PASSED 100%!")
    print("=" * 65)

if __name__ == '__main__':
    test_full_cycle()
