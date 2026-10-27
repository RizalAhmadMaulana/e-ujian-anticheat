import uuid
from django.db import models
from django.conf import settings
from apps.exams.models import ExamSession

class StudentAttempt(models.Model):
    class AttemptStatus(models.TextChoices):
        WORKING = 'WORKING', 'Fokus Mengerjakan'
        LOCKED_VIOLATION = 'LOCKED_VIOLATION', 'Layar Terkunci (Pelanggaran)'
        SUBMITTED = 'SUBMITTED', 'Selesai Terkirim'
        DISQUALIFIED = 'DISQUALIFIED', 'Didiskualifikasi'

    class ScreenOrientationChoices(models.TextChoices):
        PORTRAIT = 'PORTRAIT', 'Portrait (Tegak)'
        LANDSCAPE = 'LANDSCAPE', 'Landscape (Mendatar)'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        ExamSession, 
        on_delete=models.CASCADE, 
        related_name='attempts',
        verbose_name="Sesi Ujian"
    )
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='attempts',
        verbose_name="Siswa Peserta"
    )
    status = models.CharField(
        max_length=30, 
        choices=AttemptStatus.choices, 
        default=AttemptStatus.WORKING,
        verbose_name="Status Pengerjaan"
    )
    screen_orientation = models.CharField(
        max_length=20, 
        choices=ScreenOrientationChoices.choices, 
        default=ScreenOrientationChoices.PORTRAIT,
        verbose_name="Orientasi Layar"
    )
    answers_json = models.JSONField(
        default=dict, 
        blank=True, 
        verbose_name="Jawaban Siswa (JSON)"
    )
    violation_count = models.IntegerField(default=0, verbose_name="Total Pelanggaran")
    total_score = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        null=True, 
        blank=True, 
        verbose_name="Skor Akhir"
    )
    started_at = models.DateTimeField(auto_now_add=True, verbose_name="Waktu Mulai")
    finished_at = models.DateTimeField(null=True, blank=True, verbose_name="Waktu Selesai")

    class Meta:
        db_table = 'student_attempts'
        verbose_name = 'Sesi Pengerjaan Siswa'
        verbose_name_plural = 'Daftar Pengerjaan Siswa'
        unique_together = ('session', 'student')
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.student.full_name} - {self.session.package.subject_name} ({self.get_status_display()})"


class ViolationLog(models.Model):
    class ViolationTypeChoices(models.TextChoices):
        TAB_SWITCH = 'TAB_SWITCH', 'Pindah Tab / Minimize Browser'
        EXIT_FULLSCREEN = 'EXIT_FULLSCREEN', 'Keluar Mode Layar Penuh'
        WINDOW_BLUR_APP_SWITCH = 'WINDOW_BLUR_APP_SWITCH', 'Membuka Aplikasi Lain (Window Blur)'
        SHORTCUT_ATTEMPT = 'SHORTCUT_ATTEMPT', 'Mencoba Pintasan Terlarang (Screenshot/DevTools)'

    id = models.BigAutoField(primary_key=True)
    attempt = models.ForeignKey(
        StudentAttempt, 
        on_delete=models.CASCADE, 
        related_name='violations',
        verbose_name="Sesi Pengerjaan"
    )
    violation_type = models.CharField(
        max_length=40, 
        choices=ViolationTypeChoices.choices,
        verbose_name="Jenis Pelanggaran"
    )
    description = models.TextField(verbose_name="Keterangan Deteksi Sensor")
    detected_at = models.DateTimeField(auto_now_add=True, verbose_name="Waktu Terdeteksi")
    unlocked_by_teacher_at = models.DateTimeField(
        null=True, 
        blank=True, 
        verbose_name="Waktu Dibuka Kunci Guru"
    )

    class Meta:
        db_table = 'violation_logs'
        verbose_name = 'Log Pelanggaran'
        verbose_name_plural = 'Daftar Log Pelanggaran'
        ordering = ['-detected_at']

    def __str__(self):
        return f"[{self.detected_at.strftime('%H:%M:%S')}] {self.attempt.student.full_name} - {self.violation_type}"

