from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, ClassRoom, SchoolSetting

@admin.register(SchoolSetting)
class SchoolSettingAdmin(admin.ModelAdmin):
    list_display = ('name', 'principal_name', 'city', 'academic_year', 'updated_at')
    fieldsets = (
        ('Identitas Utama Sekolah', {'fields': ('name', 'sub_header', 'logo_url')}),
        ('Kontak & Alamat', {'fields': ('address', 'phone', 'email', 'city')}),
        ('Administrasi & Kepala Sekolah', {'fields': ('principal_name', 'principal_nip', 'academic_year')}),
    )

@admin.register(ClassRoom)
class ClassRoomAdmin(admin.ModelAdmin):
    list_display = ('name', 'academic_year', 'student_count', 'created_at')
    search_fields = ('name', 'academic_year')
    list_filter = ('academic_year',)
    ordering = ('name',)

    def student_count(self, obj):
        return obj.students.count()
    student_count.short_description = "Jumlah Siswa"


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'full_name', 'role', 'classroom', 'is_active', 'is_staff')
    list_filter = ('role', 'is_active', 'classroom', 'is_staff')
    search_fields = ('username', 'full_name')
    ordering = ('role', 'username')

    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Informasi Pribadi', {'fields': ('full_name', 'role', 'classroom', 'first_name', 'last_name', 'email')}),
        ('Hak Akses & Izin', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Waktu Penting', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'full_name', 'role', 'classroom', 'password'),
        }),
    )

