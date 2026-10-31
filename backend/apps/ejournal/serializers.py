from rest_framework import serializers
from apps.ejournal.models import ExamJournal
from apps.exams.models import ExamSession
from apps.proctoring.models import StudentAttempt, ViolationLog
from apps.accounts.models import User

class ViolationLogItemSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='attempt.student.full_name', read_only=True)
    nisn = serializers.CharField(source='attempt.student.username', read_only=True)
    violation_type_label = serializers.CharField(source='get_violation_type_display', read_only=True)

    class Meta:
        model = ViolationLog
        fields = [
            'id',
            'student_name',
            'nisn',
            'violation_type',
            'violation_type_label',
            'description',
            'detected_at',
            'unlocked_by_teacher_at'
        ]

class StudentAttendanceItemSerializer(serializers.Serializer):
    attempt_id = serializers.UUIDField(allow_null=True)
    student_id = serializers.UUIDField()
    nisn = serializers.CharField()
    student_name = serializers.CharField()
    classroom_name = serializers.CharField()
    status = serializers.CharField()
    status_label = serializers.CharField()
    started_at = serializers.DateTimeField(allow_null=True)
    finished_at = serializers.DateTimeField(allow_null=True)
    violation_count = serializers.IntegerField()
    device_orientation = serializers.CharField(allow_null=True)
    total_score = serializers.FloatField(allow_null=True)

class ExamJournalDetailSerializer(serializers.ModelSerializer):
    session_id = serializers.UUIDField(source='session.id', read_only=True)
    subject_name = serializers.CharField(source='session.package.subject_name', read_only=True)
    title = serializers.CharField(source='session.package.title', read_only=True)
    classroom_name = serializers.CharField(source='session.classroom.name', read_only=True)
    academic_year = serializers.CharField(source='session.classroom.academic_year', read_only=True)
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    start_time = serializers.DateTimeField(source='session.start_time', read_only=True)
    end_time = serializers.DateTimeField(source='session.end_time', read_only=True)
    duration_minutes = serializers.IntegerField(source='session.duration_minutes', read_only=True)
    token = serializers.CharField(source='session.token', read_only=True)
    exam_type = serializers.CharField(source='session.package.exam_type', read_only=True)

    # Dynamic Aggregated lists
    attendance_records = serializers.SerializerMethodField()
    violation_records = serializers.SerializerMethodField()
    average_score = serializers.SerializerMethodField()

    class Meta:
        model = ExamJournal
        fields = [
            'id',
            'session_id',
            'subject_name',
            'title',
            'classroom_name',
            'academic_year',
            'teacher_name',
            'start_time',
            'end_time',
            'duration_minutes',
            'token',
            'exam_type',
            'total_students_scheduled',
            'total_students_present',
            'total_students_absent',
            'total_violations_recorded',
            'average_score',
            'supervisor_notes',
            'generated_at',
            'attendance_records',
            'violation_records'
        ]
        read_only_fields = [
            'id', 'total_students_scheduled', 'total_students_present', 
            'total_students_absent', 'total_violations_recorded', 'generated_at'
        ]

    def get_attendance_records(self, obj):
        session = obj.session
        classroom = session.classroom
        all_students = User.objects.filter(role='STUDENT', classroom=classroom).order_by('full_name')
        attempts_map = {att.student_id: att for att in session.attempts.all().select_related('student')}

        records = []
        for student in all_students:
            attempt = attempts_map.get(student.id)
            if attempt:
                records.append({
                    'attempt_id': attempt.id,
                    'student_id': student.id,
                    'nisn': student.username,
                    'student_name': student.full_name,
                    'classroom_name': classroom.name,
                    'status': attempt.status,
                    'status_label': attempt.get_status_display(),
                    'started_at': attempt.started_at,
                    'finished_at': attempt.finished_at,
                    'violation_count': attempt.violation_count,
                    'device_orientation': attempt.screen_orientation,
                    'total_score': float(attempt.total_score) if attempt.total_score is not None else None,
                })
            else:
                records.append({
                    'attempt_id': None,
                    'student_id': student.id,
                    'nisn': student.username,
                    'student_name': student.full_name,
                    'classroom_name': classroom.name,
                    'status': 'ABSENT',
                    'status_label': 'Belum Masuk / Tidak Hadir',
                    'started_at': None,
                    'finished_at': None,
                    'violation_count': 0,
                    'device_orientation': None,
                    'total_score': None,
                })
        return records

    def get_violation_records(self, obj):
        violations = ViolationLog.objects.filter(
            attempt__session=obj.session
        ).select_related('attempt__student').order_by('-detected_at')
        return ViolationLogItemSerializer(violations, many=True).data

    def get_average_score(self, obj):
        attempts_with_score = obj.session.attempts.filter(total_score__isnull=False)
        if not attempts_with_score.exists():
            return 0.0
        scores = [att.total_score for att in attempts_with_score]
        return round(sum(scores) / len(scores), 2)


class UpdateSupervisorNotesSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamJournal
        fields = ['supervisor_notes']
