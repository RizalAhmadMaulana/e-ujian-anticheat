from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.views.static import serve
from apps.exams.views import ServeExamImageStreamView

urlpatterns = [
    path('admin/', admin.site.urls),

    # Autentikasi JWT & Profil Pengguna
    path('api/auth/', include('apps.accounts.urls')),
    path('api/accounts/', include('apps.accounts.urls')),

    # Endpoint Khusus Streaming Media Gambar Anti-Nginx Cache/Interception
    path('api/exams/image-stream/', ServeExamImageStreamView.as_view(), name='root_api_serve_image_stream'),
    path('api/exams/image-stream/<path:filename>', ServeExamImageStreamView.as_view(), name='root_api_serve_image_stream_path'),
    path('exams/image-stream/', ServeExamImageStreamView.as_view(), name='root_serve_image_stream'),

    # Bank Soal, Sesi Ujian, & Gerbang Siswa
    path('api/exams/', include('apps.exams.urls')),

    # Live Proctoring Anti-Cheat (REST API Fallback & Monitoring)
    path('api/proctoring/', include('apps.proctoring.urls')),

    # E-Jurnal, Rekapitulasi, & Ekspor Dokumen Resmi
    path('api/ejournal/', include('apps.ejournal.urls')),

    # Media File Server (Dukungan penuh Production DEBUG=False & Proxy Nginx /api/ & /media/)
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    re_path(r'^api/media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    re_path(r'^api/exams/media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]
