import uuid
from django.db import models
from django.conf import settings
from apps.accounts.models import ClassRoom

class ExamPackage(models.Model):
    class ExamTypeChoices(models.TextChoices):
        NATIVE_QUESTIONS = 'NATIVE_QUESTIONS', 'Soal Mandiri (Native)'
        EXTERNAL_LINK = 'EXTERNAL_LINK', 'Tautan Eksternal (Google Form / Teams)'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='exam_packages',
        verbose_name="Guru Pembuat"
    )
    title = models.CharField(max_length=255, verbose_name="Judul Paket Ujian")
    subject_name = models.CharField(max_length=150, verbose_name="Mata Pelajaran")
    exam_type = models.CharField(
        max_length=30, 
        choices=ExamTypeChoices.choices, 
        default=ExamTypeChoices.NATIVE_QUESTIONS,
        verbose_name="Tipe Soal"
    )
    external_url = models.TextField(
        blank=True, 
        null=True, 
        verbose_name="URL Google Form / MS Teams (Secure Iframe)"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'exam_packages'
        verbose_name = 'Paket Ujian'
        verbose_name_plural = 'Daftar Paket Ujian'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.subject_name} ({self.get_exam_type_display()})"


class Question(models.Model):
    class QuestionTypeChoices(models.TextChoices):
        MULTIPLE_CHOICE = 'MULTIPLE_CHOICE', 'Pilihan Ganda'
        ESSAY = 'ESSAY', 'Esai'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    package = models.ForeignKey(
        ExamPackage, 
        on_delete=models.CASCADE, 
        related_name='questions',
        verbose_name="Paket Ujian"
    )
    question_text = models.TextField(verbose_name="Teks Pertanyaan")
    image_url = models.CharField(max_length=500, blank=True, null=True, verbose_name="URL Gambar Soal")
    question_type = models.CharField(
        max_length=20, 
        choices=QuestionTypeChoices.choices, 
        default=QuestionTypeChoices.MULTIPLE_CHOICE,
        verbose_name="Tipe Pertanyaan"
    )
    points = models.IntegerField(default=10, verbose_name="Bobot Poin")
    order_number = models.IntegerField(default=1, verbose_name="Nomor Urut")

    class Meta:
        db_table = 'questions'
        verbose_name = 'Butir Soal'
        verbose_name_plural = 'Daftar Butir Soal'
        ordering = ['order_number']

    def __str__(self):
        return f"Soal #{self.order_number} ({self.package.title})"


class QuestionOption(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(
        Question, 
        on_delete=models.CASCADE, 
        related_name='options',
        verbose_name="Pertanyaan"
    )
    option_label = models.CharField(max_length=5, verbose_name="Label Opsi (A/B/C/D/E)")
    option_text = models.TextField(verbose_name="Teks Pilihan Jawaban")
    is_correct = models.BooleanField(default=False, verbose_name="Apakah Kunci Jawaban?")

    class Meta:
        db_table = 'question_options'
        verbose_name = 'Opsi Jawaban'
        verbose_name_plural = 'Daftar Opsi Jawaban'
        ordering = ['option_label']

    def __str__(self):
        return f"{self.option_label}. {self.option_text[:40]}"


class ExamSession(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    package = models.ForeignKey(
        ExamPackage, 
        on_delete=models.CASCADE, 
        related_name='sessions',
        verbose_name="Paket Soal"
    )
    classroom = models.ForeignKey(
        ClassRoom, 
        on_delete=models.CASCADE, 
        related_name='sessions',
        verbose_name="Kelas Peserta"
    )
    start_time = models.DateTimeField(verbose_name="Waktu Mulai")
    end_time = models.DateTimeField(verbose_name="Waktu Selesai")
    duration_minutes = models.IntegerField(default=60, verbose_name="Durasi (Menit)")
    entry_password = models.CharField(max_length=50, verbose_name="Password Masuk (Token Masuk)")
    exit_password = models.CharField(max_length=50, verbose_name="Password Keluar (Token Keluar)")
    strict_lockdown = models.BooleanField(default=True, verbose_name="Zero-Tolerance Lockdown Aktif")
    is_active = models.BooleanField(default=True, verbose_name="Status Sesi Aktif")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'exam_sessions'
        verbose_name = 'Sesi Ujian'
        verbose_name_plural = 'Daftar Sesi Ujian'
        ordering = ['-start_time']

    def __str__(self):
        return f"{self.package.subject_name} - {self.classroom.name} ({self.start_time.strftime('%Y-%m-%d %H:%M')})"

