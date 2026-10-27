from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, ClassRoom, SchoolSetting

class ClassRoomSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()

    class Meta:
        model = ClassRoom
        fields = ['id', 'name', 'academic_year', 'student_count', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_student_count(self, obj):
        return obj.students.count()


class UserSerializer(serializers.ModelSerializer):
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    classroom_id = serializers.IntegerField(source='classroom.id', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 
            'username', 
            'full_name', 
            'role', 
            'classroom_id',
            'classroom_name',
            'is_active',
            'is_staff',
            'date_joined'
        ]
        read_only_fields = ['id', 'date_joined']


class UserCreateUpdateSerializer(serializers.ModelSerializer):
    classroom_id = serializers.PrimaryKeyRelatedField(
        queryset=ClassRoom.objects.all(), 
        source='classroom', 
        required=False, 
        allow_null=True
    )
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'full_name',
            'role',
            'classroom_id',
            'password',
            'is_active'
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_password('123456') # default password jika tidak diisi
        if user.role == User.RoleChoices.TEACHER:
            user.is_staff = True
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        if instance.role == User.RoleChoices.TEACHER:
            instance.is_staff = True
        instance.save()
        return instance


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Serializer JWT Login yang mengembalikan token dan data detail pengguna
    """
    def validate(self, attrs):
        data = super().validate(attrs)
        
        # Sertakan payload user pada respons login
        data['user'] = {
            'id': str(self.user.id),
            'username': self.user.username,
            'full_name': self.user.full_name,
            'role': self.user.role,
            'classroom_id': self.user.classroom.id if self.user.classroom else None,
            'classroom_name': self.user.classroom.name if self.user.classroom else None,
        }
        return data


class SchoolSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolSetting
        fields = [
            'id',
            'name',
            'sub_header',
            'address',
            'phone',
            'email',
            'principal_name',
            'principal_nip',
            'city',
            'academic_year',
            'logo_url',
            'updated_at'
        ]
        read_only_fields = ['id', 'updated_at']
