from django.contrib import admin
from .models import ExamJournal

@admin.register(ExamJournal)
class ExamJournalAdmin(admin.ModelAdmin):
    list_display = (
        'session_info', 
        'teacher_name', 
        'total_students_scheduled', 
        'total_students_present', 
        'total_students_absent', 
        'total_violations_recorded', 
        'generated_at'
    )
    list_filter = ('session__classroom', 'generated_at')
    search_fields = ('session__package__title', 'session__classroom__name', 'teacher__full_name')
    readonly_fields = ('generated_at',)

    def session_info(self, obj):
        return f"{obj.session.classroom.name} — {obj.session.package.subject_name}"
    session_info.short_description = "Sesi & Mapel"

    def teacher_name(self, obj):
        return obj.teacher.full_name
    teacher_name.short_description = "Guru Pengawas"

