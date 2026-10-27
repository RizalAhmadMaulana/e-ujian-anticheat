from django.contrib import admin
from .models import ExamPackage, Question, QuestionOption, ExamSession

class QuestionOptionInline(admin.TabularInline):
    model = QuestionOption
    extra = 4
    fields = ('option_label', 'option_text', 'is_correct')


@admin.register(ExamPackage)
class ExamPackageAdmin(admin.ModelAdmin):
    list_display = ('title', 'subject_name', 'exam_type', 'teacher', 'question_count', 'created_at')
    list_filter = ('exam_type', 'subject_name', 'created_at')
    search_fields = ('title', 'subject_name', 'teacher__full_name')
    ordering = ('-created_at',)

    def question_count(self, obj):
        return obj.questions.count()
    question_count.short_description = "Jml Soal"


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'package', 'question_type', 'points', 'question_preview')
    list_filter = ('package', 'question_type')
    search_fields = ('question_text', 'package__title')
    ordering = ('package', 'order_number')
    inlines = [QuestionOptionInline]

    def question_preview(self, obj):
        return obj.question_text[:50] + ("..." if len(obj.question_text) > 50 else "")
    question_preview.short_description = "Teks Soal"


@admin.register(QuestionOption)
class QuestionOptionAdmin(admin.ModelAdmin):
    list_display = ('question', 'option_label', 'option_text', 'is_correct')
    list_filter = ('is_correct',)
    search_fields = ('option_text', 'question__question_text')


@admin.register(ExamSession)
class ExamSessionAdmin(admin.ModelAdmin):
    list_display = (
        'package_title', 
        'classroom_name', 
        'duration_minutes', 
        'entry_password', 
        'exit_password', 
        'is_active', 
        'start_time'
    )
    list_filter = ('is_active', 'classroom', 'package__subject_name')
    search_fields = ('package__title', 'classroom__name', 'entry_password', 'exit_password')
    ordering = ('-created_at',)

    def package_title(self, obj):
        return obj.package.title
    package_title.short_description = "Paket Ujian"

    def classroom_name(self, obj):
        return obj.classroom.name
    classroom_name.short_description = "Kelas"

