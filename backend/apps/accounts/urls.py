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
    StudentListCreateView,
    StudentDetailView,
    StudentExcelTemplateView,
    StudentExcelImportView,
    TeacherListCreateView,
    TeacherDetailView,
    TeacherExcelTemplateView,
    TeacherExcelImportView,
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

    # CRUD Data Siswa & Import Excel
    path('students/template-excel/', StudentExcelTemplateView.as_view(), name='student_template_excel'),
    path('students/import-excel/', StudentExcelImportView.as_view(), name='student_import_excel'),
    path('students/', StudentListCreateView.as_view(), name='student_list_create'),
    path('students/<uuid:pk>/', StudentDetailView.as_view(), name='student_detail'),

    # CRUD Data Guru & Import Excel
    path('teachers/template-excel/', TeacherExcelTemplateView.as_view(), name='teacher_template_excel'),
    path('teachers/import-excel/', TeacherExcelImportView.as_view(), name='teacher_import_excel'),
    path('teachers/', TeacherListCreateView.as_view(), name='teacher_list_create'),
    path('teachers/<uuid:pk>/', TeacherDetailView.as_view(), name='teacher_detail'),

    # CRUD Manajemen Pengguna & Import Excel
    path('users/template-excel/', UserExcelTemplateView.as_view(), name='user_template_excel'),
    path('users/import-excel/', UserExcelImportView.as_view(), name='user_import_excel'),
    path('users/', UserListCreateView.as_view(), name='user_list_create'),
    path('users/<uuid:pk>/', UserDetailView.as_view(), name='user_detail'),
]
