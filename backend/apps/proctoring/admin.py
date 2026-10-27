from django.contrib import admin
from .models import StudentAttempt, ViolationLog

class ViolationLogInline(admin.TabularInline):
    model = ViolationLog
    extra = 0
    readonly_fields = ('violation_type', 'description', 'detected_at', 'unlocked_by_teacher_at')
    can_delete = False


@admin.register(StudentAttempt)
class StudentAttemptAdmin(admin.ModelAdmin):
    list_display = (
        'student_name', 
        'session_title', 
        'status', 
        'screen_orientation', 
        'violation_count', 
        'total_score', 
        'started_at', 
        'finished_at'
    )
    list_filter = ('status', 'screen_orientation', 'session__classroom')
    search_fields = ('student__full_name', 'student__username', 'session__package__title')
    ordering = ('-started_at',)
    inlines = [ViolationLogInline]

    def student_name(self, obj):
        return f"{obj.student.full_name} ({obj.student.username})"
    student_name.short_description = "Peserta Siswa"

    def session_title(self, obj):
        return f"{obj.session.package.title} [{obj.session.classroom.name}]"
    session_title.short_description = "Sesi Ujian"


@admin.register(ViolationLog)
class ViolationLogAdmin(admin.ModelAdmin):
    list_display = ('attempt_student', 'violation_type', 'description', 'detected_at', 'unlocked_by_teacher_at')
    list_filter = ('violation_type', 'detected_at')
    search_fields = ('attempt__student__full_name', 'attempt__student__username', 'description')
    ordering = ('-detected_at',)

    def attempt_student(self, obj):
        return f"{obj.attempt.student.full_name} ({obj.attempt.student.username})"
    attempt_student.short_description = "Siswa"

