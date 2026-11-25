from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import reverse
from io import StringIO
from rest_framework import status
from rest_framework.test import APITestCase
from apps.accounts.models import ClassRoom
from apps.accounts.serializers import normalize_identity_code

User = get_user_model()


class AccountLoginAndSyncTests(APITestCase):
    def setUp(self):
        self.classroom = ClassRoom.objects.create(name='IXE', academic_year='2026/2027')
        self.teacher = User.objects.create(
            username='198501012010011005',
            full_name='Supeni S.Pd',
            role=User.RoleChoices.TEACHER,
            nip='198501012010011005',
            is_staff=True,
            is_active=True,
        )
        self.teacher.set_password('198501012010011005')
        self.teacher.save()

        self.student = User.objects.create(
            username='0117134623',
            full_name='SYAFIRA RAMADHANI NURWIJAYA',
            role=User.RoleChoices.STUDENT,
            nisn='0117134623',
            classroom=self.classroom,
            is_active=True,
        )
        self.student.set_password('0117134623')
        self.student.save()

    def test_normalize_identity_code_cleans_excel_artifacts(self):
        self.assertEqual(normalize_identity_code(" '0117134623\u200b ", is_student=True), '0117134623')
        self.assertEqual(normalize_identity_code('114896961', is_student=True), '0114896961')
        self.assertEqual(normalize_identity_code('114896961.0', is_student=True), '0114896961')

    def test_student_login_exact_nisn_and_leading_zero_variants(self):
        url = reverse('auth_login')
        res = self.client.post(url, {'username': '0117134623', 'password': '0117134623'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('access', res.data)

        res2 = self.client.post(url, {'username': '117134623', 'password': '117134623'}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)

    def test_student_with_unusable_password_or_legacy_9digit_hash_recovers_on_login(self):
        rafael = User.objects.create(
            username='114896961',
            full_name='RAFAEL ALDY SAPUTRA',
            role=User.RoleChoices.STUDENT,
            nisn='0114896961',
            classroom=self.classroom,
            is_active=False,
        )
        rafael.set_unusable_password()
        rafael.save()

        url = reverse('auth_login')
        res = self.client.post(url, {'username': '0114896961', 'password': '0114896961'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        rafael.refresh_from_db()
        self.assertTrue(rafael.is_active)
        self.assertTrue(rafael.check_password('0114896961'))

    def test_teacher_login_and_reset_student_password(self):
        self.client.force_authenticate(user=self.teacher)
        self.student.set_password('sandi_lama_lupa')
        self.student.save()

        reset_url = reverse('student_reset_password', kwargs={'pk': self.student.id})
        res = self.client.post(reset_url, {}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        self.client.force_authenticate(user=None)
        login_url = reverse('auth_login')
        login_res = self.client.post(login_url, {'username': '0117134623', 'password': '0117134623'}, format='json')
        self.assertEqual(login_res.status_code, status.HTTP_200_OK)

    def test_sync_all_student_accounts(self):
        broken_student = User.objects.create(
            username='119998887',
            full_name='SISWA BERMASALAH',
            role=User.RoleChoices.STUDENT,
            nisn='119998887',
            classroom=self.classroom,
            is_active=False,
        )
        broken_student.set_password('wrong_password')
        broken_student.save()

        self.client.force_authenticate(user=self.teacher)
        sync_url = reverse('student_sync_accounts')
        res = self.client.post(sync_url, {'reset_passwords': True}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        broken_student.refresh_from_db()
        self.assertTrue(broken_student.is_active)
        self.assertEqual(broken_student.nisn, '0119998887')
        self.assertEqual(broken_student.username, '0119998887')
        self.assertTrue(broken_student.check_password('0119998887'))

    def test_clear_diagnostic_error_for_unknown_user_and_password_mismatch(self):
        url = reverse('auth_login')
        res_unknown = self.client.post(url, {'username': '9999999999', 'password': '9999999999'}, format='json')
        self.assertEqual(res_unknown.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('belum terdaftar', str(res_unknown.data.get('detail', '')))

        self.student.set_password('sandi_khusus_berbeda')
        self.student.save()
        res_mismatch = self.client.post(url, {'username': '0117134623', 'password': '0117134623'}, format='json')
        self.assertEqual(res_mismatch.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('Reset Sandi', str(res_mismatch.data.get('detail', '')))

    def test_sync_student_accounts_with_classroom_filter(self):
        other_class = ClassRoom.objects.create(name='IXD', academic_year='2026/2027')
        student_other = User.objects.create(
            username='118887776',
            full_name='SISWA KELAS LAIN',
            role=User.RoleChoices.STUDENT,
            nisn='118887776',
            classroom=other_class,
            is_active=False,
        )

        self.client.force_authenticate(user=self.teacher)
        sync_url = reverse('student_sync_accounts')
        res = self.client.post(sync_url, {'reset_passwords': True, 'classroom_id': self.classroom.id}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        # Siswa di other_class tidak terpengaruh karena filter kelas aktif
        student_other.refresh_from_db()
        self.assertFalse(student_other.is_active)

    def test_fix_accounts_login_command_dry_run_and_execution(self):
        out = StringIO()
        call_command('fix_accounts_login', '--dry-run', stdout=out)
        self.assertIn('[DRY-RUN', out.getvalue())

        out2 = StringIO()
        call_command('fix_accounts_login', '--reset-student-passwords', stdout=out2)
        self.assertIn('Selesai!', out2.getvalue())
