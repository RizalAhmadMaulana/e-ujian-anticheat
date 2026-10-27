import uuid
from django.db import models
from django.conf import settings
from apps.exams.models import ExamSession

class ExamJournal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.OneToOneField(
        ExamSession, 
        on_delete=models.CASCADE, 
        related_name='journal',
        verbose_name="Sesi Ujian"
    )
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='journals',
        verbose_name="Guru Pengawas"
    )
    total_students_scheduled = models.IntegerField(default=0, verbose_name="Total Terjadwal")
    total_students_present = models.IntegerField(default=0, verbose_name="Total Hadir")
    total_students_absent = models.IntegerField(default=0, verbose_name="Total Tidak Hadir")
    total_violations_recorded = models.IntegerField(default=0, verbose_name="Total Pelanggaran")
    supervisor_notes = models.TextField(blank=True, default="", verbose_name="Catatan Berita Acara Pengawas")
    generated_at = models.DateTimeField(auto_now=True, verbose_name="Waktu Pembuatan Dokumen")

    class Meta:
        db_table = 'exam_journals'
        verbose_name = 'E-Jurnal & Berita Acara Ujian'
        verbose_name_plural = 'Daftar E-Jurnal Ujian'
        ordering = ['-generated_at']

    def __str__(self):
        return f"E-Jurnal {self.session.classroom.name} - {self.session.package.subject_name}"

