from django.urls import path
from .views import (
    CustomLoginView, 
    CurrentUserView, 
    ClassRoomListCreateView,
    ClassRoomDetailView,
    UserListCreateView,
    UserDetailView,
    UserExcelTemplateView,
    UserExcelImportView,
    SchoolSettingView
)

urlpatterns = [
    # Auth endpoints
    path('login/', CustomLoginView.as_view(), name='auth_login'),
    path('me/', CurrentUserView.as_view(), name='auth_me'),

    # Pengaturan Sekolah Dinamis
    path('school-settings/', SchoolSettingView.as_view(), name='school_settings'),

    # CRUD Kelas / Rombel
    path('classrooms/', ClassRoomListCreateView.as_view(), name='classroom_list_create'),
    path('classrooms/<int:pk>/', ClassRoomDetailView.as_view(), name='classroom_detail'),

    # CRUD Manajemen Pengguna & Import Excel
    path('users/template-excel/', UserExcelTemplateView.as_view(), name='user_template_excel'),
    path('users/import-excel/', UserExcelImportView.as_view(), name='user_import_excel'),
    path('users/', UserListCreateView.as_view(), name='user_list_create'),
    path('users/<uuid:pk>/', UserDetailView.as_view(), name='user_detail'),
]
