from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

    # Autentikasi JWT & Profil Pengguna
    path('api/auth/', include('apps.accounts.urls')),
    path('api/accounts/', include('apps.accounts.urls')),

    # Bank Soal, Sesi Ujian, & Gerbang Siswa
    path('api/exams/', include('apps.exams.urls')),

    # Live Proctoring Anti-Cheat (REST API Fallback & Monitoring)
    path('api/proctoring/', include('apps.proctoring.urls')),

    # E-Jurnal, Rekapitulasi, & Ekspor Dokumen Resmi
    path('api/ejournal/', include('apps.ejournal.urls')),
]
