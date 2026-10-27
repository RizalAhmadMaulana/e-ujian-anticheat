import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from .models import StudentAttempt, ViolationLog

class ProctoringConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket Consumer untuk komunikasi real-time Live Proctoring antara Siswa dan Guru
    Endpoint: ws://<host>/ws/proctoring/<session_id>/
    """

    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs'].get('session_id')
        self.group_name = f"proctoring_{self.session_id}"

        # Gabungkan client ke channel group sesi ujian
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

        # Kirim sinyal konfirmasi koneksi
        await self.send_json({
            "event": "CONNECTION_ESTABLISHED",
            "session_id": self.session_id,
            "message": "Terhubung ke channel real-time Live Proctoring."
        })

    async def disconnect(self, close_code):
        # Lepaskan client dari channel group
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )

    async def receive_json(self, content):
        action = content.get('action')

        # ========================================================
        # 1. AKSI SISWA: LAPORKAN PELANGGARAN KECURANGAN
        # ========================================================
        if action == 'REPORT_VIOLATION':
            attempt_id = content.get('attempt_id')
            violation_type = content.get('violation_type', 'TAB_SWITCH')
            description = content.get('description', 'Perpindahan aplikasi/layar terdeteksi.')

            # Update database
            violation_data = await self.record_violation_in_db(
                attempt_id, violation_type, description
            )

            if violation_data:
                # Broadcast ke dashboard pengawas Guru dan seluruh grup
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        "type": "broadcast_message",
                        "data": {
                            "event": "STUDENT_LOCKED_ALERT",
                            "attempt_id": str(attempt_id),
                            "student_name": violation_data['student_name'],
                            "nisn": violation_data['nisn'],
                            "status": "LOCKED_VIOLATION",
                            "violation_count": violation_data['violation_count'],
                            "violation_type": violation_type,
                            "description": description,
                            "detected_at": violation_data['detected_at'],
                        }
                    }
                )

        # ========================================================
        # 2. AKSI GURU: BUKA KUNCI SISWA (UNLOCK)
        # ========================================================
        elif action == 'UNLOCK_STUDENT':
            attempt_id = content.get('attempt_id')
            unlock_data = await self.unlock_student_in_db(attempt_id)

            if unlock_data:
                # Broadcast ke grup agar layar siswa langsung terbuka kembali
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        "type": "broadcast_message",
                        "data": {
                            "event": "STUDENT_UNLOCKED",
                            "attempt_id": str(attempt_id),
                            "student_name": unlock_data['student_name'],
                            "status": "WORKING",
                            "unlocked_at": unlock_data['unlocked_at'],
                            "message": "Layar ujian telah dibuka kembali oleh Guru Pengawas."
                        }
                    }
                )

        # ========================================================
        # 3. AKSI GURU: DISKUALIFIKASI SISWA (FORCE STOP)
        # ========================================================
        elif action == 'DISQUALIFY_STUDENT':
            attempt_id = content.get('attempt_id')
            disqualify_data = await self.disqualify_student_in_db(attempt_id)

            if disqualify_data:
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        "type": "broadcast_message",
                        "data": {
                            "event": "STUDENT_DISQUALIFIED",
                            "attempt_id": str(attempt_id),
                            "student_name": disqualify_data['student_name'],
                            "status": "DISQUALIFIED",
                            "message": "Peserta telah didiskualifikasi oleh Guru Pengawas."
                        }
                    }
                )

    async def broadcast_message(self, event):
        """Handler untuk meneruskan payload event ke WebSocket client"""
        await self.send_json(event['data'])

    # ============================================================
    # DATABASE ASYNC HELPERS
    # ============================================================

    @database_sync_to_async
    def record_violation_in_db(self, attempt_id, violation_type, description):
        try:
            attempt = StudentAttempt.objects.select_related('student').get(id=attempt_id)
            attempt.status = StudentAttempt.AttemptStatus.LOCKED_VIOLATION
            attempt.violation_count += 1
            attempt.save(update_fields=['status', 'violation_count'])

            log = ViolationLog.objects.create(
                attempt=attempt,
                violation_type=violation_type,
                description=description
            )

            return {
                "student_name": attempt.student.full_name,
                "nisn": attempt.student.username,
                "violation_count": attempt.violation_count,
                "detected_at": log.detected_at.strftime("%H:%M:%S"),
            }
        except StudentAttempt.DoesNotExist:
            return None

    @database_sync_to_async
    def unlock_student_in_db(self, attempt_id):
        try:
            attempt = StudentAttempt.objects.select_related('student').get(id=attempt_id)
            attempt.status = StudentAttempt.AttemptStatus.WORKING
            attempt.save(update_fields=['status'])

            now = timezone.now()
            # Tandai log terakhir dengan timestamp unlock
            last_log = attempt.violations.filter(unlocked_by_teacher_at__isnull=True).first()
            if last_log:
                last_log.unlocked_by_teacher_at = now
                last_log.save(update_fields=['unlocked_by_teacher_at'])

            return {
                "student_name": attempt.student.full_name,
                "unlocked_at": now.strftime("%H:%M:%S"),
            }
        except StudentAttempt.DoesNotExist:
            return None

    @database_sync_to_async
    def disqualify_student_in_db(self, attempt_id):
        try:
            attempt = StudentAttempt.objects.select_related('student').get(id=attempt_id)
            attempt.status = StudentAttempt.AttemptStatus.DISQUALIFIED
            attempt.save(update_fields=['status'])

            return {
                "student_name": attempt.student.full_name,
            }
        except StudentAttempt.DoesNotExist:
            return None

