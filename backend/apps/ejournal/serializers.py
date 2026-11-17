from rest_framework import serializers
from apps.ejournal.models import ExamJournal
from apps.exams.models import ExamSession
from apps.proctoring.models import StudentAttempt, ViolationLog
from apps.accounts.models import User

class ViolationLogItemSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='attempt.student.full_name', read_only=True)
    nisn = serializers.SerializerMethodField()
    classroom_id = serializers.SerializerMethodField()
    classroom = serializers.SerializerMethodField()
    classroom_name = serializers.SerializerMethodField()
    violation_type_label = serializers.CharField(source='get_violation_type_display', read_only=True)

    class Meta:
        model = ViolationLog
        fields = [
            'id',
            'student_name',
            'nisn',
            'classroom_id',
            'classroom',
            'classroom_name',
            'violation_type',
            'violation_type_label',
            'description',
            'detected_at',
            'unlocked_by_teacher_at'
        ]

    def get_nisn(self, obj):
        student = getattr(obj.attempt, 'student', None)
        return getattr(student, 'nisn', None) or getattr(student, 'username', '-')

    def get_classroom_id(self, obj):
        student = getattr(obj.attempt, 'student', None)
        return getattr(student, 'classroom_id', None)

    def get_classroom(self, obj):
        student = getattr(obj.attempt, 'student', None)
        if student and getattr(student, 'classroom', None):
            return student.classroom.name
        return '-'

    def get_classroom_name(self, obj):
        return self.get_classroom(obj)

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
    classroom_name = serializers.SerializerMethodField()
    academic_year = serializers.SerializerMethodField()
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
    total_students_scheduled = serializers.SerializerMethodField()
    total_students_present = serializers.SerializerMethodField()
    total_students_absent = serializers.SerializerMethodField()
    total_violations_recorded = serializers.SerializerMethodField()

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

    def _get_target_classroom(self, obj):
        target_classroom = self.context.get('target_classroom')
        if target_classroom:
            return target_classroom
        request = self.context.get('request')
        if request:
            classroom_param = request.query_params.get('classroom') or request.query_params.get('classroom_id')
            if classroom_param and str(classroom_param).strip().upper() != 'ALL':
                import re
                from apps.accounts.models import ClassRoom
                param_str = str(classroom_param).strip()
                if param_str.isdigit():
                    return ClassRoom.objects.filter(id=int(param_str)).first()
                clean_cls_name = re.sub(r'^(kelas|rombel)\s+', '', param_str.split('(')[0].strip(), flags=re.IGNORECASE)
                return (
                    ClassRoom.objects.filter(name__iexact=clean_cls_name).first() or 
                    ClassRoom.objects.filter(name__iexact=param_str).first() or
                    ClassRoom.objects.filter(name__icontains=clean_cls_name).first()
                )
        return None

    def get_classroom_name(self, obj):
        target_classroom = self._get_target_classroom(obj)
        if target_classroom:
            return target_classroom.name
        return obj.session.get_classrooms_display()

    def get_academic_year(self, obj):
        target_classroom = self._get_target_classroom(obj)
        if target_classroom and target_classroom.academic_year:
            return target_classroom.academic_year
        if obj.session.classroom and obj.session.classroom.academic_year:
            return obj.session.classroom.academic_year
        return "2026/2027"

    def _get_students_and_attempts(self, obj):
        session = obj.session
        target_classroom = self._get_target_classroom(obj)
        if target_classroom:
            all_students = User.objects.filter(role='STUDENT', classroom=target_classroom).select_related('classroom').order_by('full_name')
            attempts_qs = session.attempts.filter(student__classroom=target_classroom).select_related('student', 'student__classroom')
        else:
            if getattr(session, 'allow_all_classes', False):
                all_students = User.objects.filter(role='STUDENT').select_related('classroom').order_by('full_name')
            elif hasattr(session, 'classrooms') and session.classrooms.exists():
                all_students = User.objects.filter(role='STUDENT', classroom__in=session.classrooms.all()).distinct().select_related('classroom').order_by('full_name')
            elif session.classroom:
                all_students = User.objects.filter(role='STUDENT', classroom=session.classroom).select_related('classroom').order_by('full_name')
            else:
                all_students = User.objects.filter(role='STUDENT').select_related('classroom').order_by('full_name')
            attempts_qs = session.attempts.all().select_related('student', 'student__classroom')

        attempts_map = {att.student_id: att for att in attempts_qs}
        return list(all_students), attempts_map, attempts_qs

    def get_attendance_records(self, obj):
        all_students, attempts_map, _ = self._get_students_and_attempts(obj)
        target_classroom = self._get_target_classroom(obj)
        records = []
        for student in all_students:
            attempt = attempts_map.get(student.id)
            cls_name = student.classroom.name if getattr(student, 'classroom', None) else (target_classroom.name if target_classroom else obj.session.get_classrooms_display())
            cls_id = student.classroom.id if getattr(student, 'classroom', None) else (target_classroom.id if target_classroom else None)
            if attempt:
                records.append({
                    'attempt_id': attempt.id,
                    'student_id': student.id,
                    'nisn': student.nisn or student.username,
                    'student_name': student.full_name or student.username,
                    'classroom_id': cls_id,
                    'classroom': cls_name,
                    'classroom_name': cls_name,
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
                    'nisn': student.nisn or student.username,
                    'student_name': student.full_name or student.username,
                    'classroom_id': cls_id,
                    'classroom': cls_name,
                    'classroom_name': cls_name,
                    'status': 'ABSENT',
                    'status_label': 'Belum Masuk / Tidak Hadir',
                    'started_at': None,
                    'finished_at': None,
                    'violation_count': 0,
                    'device_orientation': None,
                    'total_score': None,
                })
        return records

    def get_total_students_scheduled(self, obj):
        all_students, _, _ = self._get_students_and_attempts(obj)
        return len(all_students)

    def get_total_students_present(self, obj):
        _, attempts_map, _ = self._get_students_and_attempts(obj)
        return len(attempts_map)

    def get_total_students_absent(self, obj):
        all_students, attempts_map, _ = self._get_students_and_attempts(obj)
        return max(0, len(all_students) - len(attempts_map))

    def get_total_violations_recorded(self, obj):
        target_classroom = self._get_target_classroom(obj)
        if target_classroom:
            return sum(att.violation_count for att in obj.session.attempts.filter(student__classroom=target_classroom))
        return sum(att.violation_count for att in obj.session.attempts.all())

    def get_violation_records(self, obj):
        target_classroom = self._get_target_classroom(obj)
        if target_classroom:
            violations = ViolationLog.objects.filter(
                attempt__session=obj.session,
                attempt__student__classroom=target_classroom
            ).select_related('attempt__student').order_by('-detected_at')
        else:
            violations = ViolationLog.objects.filter(
                attempt__session=obj.session
            ).select_related('attempt__student').order_by('-detected_at')
        return ViolationLogItemSerializer(violations, many=True).data

    def get_average_score(self, obj):
        target_classroom = self._get_target_classroom(obj)
        if target_classroom:
            attempts_with_score = obj.session.attempts.filter(student__classroom=target_classroom, total_score__isnull=False)
        else:
            attempts_with_score = obj.session.attempts.filter(total_score__isnull=False)

        if not attempts_with_score.exists():
            return 0.0
        scores = [float(att.total_score) for att in attempts_with_score]
        return round(sum(scores) / len(scores), 2)


class UpdateSupervisorNotesSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamJournal
        fields = ['supervisor_notes']
