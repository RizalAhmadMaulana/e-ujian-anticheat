import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser

class ClassRoom(models.Model):
    name = models.CharField(max_length=50, verbose_name="Nama Kelas")
    academic_year = models.CharField(max_length=20, default="2026/2027", verbose_name="Tahun Ajaran")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'classrooms'
        verbose_name = 'Kelas'
        verbose_name_plural = 'Daftar Kelas'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.academic_year})"


class User(AbstractUser):
    class RoleChoices(models.TextChoices):
        TEACHER = 'TEACHER', 'Guru Pengawas'
        STUDENT = 'STUDENT', 'Peserta Siswa'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=150, unique=True, verbose_name="NIP / NISN / Username")
    full_name = models.CharField(max_length=255, verbose_name="Nama Lengkap")
    role = models.CharField(
        max_length=20, 
        choices=RoleChoices.choices, 
        default=RoleChoices.STUDENT,
        verbose_name="Peran Pengguna"
    )
    classroom = models.ForeignKey(
        ClassRoom, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='students',
        verbose_name="Kelas Siswa"
    )
    nip = models.CharField(max_length=50, blank=True, null=True, verbose_name="NIP Guru")
    nisn = models.CharField(max_length=50, blank=True, null=True, verbose_name="NISN Siswa")

    class Meta:
        db_table = 'users'
        verbose_name = 'Pengguna'
        verbose_name_plural = 'Daftar Pengguna'

    def __str__(self):
        return f"{self.full_name} ({self.username}) [{self.role}]"

    def save(self, *args, **kwargs):
        if not self.full_name and (self.first_name or self.last_name):
            self.full_name = f"{self.first_name} {self.last_name}".strip()
        if self.role == self.RoleChoices.TEACHER:
            if not self.nip and self.username:
                self.nip = self.username
            elif self.nip and not self.username:
                self.username = self.nip
            self.is_staff = True
        elif self.role == self.RoleChoices.STUDENT:
            if not self.nisn and self.username:
                self.nisn = self.username
            elif self.nisn and not self.username:
                self.username = self.nisn
        super().save(*args, **kwargs)


class SchoolSetting(models.Model):
    name = models.CharField(max_length=255, default="MIS RISALAH", verbose_name="Nama Sekolah / Madrasah")
    sub_header = models.CharField(
        max_length=255, 
        default="KEMENTERIAN AGAMA REPUBLIK INDONESIA", 
        blank=True, 
        verbose_name="Instansi / Sub Header Kop"
    )
    address = models.TextField(default="Jl. Raya Karangampel No. 45", blank=True, verbose_name="Alamat Sekolah")
    phone = models.CharField(max_length=50, default="(0234) 123456", blank=True, verbose_name="Nomor Telepon")
    email = models.EmailField(default="info@mis-risalah.sch.id", blank=True, verbose_name="Email Resmi")
    principal_name = models.CharField(max_length=255, default="H. Ahmad Syafi'i, M.Pd.I", verbose_name="Nama Kepala Sekolah")
    principal_nip = models.CharField(max_length=50, default="197508102003121002", blank=True, verbose_name="NIP Kepala Sekolah")
    city = models.CharField(max_length=100, default="Indramayu", verbose_name="Kota / Titimangsa")
    academic_year = models.CharField(max_length=20, default="2026/2027", verbose_name="Tahun Ajaran Aktif")
    logo_url = models.TextField(blank=True, null=True, verbose_name="URL Logo Sekolah")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'school_settings'
        verbose_name = 'Pengaturan Sekolah'
        verbose_name_plural = 'Pengaturan Sekolah'

    def __str__(self):
        return self.name

    @classmethod
    def get_settings(cls):
        obj = cls.objects.first()
        if not obj:
            obj = cls.objects.create(
                name="MIS RISALAH",
                sub_header="KEMENTERIAN AGAMA REPUBLIK INDONESIA",
                address="Jl. Raya Karangampel No. 45",
                phone="(0234) 123456",
                email="info@mis-risalah.sch.id",
                principal_name="H. Ahmad Syafi'i, M.Pd.I",
                principal_nip="197508102003121002",
                city="Indramayu",
                academic_year="2026/2027"
            )
        return obj

