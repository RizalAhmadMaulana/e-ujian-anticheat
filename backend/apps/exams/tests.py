import time
from datetime import timedelta
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import ClassRoom
from apps.exams.models import ExamPackage, ExamSession
from apps.exams.tokens import (
    ROTATION_INTERVAL_SECONDS,
    generate_dynamic_token,
    get_current_slot,
    get_session_tokens,
    is_valid_entry_token,
    is_valid_supervisor_pin,
)
from apps.proctoring.models import StudentAttempt

User = get_user_model()


class FiveMinuteTokenAndPinTests(APITestCase):
    def setUp(self):
        self.classroom = ClassRoom.objects.create(name='IXE', academic_year='2026/2027')
        self.teacher = User.objects.create(
            username='198501012010011005',
            full_name='Guru Pengawas',
            role=User.RoleChoices.TEACHER,
            nip='198501012010011005',
            is_staff=True,
        )
        self.teacher.set_password('198501012010011005')
        self.teacher.save()

        self.student = User.objects.create(
            username='0117134623',
            full_name='SYAFIRA',
            role=User.RoleChoices.STUDENT,
            nisn='0117134623',
            classroom=self.classroom,
        )
        self.student.set_password('0117134623')
        self.student.save()

        self.pkg = ExamPackage.objects.create(
            teacher=self.teacher,
            title='PH LISTRIK DINAMIS',
            subject_name='IPA',
            exam_type=ExamPackage.ExamTypeChoices.NATIVE_QUESTIONS,
        )
        now = timezone.now()
        self.session = ExamSession.objects.create(
            package=self.pkg,
            classroom=self.classroom,
            allow_all_classes=True,
            start_time=now - timedelta(minutes=10),
            end_time=now + timedelta(hours=2),
            duration_minutes=60,
            entry_password='MSK-STATIC',
            supervisor_pin='PIN-9999',
            is_active=True,
        )

    def test_rotation_interval_is_5_minutes(self):
        self.assertEqual(ROTATION_INTERVAL_SECONDS, 300)
        tokens = get_session_tokens(self.session.id)
        self.assertEqual(tokens['rotation_interval'], 300)
        self.assertTrue(1 <= tokens['expires_in_seconds'] <= 300)
        self.assertTrue(tokens['entry_token'].startswith('MSK-'))
        self.assertTrue(tokens['pin_token'].startswith('PIN-'))

    def test_generated_entry_token_works_to_enter_exam(self):
        self.client.force_authenticate(user=self.student)
        tokens = get_session_tokens(self.session.id)
        verify_url = reverse('session_verify_entry', kwargs={'session_id': self.session.id})

        # Token dengan prefix MSK-XXXX
        res = self.client.post(verify_url, {'entry_password': tokens['entry_token']}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertTrue(res.data.get('success'))

        # Token tanpa prefix (4 karakter saja) & spasi/huruf kecil
        short_code = tokens['entry_token'].replace('MSK-', '').lower()
        res2 = self.client.post(verify_url, {'entry_password': f"  {short_code}  "}, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK)

        # Token slot kedaluwarsa (3 slot lalu = 15 menit lalu) harus ditolak
        old_slot = get_current_slot() - 3
        expired_tok = generate_dynamic_token(self.session.id, old_slot, 'ENTRY')
        res3 = self.client.post(verify_url, {'entry_password': expired_tok}, format='json')
        self.assertEqual(res3.status_code, status.HTTP_400_BAD_REQUEST)

    def test_generated_supervisor_pin_works_to_unlock_student(self):
        attempt = StudentAttempt.objects.create(
            session=self.session,
            student=self.student,
            status=StudentAttempt.AttemptStatus.LOCKED_VIOLATION,
            violation_count=1,
        )
        self.client.force_authenticate(user=self.student)
        tokens = get_session_tokens(self.session.id)
        unlock_url = reverse('proctoring_unlock_student', kwargs={'attempt_id': attempt.id})

        # PIN kedaluwarsa (3 slot lalu) ditolak
        old_pin = generate_dynamic_token(self.session.id, get_current_slot() - 3, 'PIN')
        bad_res = self.client.post(unlock_url, {'supervisor_pin': old_pin}, format='json')
        self.assertEqual(bad_res.status_code, status.HTTP_400_BAD_REQUEST)

        # PIN aktif 5 menit berhasil membuka kunci siswa
        ok_res = self.client.post(unlock_url, {'supervisor_pin': tokens['pin_token']}, format='json')
        self.assertEqual(ok_res.status_code, status.HTTP_200_OK)
        attempt.refresh_from_db()
        self.assertEqual(attempt.status, StudentAttempt.AttemptStatus.WORKING)

    def test_slot_drift_tolerance_and_prefix_safety(self):
        now_ts = time.time()
        slot = get_current_slot(now_ts)
        prev_tok = generate_dynamic_token(self.session.id, slot - 1, 'ENTRY')
        next_pin = generate_dynamic_token(self.session.id, slot + 1, 'PIN')
        self.assertTrue(is_valid_entry_token(self.session.id, prev_tok, timestamp=now_ts))
        self.assertTrue(is_valid_supervisor_pin(self.session.id, next_pin, timestamp=now_ts))
