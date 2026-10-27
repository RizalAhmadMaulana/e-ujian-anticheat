import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from apps.accounts.models import User, ClassRoom
from apps.exams.models import ExamSession
from apps.proctoring.models import StudentAttempt, ViolationLog
from apps.ejournal.models import ExamJournal

def run_tests():
    print("=== MEMULAI TEST SUITE TAHAP 2.3: PROCTORING & E-JURNAL ===")
    client = APIClient()

    # 1. Login sebagai Guru
    teacher = User.objects.get(username='guru01')
    login_resp = client.post('/api/auth/login/', {'username': 'guru01', 'password': 'guru123'})
    assert login_resp.status_code == 200, f"Guru login failed: {login_resp.data}"
    token = login_resp.data['access']
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    print("[OK] Test 1: Autentikasi JWT Guru berhasil.")

    # 2. Ambil Sesi Ujian Pertama
    session = ExamSession.objects.first()
    assert session is not None, "Sesi ujian tidak ditemukan"
    print(f"[OK] Test 2: Sesi ujian ditemukan: {session.id} ({session.package.subject_name})")

    # 3. Proctoring Session Status
    status_resp = client.get(f'/api/proctoring/sessions/{session.id}/status/')
    assert status_resp.status_code == 200, f"Status failed: {status_resp.data}"
    assert 'students' in status_resp.data
    print(f"[OK] Test 3: GET Proctoring Status berhasil. Total siswa aktif: {len(status_resp.data['students'])}")

    # 4. Report Violation via REST
    attempt = session.attempts.first()
    viol_resp = client.post(f'/api/proctoring/attempts/{attempt.id}/report-violation/', {
        'violation_type': 'TAB_SWITCH',
        'description': 'Sensor mendeteksi siswa membuka tab baru Google Search'
    })
    assert viol_resp.status_code == 200, f"Report violation failed: {viol_resp.data}"
    attempt.refresh_from_db()
    assert attempt.status == 'LOCKED_VIOLATION'
    print(f"[OK] Test 4: Report Violation berhasil. Status siswa berubah menjadi LOCKED_VIOLATION, violation_count: {attempt.violation_count}")

    # 5. Unlock Student Attempt
    unlock_resp = client.post(f'/api/proctoring/attempts/{attempt.id}/unlock/', {
        'supervisor_pin': '12345'
    })
    assert unlock_resp.status_code == 200, f"Unlock failed: {unlock_resp.data}"
    attempt.refresh_from_db()
    assert attempt.status == 'WORKING'
    print("[OK] Test 5: Unlock Siswa dengan PIN Pengawas berhasil. Status kembali menjadi WORKING.")

    # 6. Detail E-Jurnal Sesi
    journal_resp = client.get(f'/api/ejournal/sessions/{session.id}/')
    assert journal_resp.status_code == 200, f"E-Journal detail failed: {journal_resp.data}"
    data = journal_resp.data
    assert data['session_id'] == str(session.id)
    assert 'attendance_records' in data
    assert 'violation_records' in data
    print(f"[OK] Test 6: GET E-Jurnal Detail berhasil. Terjadwal: {data['total_students_scheduled']}, Hadir: {data['total_students_present']}, Pelanggaran: {data['total_violations_recorded']}")

    # 7. Update Catatan Pengawas (PATCH)
    patch_resp = client.patch(f'/api/ejournal/sessions/{session.id}/', {
        'supervisor_notes': 'Siswa bernama siswa01 sempat terkunci karena tab switch, sudah ditegur dan di-unlock oleh pengawas.'
    })
    assert patch_resp.status_code == 200, f"Patch failed: {patch_resp.data}"
    assert 'sempat terkunci' in patch_resp.data['supervisor_notes']
    print("[OK] Test 7: PATCH Catatan Pengawas E-Jurnal berhasil disimpan.")

    # 8. Export PDF
    pdf_resp = client.get(f'/api/ejournal/sessions/{session.id}/export-pdf/')
    assert pdf_resp.status_code == 200, f"PDF export failed: {pdf_resp.status_code}"
    assert pdf_resp['Content-Type'] == 'application/pdf'
    assert len(pdf_resp.content) > 1000, "Ukuran file PDF terlalu kecil"
    assert pdf_resp.content.startswith(b'%PDF'), "Header PDF tidak valid"
    print(f"[OK] Test 8: Export PDF Berita Acara berhasil! Ukuran: {len(pdf_resp.content)} bytes.")

    # 9. Export Excel
    excel_resp = client.get(f'/api/ejournal/sessions/{session.id}/export-excel/')
    assert excel_resp.status_code == 200, f"Excel export failed: {excel_resp.status_code}"
    assert 'spreadsheetml' in excel_resp['Content-Type']
    assert len(excel_resp.content) > 1000, "Ukuran file Excel terlalu kecil"
    print(f"[OK] Test 9: Export Excel (.xlsx) Rekapitulasi berhasil! Ukuran: {len(excel_resp.content)} bytes.")

    # 10. Disqualify Student
    disq_resp = client.post(f'/api/proctoring/attempts/{attempt.id}/disqualify/')
    assert disq_resp.status_code == 200, f"Disqualify failed: {disq_resp.data}"
    attempt.refresh_from_db()
    assert attempt.status == 'DISQUALIFIED'
    print("[OK] Test 10: Diskualifikasi siswa berhasil. Status menjadi DISQUALIFIED.")

    print("\n=== SEMUA 10/10 TEST TAHAP 2.3 BERHASIL DENGAN SEMPURNA! ===")

if __name__ == '__main__':
    run_tests()
