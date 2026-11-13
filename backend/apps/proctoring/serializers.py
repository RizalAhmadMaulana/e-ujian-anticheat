from rest_framework import serializers
from .models import StudentAttempt, ViolationLog

class ViolationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ViolationLog
        fields = [
            'id', 
            'violation_type', 
            'description', 
            'detected_at', 
            'unlocked_by_teacher_at'
        ]


class ViolationHistorySerializer(serializers.ModelSerializer):
    attempt_id = serializers.UUIDField(source='attempt.id', read_only=True)
    student_id = serializers.UUIDField(source='attempt.student.id', read_only=True)
    student_name = serializers.CharField(source='attempt.student.full_name', read_only=True)
    nisn = serializers.CharField(source='attempt.student.username', read_only=True)
    classroom_name = serializers.CharField(source='attempt.session.classroom.name', read_only=True)
    subject_name = serializers.CharField(source='attempt.session.package.subject_name', read_only=True)
    session_title = serializers.CharField(source='attempt.session.title', read_only=True)
    session_id = serializers.UUIDField(source='attempt.session.id', read_only=True)
    violation_type_label = serializers.CharField(source='get_violation_type_display', read_only=True)

    class Meta:
        model = ViolationLog
        fields = [
            'id',
            'attempt_id',
            'student_id',
            'session_id',
            'student_name',
            'nisn',
            'classroom_name',
            'subject_name',
            'session_title',
            'violation_type',
            'violation_type_label',
            'description',
            'detected_at',
            'unlocked_by_teacher_at'
        ]


class StudentAttemptDetailSerializer(serializers.ModelSerializer):
    student_id = serializers.UUIDField(source='student.id', read_only=True)
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    nisn = serializers.CharField(source='student.username', read_only=True)
    classroom = serializers.CharField(source='session.classroom.name', read_only=True)
    last_violation = serializers.SerializerMethodField()

    class Meta:
        model = StudentAttempt
        fields = [
            'id',
            'student_id',
            'student_name',
            'nisn',
            'classroom',
            'status',
            'screen_orientation',
            'violation_count',
            'total_score',
            'network_latency_ms',
            'started_at',
            'finished_at',
            'last_violation'
        ]

    def get_last_violation(self, obj):
        last_log = obj.violations.first()
        if last_log:
            return {
                "type": last_log.violation_type,
                "description": last_log.description,
                "time": last_log.detected_at.strftime("%H:%M:%S")
            }
        return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Kompatibilitas camelCase untuk UI Live Proctoring & Dashboard
        data['studentId'] = str(instance.student.id)
        data['fullName'] = instance.student.full_name
        data['screenOrientation'] = instance.screen_orientation
        data['violationCount'] = instance.violation_count
        data['networkLatencyMs'] = instance.network_latency_ms
        data['network_latency_ms'] = instance.network_latency_ms
        data['startedAt'] = instance.started_at.strftime("%H:%M:%S") if instance.started_at else None
        data['finishedAt'] = instance.finished_at.strftime("%H:%M:%S") if instance.finished_at else None
        data['score'] = float(instance.total_score) if instance.total_score is not None else None
        return data

