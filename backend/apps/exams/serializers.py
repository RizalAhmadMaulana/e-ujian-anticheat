from rest_framework import serializers
from apps.accounts.models import ClassRoom
from .models import ExamPackage, Question, QuestionOption, ExamSession
from .services import sanitize_and_format_embed_url
from .tokens import get_session_tokens

class QuestionOptionSerializer(serializers.ModelSerializer):
    image_url = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    option_text = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = QuestionOption
        fields = ['id', 'option_label', 'option_text', 'image_url', 'is_correct']
        extra_kwargs = {
            'option_text': {'required': False, 'allow_blank': True}
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        raw_text = instance.option_text or ''
        if raw_text.startswith('[IMAGE:'):
            end_idx = raw_text.find(']')
            if end_idx != -1:
                data['image_url'] = raw_text[7:end_idx].strip()
                data['option_text'] = raw_text[end_idx + 1:].strip()
            else:
                data['image_url'] = None
        else:
            data['image_url'] = None

        # Sediakan kompatibilitas camelCase untuk UI Frontend
        data['imageUrl'] = data['image_url']
        data['optionText'] = data['option_text']
        data['optionLabel'] = instance.option_label

        request = self.context.get('request')

        # SENSOR KEAMANAN KUNCI JAWABAN:
        # Jika diakses oleh akun SISWA (Role STUDENT), buang field is_correct secara mutlak!
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            if getattr(request.user, 'role', None) == 'STUDENT':
                data.pop('is_correct', None)
            else:
                data['isCorrect'] = instance.is_correct
        else:
            data['isCorrect'] = instance.is_correct
        return data


class QuestionSerializer(serializers.ModelSerializer):
    options = QuestionOptionSerializer(many=True, required=False)
    text = serializers.CharField(source='question_text', required=False, allow_blank=True)
    order = serializers.IntegerField(source='order_number', required=False)
    imageUrl = serializers.CharField(source='image_url', required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Question
        fields = [
            'id', 
            'question_text', 
            'text',
            'image_url', 
            'imageUrl',
            'question_type', 
            'points', 
            'order_number', 
            'order',
            'extra_data',
            'options'
        ]
        extra_kwargs = {
            'question_text': {'required': False, 'allow_blank': True},
            'order_number': {'required': False},
        }

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Sediakan kompatibilitas camelCase untuk UI Frontend
        data['questionText'] = instance.question_text
        data['text'] = instance.question_text
        data['imageUrl'] = instance.image_url
        data['questionType'] = instance.question_type
        data['orderNumber'] = instance.order_number
        data['extraData'] = instance.extra_data or {}

        request = self.context.get('request')
        is_student = False
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            if getattr(request.user, 'role', None) == 'STUDENT':
                is_student = True

        if is_student and isinstance(data.get('extra_data'), dict):
            clean_extra = dict(data['extra_data'])
            clean_extra.pop('exact_keys', None)
            clean_extra.pop('accepted_answers', None)
            clean_extra.pop('keys', None)
            if 'rows' in clean_extra and isinstance(clean_extra['rows'], list):
                sanitized_rows = []
                for r in clean_extra['rows']:
                    if isinstance(r, dict):
                        row_copy = dict(r)
                        row_copy.pop('correct', None)
                        row_copy.pop('is_correct', None)
                        sanitized_rows.append(row_copy)
                    else:
                        sanitized_rows.append(r)
                clean_extra['rows'] = sanitized_rows
            data['extra_data'] = clean_extra
            data['extraData'] = clean_extra

        return data


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
                q_text = q_data.get('question_text') or q_data.get('text', '')
                q_img = q_data.get('image_url') or q_data.get('imageUrl') or None
                q_order = q_data.get('order_number') or q_data.get('order', q_idx + 1)
                q_type = q_data.get('question_type', Question.QuestionTypeChoices.MULTIPLE_CHOICE)
                q_pts = q_data.get('points', 10)
                q_extra = q_data.get('extra_data', {})

                question = Question.objects.create(
                    package=package,
                    question_text=q_text,
                    image_url=q_img,
                    question_type=q_type,
                    points=q_pts,
                    order_number=q_order,
                    extra_data=q_extra
                )

                for opt_data in options_data:
                    opt_img = opt_data.pop('image_url', None) or opt_data.pop('imageUrl', None)
                    raw_text = opt_data.get('option_text', '') or opt_data.get('text', '')
                    if raw_text.startswith('[IMAGE:'):
                        end_idx = raw_text.find(']')
                        if end_idx != -1:
                            if not opt_img:
                                opt_img = raw_text[7:end_idx].strip()
                            raw_text = raw_text[end_idx + 1:].strip()
                    if opt_img:
                        opt_data['option_text'] = f"[IMAGE:{opt_img}] {raw_text}".strip()
                    else:
                        opt_data['option_text'] = raw_text
                    opt_data.pop('text', None)
                    opt_data.pop('imageUrl', None)
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
                q_text = q_data.get('question_text') or q_data.get('text', '')
                q_img = q_data.get('image_url') or q_data.get('imageUrl') or None
                q_order = q_data.get('order_number') or q_data.get('order', q_idx + 1)
                q_type = q_data.get('question_type', Question.QuestionTypeChoices.MULTIPLE_CHOICE)
                q_pts = q_data.get('points', 10)
                q_extra = q_data.get('extra_data', {})

                question = Question.objects.create(
                    package=instance,
                    question_text=q_text,
                    image_url=q_img,
                    question_type=q_type,
                    points=q_pts,
                    order_number=q_order,
                    extra_data=q_extra
                )

                for opt_data in options_data:
                    opt_img = opt_data.pop('image_url', None) or opt_data.pop('imageUrl', None)
                    raw_text = opt_data.get('option_text', '') or opt_data.get('text', '')
                    if raw_text.startswith('[IMAGE:'):
                        end_idx = raw_text.find(']')
                        if end_idx != -1:
                            if not opt_img:
                                opt_img = raw_text[7:end_idx].strip()
                            raw_text = raw_text[end_idx + 1:].strip()
                    if opt_img:
                        opt_data['option_text'] = f"[IMAGE:{opt_img}] {raw_text}".strip()
                    else:
                        opt_data['option_text'] = raw_text
                    opt_data.pop('text', None)
                    opt_data.pop('imageUrl', None)
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
    classrooms = serializers.PrimaryKeyRelatedField(
        many=True, 
        queryset=ClassRoom.objects.all(), 
        required=False
    )
    classroom_ids = serializers.ListField(
        child=serializers.CharField(), 
        required=False, 
        write_only=True
    )
    allow_all_classes = serializers.BooleanField(required=False, default=False)
    exit_password = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = ExamSession
        fields = [
            'id',
            'package',
            'package_title',
            'subject_name',
            'exam_type',
            'classroom',
            'classrooms',
            'classroom_ids',
            'classroom_name',
            'allow_all_classes',
            'start_time',
            'end_time',
            'duration_minutes',
            'entry_password',
            'exit_password',
            'supervisor_pin',
            'strict_lockdown',
            'shuffle_questions',
            'shuffle_options',
            'is_active',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'classroom': {'required': False, 'allow_null': True},
            'exit_password': {'required': False, 'allow_blank': True}
        }

    def create(self, validated_data):
        classrooms_data = validated_data.pop('classrooms', None)
        classroom_ids = validated_data.pop('classroom_ids', None)
        allow_all = validated_data.get('allow_all_classes', False)

        instance = super().create(validated_data)

        if allow_all:
            instance.allow_all_classes = True
            instance.classrooms.clear()
            instance.classroom = None
            instance.save(update_fields=['allow_all_classes', 'classroom'])
        else:
            target_classrooms = []
            if classroom_ids:
                target_classrooms = list(ClassRoom.objects.filter(id__in=[str(x) for x in classroom_ids if x is not None]))
            elif classrooms_data:
                target_classrooms = list(classrooms_data)
            
            if target_classrooms:
                instance.classrooms.set(target_classrooms)
                if not instance.classroom:
                    instance.classroom = target_classrooms[0]
                    instance.save(update_fields=['classroom'])
            elif instance.classroom:
                instance.classrooms.set([instance.classroom])

        return instance

    def update(self, instance, validated_data):
        classrooms_data = validated_data.pop('classrooms', None)
        classroom_ids = validated_data.pop('classroom_ids', None)
        allow_all = validated_data.get('allow_all_classes', None)

        instance = super().update(instance, validated_data)

        if allow_all is True:
            instance.allow_all_classes = True
            instance.classrooms.clear()
            instance.classroom = None
            instance.save(update_fields=['allow_all_classes', 'classroom'])
        elif allow_all is False or classrooms_data is not None or classroom_ids is not None:
            if allow_all is not None:
                instance.allow_all_classes = allow_all
            target_classrooms = []
            if classroom_ids is not None:
                target_classrooms = list(ClassRoom.objects.filter(id__in=[str(x) for x in classroom_ids if x is not None]))
            elif classrooms_data is not None:
                target_classrooms = list(classrooms_data)

            if target_classrooms:
                instance.classrooms.set(target_classrooms)
                instance.classroom = target_classrooms[0]
            elif allow_all is False and instance.classroom:
                instance.classrooms.set([instance.classroom])
            instance.save()

        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        classroom_disp = instance.get_classrooms_display()

        # Sediakan kompatibilitas atribut camelCase untuk UI Frontend
        data['title'] = instance.package.title if instance.package else "Sesi Ujian"
        data['subjectName'] = instance.package.subject_name if instance.package else ""
        data['examType'] = instance.package.exam_type if instance.package else "NATIVE_QUESTIONS"
        data['classroom'] = classroom_disp
        data['classroom_name'] = classroom_disp
        data['classroom_display'] = classroom_disp
        data['durationMinutes'] = instance.duration_minutes

        data['allow_all_classes'] = instance.allow_all_classes
        data['allowAllClasses'] = instance.allow_all_classes
        
        active_classrooms = list(instance.classrooms.all())
        if not active_classrooms and not instance.allow_all_classes and instance.classroom:
            active_classrooms = [instance.classroom]

        data['classrooms'] = [{'id': c.id, 'name': c.name} for c in active_classrooms]
        data['classroom_ids'] = [c.id for c in active_classrooms]
        data['classroomIds'] = [c.id for c in active_classrooms]

        # Regenerasi Otomatis Token Masuk & PIN Pengawas setiap 10 menit
        tokens = get_session_tokens(instance.id)
        data['entry_password'] = tokens['entry_token']
        data['entryPassword'] = tokens['entry_token']
        data['supervisor_pin'] = tokens['pin_token']
        data['supervisorPin'] = tokens['pin_token']
        data['token_expires_in_seconds'] = tokens['expires_in_seconds']
        data['tokenExpiresIn'] = tokens['expires_in_seconds']
        data['token_rotation_interval'] = tokens['rotation_interval']
        data['base_entry_password'] = instance.entry_password
        data['base_supervisor_pin'] = instance.supervisor_pin

        data['exitPassword'] = instance.exit_password
        data['strictLockdown'] = instance.strict_lockdown
        data['shuffleQuestions'] = instance.shuffle_questions
        data['shuffleOptions'] = instance.shuffle_options
        data['isActive'] = instance.is_active
        data['startTime'] = instance.start_time.isoformat() if instance.start_time else None
        data['endTime'] = instance.end_time.isoformat() if instance.end_time else None
        data['packageId'] = str(instance.package_id) if instance.package_id else None
        data['classroomId'] = str(instance.classroom_id) if instance.classroom_id else None
        data['createdAt'] = instance.created_at.isoformat() if instance.created_at else None

        # Sisipkan data attempt siswa jika request berasal dari role Siswa (Single Attempt & Status Remidi)
        request = self.context.get('request')
        if request and request.user.is_authenticated and getattr(request.user, 'role', None) == 'STUDENT':
            from apps.proctoring.models import StudentAttempt
            attempt = StudentAttempt.objects.filter(session=instance, student=request.user).first()
            if attempt:
                ans = attempt.answers_json or {}
                is_rem = bool(isinstance(ans, dict) and ans.get('_remedial_allowed'))
                prev_sc = ans.get('_previous_score') if isinstance(ans, dict) else None

                # SELF-HEALING:
                # Jika attempt memiliki finished_at (sudah selesai dikerjakan) dan BUKAN remidi aktif,
                # maka status attempt mutlak HARUS SUBMITTED!
                resolved_status = attempt.status
                if attempt.finished_at is not None and not is_rem:
                    resolved_status = StudentAttempt.AttemptStatus.SUBMITTED
                    if attempt.status != StudentAttempt.AttemptStatus.SUBMITTED:
                        attempt.status = StudentAttempt.AttemptStatus.SUBMITTED
                        attempt.save(update_fields=['status'])

                data['my_attempt'] = {
                    'id': str(attempt.id),
                    'status': resolved_status,
                    'total_score': float(attempt.total_score) if attempt.total_score is not None else None,
                    'is_remedial_allowed': is_rem,
                    'previous_score': float(prev_sc) if prev_sc is not None else None,
                    'finished_at': attempt.finished_at.isoformat() if attempt.finished_at else None,
                }
            else:
                data['my_attempt'] = None

        return data

