from rest_framework import serializers
from .models import ExamPackage, Question, QuestionOption, ExamSession
from .services import sanitize_and_format_embed_url

class QuestionOptionSerializer(serializers.ModelSerializer):
    image_url = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = QuestionOption
        fields = ['id', 'option_label', 'option_text', 'image_url', 'is_correct']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        raw_text = instance.option_text or ''
        if raw_text.startswith('[IMAGE:'):
            end_idx = raw_text.find(']')
            if end_idx != -1:
                data['image_url'] = raw_text[7:end_idx]
                data['option_text'] = raw_text[end_idx + 1:]
            else:
                data['image_url'] = None
        else:
            data['image_url'] = None

        request = self.context.get('request')

        # SENSOR KEAMANAN KUNCI JAWABAN:
        # Jika diakses oleh akun SISWA (Role STUDENT), buang field is_correct secara mutlak!
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            if getattr(request.user, 'role', None) == 'STUDENT':
                data.pop('is_correct', None)
        return data


class QuestionSerializer(serializers.ModelSerializer):
    options = QuestionOptionSerializer(many=True, required=False)

    class Meta:
        model = Question
        fields = [
            'id', 
            'question_text', 
            'image_url', 
            'question_type', 
            'points', 
            'order_number', 
            'options'
        ]


class ExamPackageSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, required=False)
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)

    class Meta:
        model = ExamPackage
        fields = [
            'id', 
            'title', 
            'subject_name', 
            'exam_type', 
            'external_url', 
            'created_at', 
            'teacher_name',
            'questions'
        ]
        read_only_fields = ['id', 'created_at', 'teacher_name']

    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        request = self.context.get('request')

        # Tetapkan guru pembuat dari request.user
        if request and request.user.is_authenticated:
            validated_data['teacher'] = request.user

        # Format URL jika bertipe EXTERNAL_LINK
        if validated_data.get('exam_type') == ExamPackage.ExamTypeChoices.EXTERNAL_LINK:
            raw_url = validated_data.get('external_url', '')
            validated_data['external_url'] = sanitize_and_format_embed_url(raw_url)

        package = ExamPackage.objects.create(**validated_data)

        # Buat butir pertanyaan & opsi bersarang jika NATIVE_QUESTIONS
        if package.exam_type == ExamPackage.ExamTypeChoices.NATIVE_QUESTIONS:
            for q_idx, q_data in enumerate(questions_data):
                options_data = q_data.pop('options', [])
                q_data['order_number'] = q_data.get('order_number', q_idx + 1)
                question = Question.objects.create(package=package, **q_data)

                for opt_data in options_data:
                    opt_img = opt_data.pop('image_url', None) or opt_data.pop('imageUrl', None)
                    raw_text = opt_data.get('option_text', '')
                    if opt_img:
                        opt_data['option_text'] = f"[IMAGE:{opt_img}]{raw_text}"
                    QuestionOption.objects.create(question=question, **opt_data)

        return package

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', None)
        if validated_data.get('exam_type') == ExamPackage.ExamTypeChoices.EXTERNAL_LINK:
            raw_url = validated_data.get('external_url', '')
            validated_data['external_url'] = sanitize_and_format_embed_url(raw_url)

        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()

        # Update questions jika ada perubahan pada NATIVE_QUESTIONS
        if questions_data is not None and instance.exam_type == ExamPackage.ExamTypeChoices.NATIVE_QUESTIONS:
            instance.questions.all().delete()
            for q_idx, q_data in enumerate(questions_data):
                options_data = q_data.pop('options', [])
                q_data['order_number'] = q_data.get('order_number', q_idx + 1)
                question = Question.objects.create(package=instance, **q_data)

                for opt_data in options_data:
                    opt_img = opt_data.pop('image_url', None) or opt_data.pop('imageUrl', None)
                    raw_text = opt_data.get('option_text', '')
                    if opt_img:
                        opt_data['option_text'] = f"[IMAGE:{opt_img}]{raw_text}"
                    QuestionOption.objects.create(question=question, **opt_data)

        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Sediakan kompatibilitas camelCase untuk UI Frontend
        data['subjectName'] = instance.subject_name
        data['examType'] = instance.exam_type
        data['externalUrl'] = instance.external_url
        data['createdAt'] = instance.created_at.isoformat() if instance.created_at else None
        return data


class ExamSessionSerializer(serializers.ModelSerializer):
    package_title = serializers.CharField(source='package.title', read_only=True)
    subject_name = serializers.CharField(source='package.subject_name', read_only=True)
    exam_type = serializers.CharField(source='package.exam_type', read_only=True)
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)

    class Meta:
        model = ExamSession
        fields = [
            'id',
            'package',
            'package_title',
            'subject_name',
            'exam_type',
            'classroom',
            'classroom_name',
            'start_time',
            'end_time',
            'duration_minutes',
            'entry_password',
            'exit_password',
            'supervisor_pin',
            'strict_lockdown',
            'is_active',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Sediakan kompatibilitas atribut camelCase untuk UI Frontend
        data['title'] = instance.package.title if instance.package else "Sesi Ujian"
        data['subjectName'] = instance.package.subject_name if instance.package else ""
        data['examType'] = instance.package.exam_type if instance.package else "NATIVE_QUESTIONS"
        data['classroom'] = instance.classroom.name if instance.classroom else "Semua Kelas"
        data['durationMinutes'] = instance.duration_minutes
        data['entryPassword'] = instance.entry_password
        data['exitPassword'] = instance.exit_password
        data['supervisorPin'] = instance.supervisor_pin or 'PIN-1234'
        data['strictLockdown'] = instance.strict_lockdown
        data['isActive'] = instance.is_active
        data['startTime'] = instance.start_time.isoformat() if instance.start_time else None
        data['endTime'] = instance.end_time.isoformat() if instance.end_time else None
        data['packageId'] = str(instance.package_id) if instance.package_id else None
        data['classroomId'] = str(instance.classroom_id) if instance.classroom_id else None
        data['createdAt'] = instance.created_at.isoformat() if instance.created_at else None
        return data

