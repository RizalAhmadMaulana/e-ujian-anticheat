import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIClient
from apps.accounts.models import User, ClassRoom

def run_tests():
    print("=" * 60)
    print("TESTING TAHAP 5.19: UNIFIED LOGIN, MANAGEMENT USER, DATA SISWA & DATA GURU")
    print("=" * 60)

    client = APIClient()

    # 1. Pastikan kelas ada
    classroom, _ = ClassRoom.objects.get_or_create(name="9A", defaults={"academic_year": "2026/2027"})

    # 2. Test Login Guru (NIP & PW = guru)
    res_login_guru = client.post('/api/auth/login/', {'username': 'guru', 'password': 'guru'})
    print(f"1. Login Guru (guru/guru): {res_login_guru.status_code}")
    assert res_login_guru.status_code == 200, f"Login guru failed: {res_login_guru.data}"
    assert res_login_guru.data['user']['role'] == 'TEACHER'
    guru_token = res_login_guru.data['access']

    # 3. Test Login Siswa (NISN & PW = siswa)
    res_login_siswa = client.post('/api/auth/login/', {'username': 'siswa', 'password': 'siswa'})
    print(f"2. Login Siswa (siswa/siswa): {res_login_siswa.status_code}")
    assert res_login_siswa.status_code == 200, f"Login siswa failed: {res_login_siswa.data}"
    assert res_login_siswa.data['user']['role'] == 'STUDENT'

    # Set Auth Header Guru
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {guru_token}')

    # 4. Test Tambah Siswa di Data Siswa
    # Hapus jika s_test sudah ada
    User.objects.filter(username='0089999001').delete()
    res_create_siswa = client.post('/api/accounts/students/', {
        'full_name': 'Santri Test Siswa',
        'nisn': '0089999001',
        'classroom_id': classroom.id,
        'email': 'santri@siswa.sch.id'
    })
    print(f"3. Tambah Siswa (NISN: 0089999001): {res_create_siswa.status_code}")
    assert res_create_siswa.status_code == 201, f"Create student failed: {res_create_siswa.data}"
    student_id = res_create_siswa.data['id']

    # Cek login siswa baru dengan PW = NISN
    res_login_new_siswa = client.post('/api/auth/login/', {'username': '0089999001', 'password': '0089999001'})
    print(f"4. Login Siswa Baru (0089999001/0089999001): {res_login_new_siswa.status_code}")
    assert res_login_new_siswa.status_code == 200

    # Cek sinkronisasi di Management User
    res_get_user = client.get(f'/api/accounts/users/{student_id}/')
    print(f"5. Cek Sinkronisasi di Management User: {res_get_user.status_code}")
    assert res_get_user.status_code == 200
    assert res_get_user.data['full_name'] == 'Santri Test Siswa'
    assert res_get_user.data['role'] == 'STUDENT'

    # 5. Test Edit Siswa di Data Siswa
    res_edit_siswa = client.patch(f'/api/accounts/students/{student_id}/', {
        'full_name': 'Santri Test Siswa Terupdate',
        'email': 'santri_updated@siswa.sch.id'
    })
    print(f"6. Edit Siswa: {res_edit_siswa.status_code}")
    assert res_edit_siswa.status_code == 200
    
    # Cek kembali di Management User bahwa nama ikut terupdate
    res_check_sync = client.get(f'/api/accounts/users/{student_id}/')
    assert res_check_sync.data['full_name'] == 'Santri Test Siswa Terupdate'
    assert res_check_sync.data['email'] == 'santri_updated@siswa.sch.id'
    print("7. Verifikasi Sinkronisasi Edit ke Management User: BERHASIL")

    # 6. Test Tambah Guru di Data Guru
    User.objects.filter(username='198501012010011005').delete()
    res_create_guru = client.post('/api/accounts/teachers/', {
        'full_name': 'Ustadz Test Guru',
        'nip': '198501012010011005',
        'email': 'ustadz@guru.sch.id'
    })
    print(f"8. Tambah Guru (NIP: 198501012010011005): {res_create_guru.status_code}")
    assert res_create_guru.status_code == 201
    teacher_id = res_create_guru.data['id']

    # Cek login guru baru dengan PW = NIP
    res_login_new_guru = client.post('/api/auth/login/', {'username': '198501012010011005', 'password': '198501012010011005'})
    print(f"9. Login Guru Baru (NIP/NIP): {res_login_new_guru.status_code}")
    assert res_login_new_guru.status_code == 200
    assert res_login_new_guru.data['user']['role'] == 'TEACHER'

    # Cek sinkronisasi guru di Management User
    res_get_teacher_user = client.get(f'/api/accounts/users/{teacher_id}/')
    assert res_get_teacher_user.status_code == 200
    assert res_get_teacher_user.data['role'] == 'TEACHER'
    print("10. Verifikasi Sinkronisasi Guru ke Management User: BERHASIL")

    # 7. Test Download Template Excel
    res_tpl_user = client.get('/api/accounts/users/template-excel/')
    assert res_tpl_user.status_code == 200
    res_tpl_siswa = client.get('/api/accounts/students/template-excel/')
    assert res_tpl_siswa.status_code == 200
    res_tpl_guru = client.get('/api/accounts/teachers/template-excel/')
    assert res_tpl_guru.status_code == 200
    print("11. Verifikasi 3 Endpoint Unduh Template Excel: 200 OK")

    # 8. Test Hapus Siswa & Guru
    res_del_siswa = client.delete(f'/api/accounts/students/{student_id}/')
    assert res_del_siswa.status_code == 204
    assert not User.objects.filter(id=student_id).exists()
    print("12. Hapus Siswa di Data Siswa (otomatis terhapus di Management User): BERHASIL")

    res_del_guru = client.delete(f'/api/accounts/teachers/{teacher_id}/')
    assert res_del_guru.status_code == 204
    assert not User.objects.filter(id=teacher_id).exists()
    print("13. Hapus Guru di Data Guru (otomatis terhapus di Management User): BERHASIL")

    print("\n" + "=" * 60)
    print("SEMUA PENGUJIAN REST API BERHASIL 100%! (ALL PASS)")
    print("=" * 60)

if __name__ == '__main__':
    run_tests()

