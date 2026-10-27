import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.exams.models import ExamSession, ExamPackage, Question

User = get_user_model()
client = APIClient()

print("=" * 60)
print("TESTING REST API ENDPOINTS E-UJIAN & E-JURNAL")
print("=" * 60)

# 1. Test Login Guru
res_login_guru = client.post('/api/auth/login/', {'username': 'guru01', 'password': 'guru123'})
assert res_login_guru.status_code == 200, f"Login guru failed: {res_login_guru.data}"
teacher_token = res_login_guru.data['access']
print("[1] Login Guru: SUCCESS (Token acquired, User:", res_login_guru.data['user']['full_name'], ")")

# 2. Test Login Siswa
res_login_siswa = client.post('/api/auth/login/', {'username': 'siswa01', 'password': 'siswa123'})
assert res_login_siswa.status_code == 200, f"Login siswa failed: {res_login_siswa.data}"
student_token = res_login_siswa.data['access']
print("[2] Login Siswa: SUCCESS (Token acquired, User:", res_login_siswa.data['user']['full_name'], ")")

# 3. Test GET /api/auth/me/
client.credentials(HTTP_AUTHORIZATION=f'Bearer {student_token}')
res_me = client.get('/api/auth/me/')
assert res_me.status_code == 200 and res_me.data['username'] == 'siswa01'
print("[3] GET /api/auth/me/: SUCCESS (Username:", res_me.data['username'], "Kelas:", res_me.data['classroom_name'], ")")

# 4. Test GET /api/accounts/classrooms/
res_classrooms = client.get('/api/accounts/classrooms/')
assert res_classrooms.status_code == 200 and len(res_classrooms.data) >= 1
print("[4] GET /api/accounts/classrooms/: SUCCESS (Count:", len(res_classrooms.data), ")")

# 5. Test Keamanan Siswa: Pastikan is_correct TIDAK ADA di response Siswa!
res_pkg_student = client.get('/api/exams/packages/')
assert res_pkg_student.status_code == 200
native_pkg = next(p for p in res_pkg_student.data if p['exam_type'] == 'NATIVE_QUESTIONS')
first_q_options = native_pkg['questions'][0]['options']
for opt in first_q_options:
    assert 'is_correct' not in opt, f"SECURITY LEAK! is_correct found in student response: {opt}"
print("[5] Sensor Keamanan Kunci Jawaban (Role STUDENT): SUCCESS (is_correct TIDAK bocor ke siswa!)")

# 6. Test Guru: Pastikan is_correct ADA di response Guru!
client.credentials(HTTP_AUTHORIZATION=f'Bearer {teacher_token}')
res_pkg_teacher = client.get('/api/exams/packages/')
native_pkg_t = next(p for p in res_pkg_teacher.data if p['exam_type'] == 'NATIVE_QUESTIONS')
first_q_options_t = native_pkg_t['questions'][0]['options']
assert any('is_correct' in opt for opt in first_q_options_t), "Teacher should see is_correct"
print("[6] Akses Kunci Jawaban (Role TEACHER): SUCCESS (is_correct tampil untuk guru)")

# 7. Test Siswa: Verify Entry Password
session = ExamSession.objects.first()
client.credentials(HTTP_AUTHORIZATION=f'Bearer {student_token}')

# Salah Password
res_entry_bad = client.post(f'/api/exams/sessions/{session.id}/verify-entry/', {'entry_password': 'SALAH'})
assert res_entry_bad.status_code == 400
print("[7a] Verify Entry Password (Salah): SUCCESS (Ditolak status 400)")

# Benar Password
res_entry_ok = client.post(f'/api/exams/sessions/{session.id}/verify-entry/', {'entry_password': session.entry_password})
assert res_entry_ok.status_code == 200 and res_entry_ok.data['success'] is True
print("[7b] Verify Entry Password (Benar): SUCCESS (Diterima status 200)")

# 8. Test Siswa: Start Exam Session
res_start = client.post(f'/api/exams/sessions/{session.id}/start/', {'screen_orientation': 'PORTRAIT'})
assert res_start.status_code == 200 and res_start.data['status'] == 'WORKING'
print("[8] Start Exam Session: SUCCESS (Attempt status WORKING, Orientasi PORTRAIT)")

# 9. Test Siswa: Submit Answers & Auto-Grading
# Pertanyaan 1 kunci jawaban B (20 poin), Pertanyaan 2 kunci jawaban C (20 poin)
q1 = native_pkg['questions'][0]
q2 = native_pkg['questions'][1]
answers_payload = {
    'answers': {
        str(q1['id']): 'B', # Benar (20 poin)
        str(q2['id']): 'C', # Benar (20 poin)
    }
}
res_submit = client.post(f'/api/exams/sessions/{session.id}/submit/', answers_payload, format='json')
assert res_submit.status_code == 200 and res_submit.data['calculated_score'] == 40.0
print("[9] Submit Exam Answers & Auto-Grading: SUCCESS (Skor Otomatis Terhitung:", res_submit.data['calculated_score'], "Poin)")

# 10. Test Siswa: Verify Exit Password
# Salah Password
res_exit_bad = client.post(f'/api/exams/sessions/{session.id}/verify-exit/', {'exit_password': 'SALAH'})
assert res_exit_bad.status_code == 400
print("[10a] Verify Exit Password (Salah): SUCCESS (Ditolak status 400)")

# Benar Password
res_exit_ok = client.post(f'/api/exams/sessions/{session.id}/verify-exit/', {'exit_password': session.exit_password})
assert res_exit_ok.status_code == 200 and res_exit_ok.data['status'] == 'SUBMITTED'
print("[10b] Verify Exit Password (Benar): SUCCESS (Status berubah menjadi SUBMITTED)")

print("=" * 60)
print("ALL REST API CONTRACT TESTS PASSED PERFECTLY (10/10)!")
print("=" * 60)

